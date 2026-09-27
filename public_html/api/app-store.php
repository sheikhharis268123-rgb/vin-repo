<?php
/**
 * WheelClarify - Unified MySQL Application Store Endpoint
 * File: public_html/api/app-store.php
 *
 * Replaces browser localStorage with centralized MySQL database persistence
 * for packages, tickets, orders, license_config, gateways, currency_settings,
 * email_settings, and email_logs.
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

// ============================================================================
// 1. MYSQL DATABASE CONFIGURATION & CONNECTION
// ============================================================================
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'wheelclarify_db';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';
$dbPort = getenv('DB_PORT') ?: '3306';

// Optional local db-config.php override on cPanel / Hostinger
$dbConfigFile = __DIR__ . '/../db-config.php';
if (file_exists($dbConfigFile)) {
    include_once $dbConfigFile;
}

$fallbackStoreFile = __DIR__ . '/../.app_store_db.json';

/**
 * Default seed data used when initializing a fresh MySQL database
 */
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
            [
                'id'             => 'ord-1002',
                'orderNumber'    => 'WC-98242',
                'vin'            => '1FTFW1ED4MFA19823',
                'vehicleName'    => '2021 Ford F-150 Lariat 4WD',
                'customerName'   => 'Sarah Jenkins',
                'email'          => 'sarah.j@outlook.com',
                'phone'          => '+1 (555) 847-2291',
                'mileage'        => '42,100',
                'packageId'      => 'gold',
                'packageName'    => 'GOLD PACKAGE',
                'amount'         => 99.99,
                'currencyCode'   => 'USD',
                'currencySymbol' => '$',
                'deliveryTime'   => 'INSTANT 1-HOUR DELIVERY',
                'paymentMethod'  => 'Credit Card (Stripe)',
                'paymentStatus'  => 'Paid',
                'deliveryStatus' => 'Delivered & Emailed',
                'createdAt'      => '2026-09-26 03:15 AM',
                'reportSummary'  => [
                    'specsFound'    => 52,
                    'titleStatus'   => 'Clean (FL)',
                    'accidentCount' => 0,
                    'score'         => 92,
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
            [
                'id'           => 'tkt-2002',
                'ticketNumber' => 'TKT-732911',
                'customerName' => 'Amanda Briggs',
                'email'        => 'amanda.briggs@techfleet.io',
                'phone'        => '+1 (555) 442-9901',
                'category'     => 'Billing & Refund',
                'subject'      => 'Invoice copy with company tax ID required',
                'message'      => 'We purchased 5 vehicle checks under the Dealer package. We require a formal commercial invoice showing our company EIN.',
                'status'       => 'in-progress',
                'priority'     => 'normal',
                'createdAt'    => '2026-09-24 07:45 PM',
                'adminReply'   => 'Hi Amanda, our billing team has generated the formal tax invoice and attached it to your corporate email account.',
                'repliedAt'    => '2026-09-24 08:30 PM',
            ],
        ],
        'license_config' => $licenseStatus,
        'gateways'       => null,
        'currency_settings' => null,
        'email_settings' => null,
        'email_logs'     => null,
        'search_history' => ['WBACH9343YLG18917'],
    ];
}

/**
 * Connect to MySQL via PDO and ensure schema table `wc_app_store` exists.
 * Returns null if MySQL is unavailable so file store fallback can take over.
 */
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

        // Ensure unified key-value JSON store table exists in MySQL
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

