<?php
require __DIR__ . "/vendor/autoload.php";

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\VideoGrant;
use Agence104\LiveKit\WebhookReceiver;
use Dotenv\Dotenv;

Dotenv::createImmutable(__DIR__)->safeLoad();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-type: application/json");

$LIVEKIT_API_KEY = $_ENV["LIVEKIT_API_KEY"] ?? "devkey";
$LIVEKIT_API_SECRET = $_ENV["LIVEKIT_API_SECRET"] ?? "secret";

if (isset($_SERVER["REQUEST_METHOD"]) && $_SERVER["REQUEST_METHOD"] === "POST" && $_SERVER["PATH_INFO"] === "/token") {
    $data = json_decode(file_get_contents("php://input"), true);

    $roomName = $data["roomName"] ?? null;
    $participantName = $data["participantName"] ?? null;

    if (!$roomName || !$participantName) {
        http_response_code(400);
        echo json_encode(["errorMessage" => "roomName and participantName are required"]);
        exit();
    }

    $tokenOptions = (new AccessTokenOptions())
        ->setIdentity($participantName);
    $videoGrant = (new VideoGrant())
        ->setRoomJoin()
        ->setRoomName($roomName);
    $token = (new AccessToken($LIVEKIT_API_KEY, $LIVEKIT_API_SECRET))
        ->init($tokenOptions)
        ->setGrant($videoGrant)
        ->toJwt();

    echo json_encode(["token" => $token]);
    exit();
}

$webhookReceiver = (new WebhookReceiver($LIVEKIT_API_KEY, $LIVEKIT_API_SECRET));

if (isset($_SERVER["REQUEST_METHOD"]) && $_SERVER["REQUEST_METHOD"] === "POST" && $_SERVER["PATH_INFO"] === "/livekit/webhook") {
    $headers = getallheaders();
    $authHeader = $headers["Authorization"];
    $body = file_get_contents("php://input");
    try {
        $event = $webhookReceiver->receive($body, $authHeader);
        error_log("LiveKit Webhook:");
        error_log(print_r($event->getEvent(), true));
        exit();
    } catch (Exception $e) {
        http_response_code(401);
        echo "Error validating webhook event";
        echo json_encode($e->getMessage());
        exit();
    }
}

echo json_encode(["errorMessage" => "Unsupported endpoint or method"]);
exit();
