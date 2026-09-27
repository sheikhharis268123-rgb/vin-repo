<?php
/**
 * WheelClarify - VIN Search & PDF Report Protection Gate
 * File: public/api/vin-report.php
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/../license-validator.php';

wc_handle_cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed. Use POST or GET.'
    ]);
    exit();
}

$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_REQUEST;
}

$providedKey = trim((string)($payload['license_key'] ?? ($_SERVER['HTTP_X_LICENSE_KEY'] ?? '')));
$activeKey   = $providedKey !== '' ? $providedKey : wc_get_saved_license_key();

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

$vin    = strtoupper(trim((string)($payload['vin'] ?? '')));
$action = strtolower(trim((string)($payload['action'] ?? 'lookup')));

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
    ]
]);
