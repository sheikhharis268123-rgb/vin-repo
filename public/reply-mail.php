<?php
/**
 * WheelClarify - Admin Ticket Reply PHP Mailer for Hostinger
 * Receives JSON payload when administrator replies to a support ticket
 * Sends an email response directly to the customer's email.
 */

error_reporting(0);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Preflight OK"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method Not Allowed. Only POST requests are accepted."]);
    exit;
}

$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);

if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid JSON payload received."]);
    exit;
}

$to = isset($data['to']) ? trim(filter_var($data['to'], FILTER_SANITIZE_EMAIL)) : '';
$customer_name = isset($data['customerName']) ? trim(strip_tags($data['customerName'])) : 'Valued Customer';
$ticket_id = isset($data['ticketId']) ? trim(strip_tags($data['ticketId'])) : 'SUPPORT';
$subject = isset($data['subject']) && !empty(trim($data['subject'])) ? trim(strip_tags($data['subject'])) : "Response to Support Ticket #{$ticket_id}";
$reply = isset($data['reply']) ? trim(strip_tags($data['reply'])) : (isset($data['message']) ? trim(strip_tags($data['message'])) : '');
$admin_email = isset($data['adminEmail']) && !empty(trim($data['adminEmail'])) ? trim(filter_var($data['adminEmail'], FILTER_SANITIZE_EMAIL)) : "affandark@gmail.com";

if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(["success" => false, "error" => "Please provide a valid recipient email address."]);
    exit;
}

if (empty($reply)) {
    http_response_code(422);
    echo json_encode(["success" => false, "error" => "Reply message cannot be empty."]);
    exit;
}

$email_subject = "Re: [Ticket #{$ticket_id}] {$subject}";

$email_body = "
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <title>Support Response</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px; margin: 0;'>
  <div style='max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
    
    <div style='background: #0f172a; padding: 24px; color: #ffffff;'>
      <h2 style='margin: 0; color: #facc15; font-size: 20px;'>WheelClarify Support Response</h2>
      <p style='margin: 4px 0 0; color: #94a3b8; font-size: 12px;'>Ticket #{$ticket_id} • Official Staff Reply</p>
    </div>

    <div style='padding: 24px;'>
      <p style='font-size: 14px; color: #334155; margin-top: 0;'>Dear " . htmlspecialchars($customer_name) . ",</p>
      <p style='font-size: 14px; color: #334155;'>Our administrator has reviewed your inquiry and provided the following response:</p>

      <div style='background: #f1f5f9; border-left: 4px solid #facc15; padding: 16px; border-radius: 8px; margin: 20px 0;'>
        <div style='font-size: 14px; color: #0f172a; white-space: pre-wrap; line-height: 1.6;'>" . htmlspecialchars($reply) . "</div>
      </div>

      <p style='font-size: 13px; color: #64748b;'>If you have any further questions, you may reply directly to this email at <a href='mailto:{$admin_email}' style='color: #2563eb;'>{$admin_email}</a>.</p>
    </div>

    <div style='background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;'>
      <p style='margin: 0; font-size: 11px; color: #94a3b8;'>WheelClarify Vehicle Reports • Official NMVTIS & Federal Title Registry</p>
    </div>

  </div>
</body>
</html>
";

$headers = [];
$headers[] = "MIME-Version: 1.0";
$headers[] = "Content-type: text/html; charset=UTF-8";
$headers[] = "From: WheelClarify Support <{$admin_email}>";
$headers[] = "Reply-To: {$admin_email}";
$headers[] = "X-Mailer: Hostinger PHP/" . phpversion();

$sent = @mail($to, $email_subject, $email_body, implode("\r\n", $headers));

if ($sent) {
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Reply email dispatched successfully to customer inbox!",
        "ticketId" => $ticket_id,
        "recipient" => $to
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to deliver email through PHP mail(). Please verify mail configuration on Hostinger."
    ]);
}
