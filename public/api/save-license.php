<?php
/**
 * WheelClarify - Save License Configuration API Endpoint
 * File: public/api/save-license.php
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
    : (isset($data['licenseKey']) ? trim((string)$data['licenseKey']) : '');

$saved = save_wheelclarify_license_key($license_key);
$validation = check_wheelclarify_license($license_key, true);

http_response_code(200);
echo json_encode(array_merge([
    'success' => $saved,
    'saved'   => $saved,
    'message' => $saved ? 'License key saved to server configuration.' : 'Unable to write .license_config.json.',
], $validation));
exit;
