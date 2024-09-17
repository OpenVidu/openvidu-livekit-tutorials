import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { AccessToken, EgressClient, EncodedFileOutput, EncodedFileType, WebhookReceiver } from "livekit-server-sdk";
import { S3Service } from "./s3.service.js";

const SERVER_PORT = process.env.SERVER_PORT || 6080;

// LiveKit configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || "http://localhost:7880";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

const RECORDINGS_PATH = process.env.RECORDINGS_PATH ?? "recordings/";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/webhook+json" }));

// Set the static files location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

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
    at.addGrant({ roomJoin: true, room: roomName, roomRecord: true });
    const token = await at.toJwt();
    res.json({ token });
});

const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

app.post("/livekit/webhook", async (req, res) => {
    try {
        const event = await webhookReceiver.receive(req.body, req.get("Authorization"));
        console.log(event);
    } catch (error) {
        console.error("Error validating webhook event.", error);
    }
    res.status(200).send();
});

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const s3Service = new S3Service();

app.post("/recordings/start", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "roomName is required" });
        return;
    }

    const activeRecording = await getActiveRecordingByRoom(roomName);

    // Check if there is already an active recording for this room
    if (activeRecording) {
        res.status(409).json({ errorMessage: "Recording already started for this room" });
        return;
    }

    // Use the EncodedFileOutput to save the recording to an MP4 file
    const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `${RECORDINGS_PATH}{room_name}-{room_id}-{time}`
    });

    try {
        // Start a RoomCompositeEgress to record all participants in the room
        const egressInfo = await egressClient.startRoomCompositeEgress(roomName, { file: fileOutput });
        const recording = {
            name: egressInfo.fileResults[0].filename.split("/").pop(),
            startedAt: Number(egressInfo.startedAt) / 1_000_000
        };
        res.json({ message: "Recording started", recording });
    } catch (error) {
        console.error("Error starting recording.", error);
        res.status(500).json({ errorMessage: "Error starting recording" });
    }
});

app.post("/recordings/stop", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "roomName is required" });
        return;
    }

    const activeRecording = await getActiveRecordingByRoom(roomName);

    // Check if there is an active recording for this room
    if (!activeRecording) {
        res.status(409).json({ errorMessage: "Recording not started for this room" });
        return;
    }

    try {
        // Stop the Egress to finish the recording
        const egressInfo = await egressClient.stopEgress(activeRecording);
        const file = egressInfo.fileResults[0];
        const recording = {
            name: file.filename.split("/").pop(),
            startedAt: Number(egressInfo.startedAt) / 1_000_000,
            size: Number(file.size)
        };
        res.json({ message: "Recording stopped", recording });
    } catch (error) {
        console.error("Error stopping recording.", error);
        res.status(500).json({ errorMessage: "Error stopping recording" });
    }
});

const getActiveRecordingByRoom = async (roomName) => {
    try {
        // List all active egresses for the room
        const egresses = await egressClient.listEgress({ roomName, active: true });
        return egresses.length > 0 ? egresses[0].egressId : null;
    } catch (error) {
        console.error("Error listing egresses.", error);
        return null;
    }
};

app.get("/recordings", async (req, res) => {
    const roomName = req.query.roomName?.toString();
    const roomId = req.query.roomId?.toString();

    try {
        const keyStart = RECORDINGS_PATH + (roomName ? `${roomName}` + (roomId ? `-${roomId}` : "") : "");
        const keyEnd = ".mp4.json";
        const regex = new RegExp(`^${keyStart}.*${keyEnd}$`);

        // List all Egress metadata files in the recordings path that match the regex
        const payloadKeys = await s3Service.listObjects(RECORDINGS_PATH, regex);
        const recordings = await Promise.all(payloadKeys.map((payloadKey) => getRecordingInfo(payloadKey)));
        res.json({ recordings });
    } catch (error) {
        console.error("Error listing recordings.", error);
        res.status(500).json({ errorMessage: "Error listing recordings" });
    }
});

const getRecordingInfo = async (payloadKey) => {
    // Get the Egress metadata file as JSON
    const data = await s3Service.getObjectAsJson(payloadKey);

    // Get the recording file size
    const recordingKey = payloadKey.replace(".json", "");
    const size = await s3Service.getObjectSize(recordingKey);

    const recordingName = recordingKey.split("/").pop();
    const recording = {
        name: recordingName,
        startedAt: Number(data.started_at) / 1000000,
        size: size
    };
    return recording;
};

app.get("/recordings/:recordingName", async (req, res) => {
    const { recordingName } = req.params;
    const key = RECORDINGS_PATH + recordingName;
    const exists = await s3Service.exists(key);

    if (!exists) {
        res.status(404).json({ errorMessage: "Recording not found" });
        return;
    }

    try {
        // Get the recording file from S3
        const { body, size } = await s3Service.getObject(key);

        // Set the response headers
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Length", size);
        res.setHeader("Accept-Ranges", "bytes");

        // Pipe the recording file to the response
        body.pipe(res).on("finish", () => res.end());
    } catch (error) {
        console.error("Error getting recording.", error);
        res.status(500).json({ errorMessage: "Error getting recording" });
    }
});

app.delete("/recordings/:recordingName", async (req, res) => {
    const { recordingName } = req.params;
    const key = RECORDINGS_PATH + recordingName;
    const exists = await s3Service.exists(key);

    if (!exists) {
        res.status(404).json({ errorMessage: "Recording not found" });
        return;
    }

    try {
        // Delete the recording file and metadata file from S3
        await Promise.all([s3Service.deleteObject(key), s3Service.deleteObject(`${key}.json`)]);
        res.json({ message: "Recording deleted" });
    } catch (error) {
        console.error("Error deleting recording.", error);
        res.status(500).json({ errorMessage: "Error deleting recording" });
    }
});

app.listen(SERVER_PORT, () => {
    console.log("Server started on port:", SERVER_PORT);
});