/**
 * Load the entire application store from MySQL (or JSON fallback)
 */
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
                // Seed initial rows into MySQL
                wc_save_store($pdo, $fallbackFile, $defaults);
                return $defaults;
            }
        } catch (Throwable $e) {
            // Fall through to file store
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

/**
 * Persist updated keys into MySQL and JSON fallback
 */
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
            // Continue to fallback file write
        }
    }

    @file_put_contents($fallbackFile, json_encode($storeData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

// ============================================================================
// 2. REQUEST ROUTING (GET & POST/PUT/DELETE)
// ============================================================================
$pdo   = wc_get_pdo_connection($dbHost, $dbPort, $dbName, $dbUser, $dbPass);
$store = wc_load_store($pdo, $fallbackStoreFile);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // Ensure license_config is always fresh
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

// Handle POST / PUT / DELETE mutations
$rawInput = file_get_contents('php://input');
$payload  = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$action = strtolower(trim((string)($payload['action'] ?? '')));

// Support direct key updates if passed in payload or payload['data']
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

// Also support granular action-based mutations for single items
switch ($action) {
    case 'save_order':
        if (!empty($payload['order']) && is_array($payload['order'])) {
            $orders = is_array($store['orders']) ? $store['orders'] : [];
            array_unshift($orders, $payload['order']);
            $store['orders'] = $orders;
        }
        break;

    case 'update_order_status':
        if (!empty($payload['orderId'])) {
            $orderId = (string)$payload['orderId'];
            $orders  = is_array($store['orders']) ? $store['orders'] : [];
            foreach ($orders as &$ord) {
                if (($ord['id'] ?? '') === $orderId) {
                    if (isset($payload['paymentStatus'])) {
                        $ord['paymentStatus'] = $payload['paymentStatus'];
                    }
                    if (isset($payload['deliveryStatus'])) {
                        $ord['deliveryStatus'] = $payload['deliveryStatus'];
                    }
                }
            }
            unset($ord);
            $store['orders'] = $orders;
        }
        break;

    case 'delete_order':
        if (!empty($payload['orderId'])) {
            $orderId = (string)$payload['orderId'];
            $store['orders'] = array_values(array_filter(
                is_array($store['orders']) ? $store['orders'] : [],
                fn($o) => ($o['id'] ?? '') !== $orderId
            ));
        }
        break;

    case 'delete_orders':
        if (!empty($payload['orderIds']) && is_array($payload['orderIds'])) {
            $ids = $payload['orderIds'];
            $store['orders'] = array_values(array_filter(
                is_array($store['orders']) ? $store['orders'] : [],
                fn($o) => !in_array($o['id'] ?? '', $ids, true)
            ));
        }
        break;

    case 'save_ticket':
        if (!empty($payload['ticket']) && is_array($payload['ticket'])) {
            $tickets = is_array($store['tickets']) ? $store['tickets'] : [];
            array_unshift($tickets, $payload['ticket']);
            $store['tickets'] = $tickets;
        }
        break;

    case 'delete_ticket':
        if (!empty($payload['ticketId'])) {
            $ticketId = (string)$payload['ticketId'];
            $store['tickets'] = array_values(array_filter(
                is_array($store['tickets']) ? $store['tickets'] : [],
                fn($t) => ($t['id'] ?? '') !== $ticketId
            ));
        }
        break;

    case 'delete_tickets':
        if (!empty($payload['ticketIds']) && is_array($payload['ticketIds'])) {
            $ids = $payload['ticketIds'];
            $store['tickets'] = array_values(array_filter(
                is_array($store['tickets']) ? $store['tickets'] : [],
                fn($t) => !in_array($t['id'] ?? '', $ids, true)
            ));
        }
        break;

    case 'save_license_config':
        if (!empty($payload['license_key'])) {
            $key = trim((string)$payload['license_key']);
            wc_save_license_key($key);
            $store['license_config'] = check_wheelclarify_license($key, true);
        } elseif (!empty($payload['license_config']) && is_array($payload['license_config'])) {
            $store['license_config'] = $payload['license_config'];
            if (!empty($payload['license_config']['license_key'])) {
                wc_save_license_key((string)$payload['license_config']['license_key']);
            }
        }
        break;

    case 'reset_defaults':
        $store = wc_get_default_store_data();
        break;
}

// Sync license_config key with license-validator config file if updated
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
