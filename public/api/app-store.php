<?php
/**
 * WheelClarify - Unified MySQL Application Store Endpoint
 * File: public/api/app-store.php (Copied to dist/api/app-store.php on Vite build)
 */

error_reporting(0);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-License-Key');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['success' => true, 'status' => 'ok']);
    exit();
}

require_once __DIR__ . '/../license-validator.php';

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'wheelclarify_db';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';
$dbPort = getenv('DB_PORT') ?: '3306';

$dbConfigFile = __DIR__ . '/../db-config.php';
if (file_exists($dbConfigFile)) {
    include_once $dbConfigFile;
}

$fallbackStoreFile = __DIR__ . '/../.app_store_db.json';

function wc_get_default_store_data(): array
{
    $savedLicenseKey = wc_get_saved_license_key() ?: 'WC-KEY-884920-PRO';
    $licenseStatus   = check_wheelclarify_license($savedLicenseKey);

    return [
        'packages' => [
            [
                'id'           => 'standard',
                'name'         => 'STANDARD PACKAGE',
                'tagline'      => 'Essential history and basic verification.',
                'price'        => 39.99,
                'credits'      => 1,
                'deliveryTime' => '12 HOURS DELIVERY',
                'isPopular'    => false,
                'isActive'     => true,
                'features'     => [
                    '12 HOURS DELIVERY',
                    'VEHICLE SPECIFICATIONS',
                    'TITLE & BRAND RECORDS',
                    'ACCIDENT RECORDS',
                    '1 PDF DOWNLOAD',
                    'DIRECT EMAIL DISPATCH',
                ],
            ],
            [
                'id'           => 'silver',
                'name'         => 'SILVER PACKAGE',
                'tagline'      => 'Detailed analysis with risk indicators.',
                'price'        => 69.99,
                'credits'      => 1,
                'deliveryTime' => '6 HOURS DELIVERY',
                'isPopular'    => true,
                'isActive'     => true,
                'features'     => [
                    '6 HOURS DELIVERY',
                    'EVERYTHING IN STANDARD',
                    'THEFT RECORDS',
                    'LIEN / IMPOUND RECORDS',
                    'SALVAGE AUCTION RECORDS',
                    '3 PDF DOWNLOADS',
                    'PRIORITY EMAIL DISPATCH',
                ],
            ],
            [
                'id'           => 'gold',
                'name'         => 'GOLD PACKAGE',
                'tagline'      => 'Total transparency with premium benefits.',
                'price'        => 99.99,
                'credits'      => 1,
                'deliveryTime' => 'INSTANT 1-HOUR DELIVERY',
                'isPopular'    => false,
                'isActive'     => true,
                'features'     => [
                    'INSTANT 1-HOUR DELIVERY',
                    'EVERYTHING IN SILVER',
                    'ODOMETER TAMPER AUDIT',
                    'MARKET VALUE & AUCTIONS',
                    'PRIORITY FORENSIC SUPPORT',
                    'UNLIMITED PDF DOWNLOADS',
                ],
            ],
            [
                'id'           => 'dealer',
                'name'         => 'DEALER PACKAGE',
                'tagline'      => 'Commercial volume access for fleet & dealers.',
                'price'        => 149.99,
                'credits'      => 5,
                'deliveryTime' => 'INSTANT PRIORITY',
                'isPopular'    => false,
                'isActive'     => true,
                'features'     => [
                    'INSTANT PRIORITY ACCESS',
                    '5 VEHICLE HISTORY CREDITS',
                    'WHOLESALE AUCTION PRICING',
                    'FULL NMVTIS SPECIFICATIONS',
                    'DEDICATED ACCOUNT REP',
                    'API ACCESS READY',
                ],
            ],
        ],
        'orders' => [
            [
                'id'             => 'ord-1001',
                'orderNumber'    => 'WC-98241',
                'vin'            => 'WBACH9343YLG18917',
                'vehicleName'    => '2000 BMW Z3 Roadster',
                'customerName'   => 'Marcus Vance',
                'email'          => 'marcus.vance@gmail.com',
                'phone'          => '+1 (555) 392-1084',
                'mileage'        => '68,450',
                'packageId'      => 'silver',
                'packageName'    => 'SILVER PACKAGE',
                'amount'         => 69.99,
                'currencyCode'   => 'USD',
                'currencySymbol' => '$',
                'deliveryTime'   => '6 HOURS DELIVERY',
                'paymentMethod'  => 'Stripe Link',
                'paymentStatus'  => 'Paid',
                'deliveryStatus' => 'Pending Manual Send',
                'createdAt'      => '2026-09-27 06:32 AM',
                'reportSummary'  => [
                    'specsFound'    => 48,
                    'titleStatus'   => 'Clean (TX, CA)',
                    'accidentCount' => 0,
                    'score'         => 88,
                ],
            ],
        ],
        'tickets' => [
            [
                'id'           => 'tkt-2001',
                'ticketNumber' => 'TKT-841920',
                'customerName' => 'Robert Langdon',
                'email'        => 'robert.langdon@gmail.com',
                'phone'        => '+1 (555) 773-4019',
                'category'     => 'Report Delivery Issue',
                'subject'      => 'Need PDF report re-sent to work email',
                'message'      => 'Hello, I bought the Gold package report for my F-150 earlier today. Could you please resend the full PDF report to robert.langdon@gmail.com?',
                'status'       => 'open',
                'priority'     => 'high',
                'createdAt'    => '2026-09-25 04:10 AM',
            ],
        ],
        'license_config'    => $licenseStatus,
        'gateways'          => null,
        'currency_settings' => null,
        'email_settings'    => null,
        'email_logs'        => null,
        'search_history'    => ['WBACH9343YLG18917'],
    ];
}

