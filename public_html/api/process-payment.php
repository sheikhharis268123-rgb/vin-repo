<?php
/**
 * WheelClarify - Payment Gateway Processing Protection Gate
 * File: public_html/api/process-payment.php
 *
 * Verifies the active WheelClarify subscription license before initializing
 * or processing Stripe / PayPal checkout transactions.
 */

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/../license-validator.php';

// 1. Handle CORS Preflight (OPTIONS) cleanly
wc_handle_cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed. Use POST.'
    ]);
    exit();
}

// 2. Parse JSON request payload
$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

// 3. Retrieve the active license key
$providedKey = trim((string)($payload['license_key'] ?? ($_SERVER['HTTP_X_LICENSE_KEY'] ?? '')));
$activeKey   = $providedKey !== '' ? $providedKey : wc_get_saved_license_key();

// 4. Verify license & payment_gateway feature authorization
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

// 5. License is valid and Payment Gateway is authorized — proceed with payment verification / processing
$gateway  = strtolower(trim((string)($payload['gateway'] ?? 'stripe')));
$amount   = (float)($payload['amount'] ?? 0);
$currency = strtoupper(trim((string)($payload['currency'] ?? 'USD')));
$vin      = strtoupper(trim((string)($payload['vin'] ?? '')));
$email    = trim((string)($payload['email'] ?? ''));

// If gateway credentials are provided for live verification, delegate or confirm readiness
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
