import os
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
from livekit import api

load_dotenv()

SERVER_PORT = os.environ.get("SERVER_PORT", 6080)
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "secret")

app = Flask(__name__)

CORS(app)

@app.post("/token")
def getToken():
    room_name = request.json.get("roomName")
    participant_name = request.json.get("participantName")

    if not room_name or not participant_name:
        return "roomName and participantName are required", 400

    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
        .with_identity(participant_name) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name
        ))
    return token.to_jwt()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=SERVER_PORT)
