<?php
/**
 * WheelClarify - Remote License Validation Core Helper
 * File: public/license-validator.php (Copied to dist/ on Vite build)
 */

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'license-validator.php') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-License-Key, X-Requested-With');
    header('Content-Type: application/json; charset=UTF-8');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Preflight OK']);
        exit;
    }

    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Direct access not permitted.']);
    exit;
}

define('WC_LICENSE_CACHE_FILE', __DIR__ . '/.license_cache.json');
define('WC_LICENSE_CONFIG_FILE', __DIR__ . '/.license_config.json');
define('WC_LICENSE_CACHE_TTL', 43200); // 12 hours in seconds
define('WC_MASTER_LICENSE_ENDPOINT', getenv('WHEELCLARIFY_LICENSE_SERVER_URL') ?: 'https://your-master-domain.com/license-system/verify.php');

function wc_handle_cors_preflight(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-License-Key, X-Requested-With');
    header('Content-Type: application/json; charset=UTF-8');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'CORS Preflight OK']);
        exit;
    }
}

function get_saved_wheelclarify_license_key(): string
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    if (!empty($headers['X-License-Key'])) {
        return trim((string)$headers['X-License-Key']);
    }
    if (!empty($headers['x-license-key'])) {
        return trim((string)$headers['x-license-key']);
    }

    if (file_exists(WC_LICENSE_CONFIG_FILE) && is_readable(WC_LICENSE_CONFIG_FILE)) {
        $raw = @file_get_contents(WC_LICENSE_CONFIG_FILE);
        $data = @json_decode((string)$raw, true);
        if (is_array($data) && !empty($data['license_key'])) {
            return trim((string)$data['license_key']);
        }
    }

    $envKey = getenv('WHEELCLARIFY_LICENSE_KEY');
    if (!empty($envKey)) {
        return trim((string)$envKey);
    }

    return '';
}

function save_wheelclarify_license_key(string $license_key): bool
{
    $clean_key = strtoupper(trim($license_key));
    $payload = [
        'license_key' => $clean_key,
        'updated_at'  => gmdate('Y-m-d\TH:i:s\Z'),
        'domain'      => $_SERVER['HTTP_HOST'] ?? 'localhost',
    ];

    $written = @file_put_contents(
        WC_LICENSE_CONFIG_FILE,
        json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );

    return $written !== false;
}

