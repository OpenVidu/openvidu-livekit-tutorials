import os
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
from livekit.api import AccessToken, VideoGrants, TokenVerifier, WebhookReceiver

load_dotenv()

SERVER_PORT = os.environ.get("SERVER_PORT", 6080)
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "secret")

app = Flask(__name__)

CORS(app)


@app.post("/token")
def create_token():
    room_name = request.json.get("roomName")
    participant_name = request.json.get("participantName")

    if not room_name or not participant_name:
        return {"errorMessage": "roomName and participantName are required"}, 400

    token = (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(participant_name)
        .with_grants(VideoGrants(room_join=True, room=room_name))
    )
    return {"token": token.to_jwt()}


token_verifier = TokenVerifier(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
webhook_receiver = WebhookReceiver(token_verifier)


@app.post("/livekit/webhook")
def receive_webhook():
    auth_token = request.headers.get("Authorization")

    if not auth_token:
        return "Authorization header is required", 401

    try:
        event = webhook_receiver.receive(request.data.decode("utf-8"), auth_token)
        print("LiveKit Webhook:", event)
        return "ok"
    except:
        print("Authorization header is not valid")
        return "Authorization header is not valid", 401


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=SERVER_PORT)
