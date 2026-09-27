<?php
/**
 * WheelClarify - License Verification API Endpoint
 * File: public_html/api/verify-license.php
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/../license-validator.php';

wc_handle_cors_preflight();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method Not Allowed. Only POST requests are accepted.',
    ]);
    exit;
}

$raw_input = file_get_contents('php://input');
$data = json_decode((string)$raw_input, true);
if (!is_array($data)) {
    $data = $_POST;
}

$license_key = isset($data['license_key'])
    ? trim((string)$data['license_key'])
    : (isset($data['licenseKey']) ? trim((string)$data['licenseKey']) : get_saved_wheelclarify_license_key());

$force_refresh = isset($data['force_refresh']) ? (bool)$data['force_refresh'] : true;

if ($license_key === '') {
    http_response_code(400);
    echo json_encode([
        'success'  => false,
        'valid'    => false,
        'status'   => 'missing',
        'features' => [
            'vin_reports'     => false,
            'payment_gateway' => false,
        ],
        'error'    => 'Please enter a License Key to verify.',
    ]);
    exit;
}

$result = check_wheelclarify_license($license_key, $force_refresh);

// Save key to server config if valid or if explicitly requested
if (!empty($result['valid']) || !empty($data['save_key'])) {
    save_wheelclarify_license_key($license_key);
}

http_response_code(200);
echo json_encode(array_merge(['success' => $result['valid']], $result));
exit;