function wc_get_pdo_connection(string $host, string $port, string $db, string $user, string $pass): ?PDO
{
    if (!extension_loaded('pdo_mysql')) {
        return null;
    }
    try {
        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT            => 4,
        ]);

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `wc_app_store` (
                `store_key` VARCHAR(64) NOT NULL PRIMARY KEY,
                `store_value` LONGTEXT NOT NULL,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        return $pdo;
    } catch (Throwable $e) {
        return null;
    }
}

function wc_load_store(?PDO $pdo, string $fallbackFile): array
{
    $defaults = wc_get_default_store_data();

    if ($pdo !== null) {
        try {
            $stmt = $pdo->query("SELECT `store_key`, `store_value` FROM `wc_app_store`");
            $rows = $stmt ? $stmt->fetchAll() : [];
            if (!empty($rows)) {
                $store = $defaults;
                foreach ($rows as $row) {
                    $k = $row['store_key'];
                    $v = json_decode($row['store_value'], true);
                    if ($v !== null) {
                        $store[$k] = $v;
                    }
                }
                return $store;
            } else {
                wc_save_store($pdo, $fallbackFile, $defaults);
                return $defaults;
            }
        } catch (Throwable $e) {
        }
    }

    if (file_exists($fallbackFile)) {
        $raw = @file_get_contents($fallbackFile);
        if ($raw !== false) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return array_merge($defaults, $decoded);
            }
        }
    }

    @file_put_contents($fallbackFile, json_encode($defaults, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    return $defaults;
}

function wc_save_store(?PDO $pdo, string $fallbackFile, array $storeData): void
{
    if ($pdo !== null) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO `wc_app_store` (`store_key`, `store_value`)
                VALUES (:k, :v)
                ON DUPLICATE KEY UPDATE `store_value` = VALUES(`store_value`)
            ");
            foreach ($storeData as $key => $value) {
                if ($value !== null) {
                    $stmt->execute([
                        ':k' => (string)$key,
                        ':v' => json_encode($value, JSON_UNESCAPED_SLASHES),
                    ]);
                }
            }
        } catch (Throwable $e) {
        }
    }

    @file_put_contents($fallbackFile, json_encode($storeData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

$pdo   = wc_get_pdo_connection($dbHost, $dbPort, $dbName, $dbUser, $dbPass);
$store = wc_load_store($pdo, $fallbackStoreFile);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (empty($store['license_config']) || !is_array($store['license_config'])) {
        $store['license_config'] = check_wheelclarify_license(wc_get_saved_license_key() ?: 'WC-KEY-884920-PRO');
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'storage' => $pdo !== null ? 'mysql' : 'server_json',
        'data'    => $store,
    ]);
    exit();
}

$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$action       = strtolower(trim((string)($payload['action'] ?? '')));
$incomingData = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : $payload;

$allowedKeys = [
    'packages',
    'tickets',
    'orders',
    'license_config',
    'gateways',
    'currency_settings',
    'email_settings',
    'email_logs',
    'visitor_country',
    'search_history',
];

foreach ($allowedKeys as $key) {
    if (array_key_exists($key, $incomingData) && $incomingData[$key] !== null) {
        $store[$key] = $incomingData[$key];
    }
}

if (!empty($store['license_config']['license_key'])) {
    wc_save_license_key((string)$store['license_config']['license_key']);
}

wc_save_store($pdo, $fallbackStoreFile, $store);

http_response_code(200);
echo json_encode([
    'success' => true,
    'storage' => $pdo !== null ? 'mysql' : 'server_json',
    'data'    => $store,
]);
