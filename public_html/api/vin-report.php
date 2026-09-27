<?php
/**
 * WheelClarify - VIN Search & PDF Report Protection Gate
 * File: public_html/api/vin-report.php
 *
 * Verifies the active WheelClarify subscription license before running
 * NHTSA/NMVTIS database lookups or rendering PDF reports.
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/../license-validator.php';

// 1. Handle CORS Preflight (OPTIONS) cleanly
wc_handle_cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed. Use POST or GET.'
    ]);
    exit();
}

// 2. Parse request payload
$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_REQUEST;
}

// 3. Retrieve the active license key (from config, header, or request body)
$providedKey = trim((string)($payload['license_key'] ?? ($_SERVER['HTTP_X_LICENSE_KEY'] ?? '')));
$activeKey   = $providedKey !== '' ? $providedKey : wc_get_saved_license_key();

// 4. Verify license & vin_reports feature authorization
$licenseStatus = check_wheelclarify_license($activeKey);

$isValid          = !empty($licenseStatus['valid']);
$vinReportAllowed = !empty($licenseStatus['features']['vin_reports']);

if (!$isValid || !$vinReportAllowed) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'VIN Report feature is locked. Active subscription required.',
        'license' => [
            'valid'    => $isValid,
            'features' => $licenseStatus['features'] ?? [
                'vin_reports'     => false,
                'payment_gateway' => false,
            ],
            'reason'   => $licenseStatus['error'] ?? 'License inactive or missing.'
        ]
    ]);
    exit();
}

// 5. License is valid and VIN Report service is authorized — proceed with lookup / PDF generation
$vin    = strtoupper(trim((string)($payload['vin'] ?? '')));
$action = strtolower(trim((string)($payload['action'] ?? 'lookup')));

if ($vin !== '' && strlen($vin) === 17) {
    // Perform live NHTSA vPIC lookup if cURL is available
    $nhtsaData = null;
    if (function_exists('curl_init')) {
        $nhtsaUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/' . urlencode($vin) . '?format=json';
        $ch = curl_init($nhtsaUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($resp !== false && $code === 200) {
            $decoded = json_decode($resp, true);
            if (!empty($decoded['Results'][0])) {
                $nhtsaData = $decoded['Results'][0];
            }
        }
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'action'  => $action,
        'vin'     => $vin,
        'message' => 'VIN Report & PDF service authorized.',
        'license' => [
            'valid'      => true,
            'status'     => $licenseStatus['status'] ?? 'Active',
            'expires_at' => $licenseStatus['expires_at'] ?? null,
            'features'   => $licenseStatus['features'],
        ],
        'vehicle' => $nhtsaData ? [
            'vin'   => $vin,
            'year'  => $nhtsaData['ModelYear'] ?? '',
            'make'  => $nhtsaData['Make'] ?? '',
            'model' => $nhtsaData['Model'] ?? '',
            'trim'  => $nhtsaData['Trim'] ?? '',
            'body'  => $nhtsaData['BodyClass'] ?? '',
        ] : null,
    ]);
    exit();
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'action'  => $action,
    'message' => 'VIN Report & PDF service authorized.',
    'license' => [
        'valid'      => true,
        'status'     => $licenseStatus['status'] ?? 'Active',
        'expires_at' => $licenseStatus['expires_at'] ?? null,
        'features'   => $licenseStatus['features'],
    ]
]);
