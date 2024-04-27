<?php
require __DIR__ . '/vendor/autoload.php';

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\VideoGrant;
use Dotenv\Dotenv;

Dotenv::createImmutable(__DIR__)->safeLoad();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: OPTIONS,GET,POST,PUT,DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$LIVEKIT_API_KEY = $_ENV['LIVEKIT_API_KEY'] ?? 'devkey';
$LIVEKIT_API_SECRET = $_ENV['LIVEKIT_API_SECRET'] ?? 'secret';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['PATH_INFO'] === '/token') {
    $data = json_decode(file_get_contents('php://input'), true);

    $roomName = $data['roomName'] ?? null;
    $participantName = $data['participantName'] ?? null;

    if (!$roomName || !$participantName) {
        http_response_code(400);
        echo "roomName and participantName are required";
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
    
    echo $token;
    exit();
}

echo "Unsupported endpoint or method";
exit();