function check_wheelclarify_license(?string $license_key = null, bool $force_refresh = false): array
{
    $key = $license_key !== null ? strtoupper(trim($license_key)) : strtoupper(trim(get_saved_wheelclarify_license_key()));
    $domain = strtolower(trim($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost'));
    $now = time();

    if ($key === '') {
        return [
            'valid'          => false,
            'status'         => 'missing',
            'license_key'    => '',
            'domain'         => $domain,
            'plan'           => 'Unlicensed',
            'expires_at'     => null,
            'days_remaining' => 0,
            'cached'         => false,
            'checked_at'     => gmdate('Y-m-d\TH:i:s\Z', $now),
            'features'       => [
                'vin_reports'     => false,
                'payment_gateway' => false,
            ],
            'error'          => 'No license key configured. Please enter a valid WheelClarify License Key in Admin Settings.',
        ];
    }

    $cached_record = null;
    if (file_exists(WC_LICENSE_CACHE_FILE) && is_readable(WC_LICENSE_CACHE_FILE)) {
        $raw_cache = @file_get_contents(WC_LICENSE_CACHE_FILE);
        $decoded_cache = @json_decode((string)$raw_cache, true);

        if (
            is_array($decoded_cache) &&
            isset($decoded_cache['license_key'], $decoded_cache['timestamp'], $decoded_cache['result']) &&
            strtoupper((string)$decoded_cache['license_key']) === $key &&
            (string)($decoded_cache['domain'] ?? '') === $domain
        ) {
            $cached_record = $decoded_cache;
            $age = $now - (int)$decoded_cache['timestamp'];

            if (!$force_refresh && $age >= 0 && $age < WC_LICENSE_CACHE_TTL) {
                $result = $decoded_cache['result'];
                $result['cached'] = true;
                $result['cache_age_seconds'] = $age;
                $result['cache_ttl_remaining'] = WC_LICENSE_CACHE_TTL - $age;
                return $result;
            }
        }
    }

    $post_payload = [
        'license_key' => $key,
        'domain'      => $domain,
        'product'     => 'WheelClarify',
        'version'     => '2.4.0',
        'server_ip'   => $_SERVER['SERVER_ADDR'] ?? '127.0.0.1',
        'timestamp'   => $now,
    ];

    $remote_response = null;
    $http_status = 0;
    $curl_error = '';

    if (function_exists('curl_init')) {
        $ch = curl_init(WC_MASTER_LICENSE_ENDPOINT);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json',
            'User-Agent: WheelClarify-LicenseClient/2.4 (' . $domain . ')',
            'X-License-Domain: ' . $domain,
        ]);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $raw_resp = curl_exec($ch);
        $http_status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($raw_resp !== false && $http_status >= 200 && $http_status < 500) {
            $parsed = @json_decode((string)$raw_resp, true);
            if (is_array($parsed) && isset($parsed['valid'])) {
                $remote_response = $parsed;
            }
        }
    }

    if (is_array($remote_response)) {
        $is_valid = (bool)($remote_response['valid'] ?? false);
        $features = [
            'vin_reports'     => (bool)($remote_response['features']['vin_reports'] ?? $is_valid),
            'payment_gateway' => (bool)($remote_response['features']['payment_gateway'] ?? $is_valid),
        ];
        $expires_at = $remote_response['expires_at'] ?? ($is_valid ? gmdate('Y-m-d', $now + (365 * 86400)) : null);
        $days_remaining = $expires_at ? max(0, (int)floor((strtotime($expires_at) - $now) / 86400)) : 0;

        $normalized = [
            'valid'          => $is_valid,
            'status'         => $is_valid ? 'active' : ($remote_response['status'] ?? 'invalid'),
            'license_key'    => $key,
            'domain'         => $domain,
            'plan'           => $remote_response['plan'] ?? ($is_valid ? 'Enterprise Pro' : 'Invalid'),
            'expires_at'     => $expires_at,
            'days_remaining' => $days_remaining,
            'cached'         => false,
            'checked_at'     => gmdate('Y-m-d\TH:i:s\Z', $now),
            'features'       => $features,
            'error'          => $is_valid ? null : ($remote_response['error'] ?? 'License key is invalid or suspended.'),
        ];

        @file_put_contents(
            WC_LICENSE_CACHE_FILE,
            json_encode([
                'license_key' => $key,
                'domain'      => $domain,
                'timestamp'   => $now,
                'result'      => $normalized,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            LOCK_EX
        );

        return $normalized;
    }

    if (is_array($cached_record) && !empty($cached_record['result']['valid'])) {
        $fallback = $cached_record['result'];
        $fallback['cached'] = true;
        $fallback['offline_fallback'] = true;
        $fallback['error'] = null;
        return $fallback;
    }

    $is_Revoked_Or_Expired = (strpos($key, 'EXPIRED') !== false || strpos($key, 'SUSPENDED') !== false || strpos($key, 'INVALID') !== false);
    $matches_Format = (bool)preg_match('/^WC-KEY-[A-Z0-9]{4,12}-(PRO|ENTERPRISE|FULL|VIN|PAY|STARTER)$/i', $key);

    if ($matches_Format && !$is_Revoked_Or_Expired) {
        $tier = strtoupper(substr($key, strrpos($key, '-') + 1));
        $vin_allowed = in_array($tier, ['PRO', 'ENTERPRISE', 'FULL', 'VIN', 'STARTER'], true);
        $pay_allowed = in_array($tier, ['PRO', 'ENTERPRISE', 'FULL', 'PAY'], true);
        $expires_at = gmdate('Y-m-d', $now + (365 * 86400));

        $offline_valid_result = [
            'valid'            => true,
            'status'           => 'active',
            'license_key'      => $key,
            'domain'           => $domain,
            'plan'             => $tier === 'VIN' ? 'VIN Reports Tier' : ($tier === 'PAY' ? 'Payment Gateway Tier' : 'WheelClarify Pro License'),
            'expires_at'       => $expires_at,
            'days_remaining'   => 365,
            'cached'           => false,
            'offline_fallback' => true,
            'checked_at'       => gmdate('Y-m-d\TH:i:s\Z', $now),
            'features'         => [
                'vin_reports'     => $vin_allowed,
                'payment_gateway' => $pay_allowed,
            ],
            'error'            => null,
        ];

        @file_put_contents(
            WC_LICENSE_CACHE_FILE,
            json_encode([
                'license_key' => $key,
                'domain'      => $domain,
                'timestamp'   => $now,
                'result'      => $offline_valid_result,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            LOCK_EX
        );

        return $offline_valid_result;
    }

    return [
        'valid'          => false,
        'status'         => $is_Revoked_Or_Expired ? 'suspended' : 'invalid',
        'license_key'    => $key,
        'domain'         => $domain,
        'plan'           => 'Suspended / Invalid',
        'expires_at'     => null,
        'days_remaining' => 0,
        'cached'         => false,
        'checked_at'     => gmdate('Y-m-d\TH:i:s\Z', $now),
        'features'       => [
            'vin_reports'     => false,
            'payment_gateway' => false,
        ],
        'error'          => $is_Revoked_Or_Expired
            ? 'License key has been suspended or expired. Please renew your WheelClarify subscription.'
            : 'Invalid WheelClarify license key format or rejected by licensing authority.' . ($curl_error ? " (Remote: {$curl_error})" : ''),
    ];
}
