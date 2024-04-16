import os
import requests
import livekit
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Enable CORS support
cors = CORS(app, resources={r"/*": {"origins": "*"}})

# Load env variables
SERVER_PORT = os.environ.get("SERVER_PORT")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET")



@app.route("/token", methods=['POST'])
def getToken():
    room_name = request.json.get("roomName")
    participant_name = request.json.get("participantName")

    if not room_name or not participant_name:
        return "roomName and participantName are required", 400

    # Create a VideoGrant with the necessary permissions
    grant = livekit.VideoGrant(room_join=True, room=room_name)

    # Create an AccessToken with your API key, secret and the VideoGrant
    access_token = livekit.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, grant=grant, identity=participant_name)

    # Generate the token
    return access_token.to_jwt()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=SERVER_PORT)
