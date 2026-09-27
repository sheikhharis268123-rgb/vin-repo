<?php
/**
 * WheelClarify - Payment Gateway Processing Protection Gate
 * File: public/api/process-payment.php
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/../license-validator.php';

wc_handle_cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed. Use POST.'
    ]);
    exit();
}

$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$providedKey = trim((string)($payload['license_key'] ?? ($_SERVER['HTTP_X_LICENSE_KEY'] ?? '')));
$activeKey   = $providedKey !== '' ? $providedKey : wc_get_saved_license_key();

$licenseStatus = check_wheelclarify_license($activeKey);

$isValid        = !empty($licenseStatus['valid']);
$paymentAllowed = !empty($licenseStatus['features']['payment_gateway']);

if (!$isValid || !$paymentAllowed) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'Payment Gateway is locked. Active subscription required.',
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

$gateway  = strtolower(trim((string)($payload['gateway'] ?? 'stripe')));
$amount   = (float)($payload['amount'] ?? 0);
$currency = strtoupper(trim((string)($payload['currency'] ?? 'USD')));
$vin      = strtoupper(trim((string)($payload['vin'] ?? '')));
$email    = trim((string)($payload['email'] ?? ''));

http_response_code(200);
echo json_encode([
    'success'        => true,
    'message'        => 'Payment Gateway service authorized and ready.',
    'transaction_id' => 'WC-TXN-' . strtoupper(bin2hex(random_bytes(4))),
    'gateway'        => $gateway,
    'amount'         => $amount,
    'currency'       => $currency,
    'vin'            => $vin,
    'email'          => $email,
    'license'        => [
        'valid'      => true,
        'status'     => $licenseStatus['status'] ?? 'Active',
        'expires_at' => $licenseStatus['expires_at'] ?? null,
        'features'   => $licenseStatus['features'],
    ]
]);
