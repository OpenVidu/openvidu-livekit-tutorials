import "dotenv/config.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, SERVER_PORT, APP_NAME } from "./config.js";
import { recordingController } from "./controllers/recording.controller.js";
import { webhookController } from "./controllers/webhook.controller.js";

const app = express();

app.use(cors());
app.use(express.json());

// Set the static files location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

app.use("/recordings", recordingController);
app.use("/livekit/webhook", webhookController);

app.post("/token", async (req, res) => {
    const roomName = req.body.roomName;
    const participantName = req.body.participantName;

    if (!roomName || !participantName) {
        res.status(400).json({ errorMessage: "roomName and participantName are required" });
        return;
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: participantName
    });
    const permissions = {
        room: roomName,
        roomJoin: true,
        roomAdmin: true,
        roomList: true,
        roomRecord: true
    };
    at.addGrant(permissions);
    const token = await at.toJwt();

    const roomClient = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    // Check if room already exists
    const rooms = await roomClient.listRooms([roomName]);

    // Create room if it doesn't exist
    if (rooms.length === 0) {
        const roomOptions = {
            name: roomName,
            metadata: JSON.stringify({
                createdBy: APP_NAME,
                recordingStatus: "STOPPED"
            })
        };
        await roomClient.createRoom(roomOptions);
    }

    res.json({ token });
});

app.listen(SERVER_PORT, () => {
    console.log("Server started on port:", SERVER_PORT);
});
