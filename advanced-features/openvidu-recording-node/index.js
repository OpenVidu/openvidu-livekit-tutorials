import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
    AccessToken,
    EgressClient,
    EgressStatus,
    EncodedFileOutput,
    EncodedFileType,
    WebhookReceiver
} from "livekit-server-sdk";
import {
    S3Client,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand
} from "@aws-sdk/client-s3";

const SERVER_PORT = process.env.SERVER_PORT || 6080;

// LiveKit configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || "http://localhost:7880";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

// S3 configuration
const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET || "openvidu";
const DEFAULT_RECORDINGS_PATH = process.env.DEFAULT_RECORDINGS_PATH ?? "recordings";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/webhook+json" }));

// Set the static files location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname + "/public"));

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
const s3Client = new S3Client({
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY
    },
    region: AWS_REGION,
    forcePathStyle: true
});

app.post("/recordings/start", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "roomName is required" });
        return;
    }

    const activeEgresses = await getActiveEgressesByRoom(roomName);

    if (activeEgresses.length > 0) {
        res.status(400).json({ errorMessage: "Recording already started for this room" });
        return;
    }

    const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `${DEFAULT_RECORDINGS_PATH}/{room_name}-{time}`,
        disableManifest: true
    });

    try {
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

    const activeEgresses = await getActiveEgressesByRoom(roomName);

    if (activeEgresses.length === 0) {
        res.status(400).json({ errorMessage: "Recording not started for this room" });
        return;
    }

    const egressId = activeEgresses[0].egressId;

    try {
        const egressInfo = await egressClient.stopEgress(egressId);
        const file = egressInfo.fileResults[0];
        const recording = {
            name: file.filename.split("/").pop(),
            startedAt: Number(egressInfo.startedAt) / 1_000_000,
            duration: Number(file.duration) / 1_000_000_000,
            size: Number(file.size)
        };
        res.json({ message: "Recording stopped", recording });
    } catch (error) {
        console.error("Error stopping recording.", error);
        res.status(500).json({ errorMessage: "Error stopping recording" });
    }
});

const getActiveEgressesByRoom = async (roomName) => {
    try {
        return await egressClient.listEgress({ roomName, active: true });
    } catch (error) {
        console.error("Error listing egresses.", error);
        return [];
    }
};

app.get("/recordings", async (req, res) => {
    const roomName = req.query.roomName?.toString();

    try {
        const egresses = await egressClient.listEgress({ roomName });
        const recordings = [];

        for (const egress of egresses) {
            if (egress.status === EgressStatus.EGRESS_COMPLETE) {
                const file = egress.fileResults[0];
                const recordingExist = await checkRecordingExists(file.filename);

                if (recordingExist) {
                    const fileName = file.filename.split("/").pop();
                    const recording = {
                        name: fileName,
                        startedAt: Number(egress.startedAt) / 1_000_000,
                        duration: Number(file.duration) / 1_000_000_000,
                        size: Number(file.size)
                    };
                    recordings.push(recording);
                }
            }
        }

        res.json({ recordings });
    } catch (error) {
        console.error("Error listing recordings.", error);
        res.status(500).json({ errorMessage: "Error listing recordings" });
    }
});

const checkRecordingExists = async (recordingPath) => {
    const command = new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: recordingPath
    });

    try {
        await s3Client.send(command);
        return true;
    } catch (error) {
        return false;
    }
};

app.get("/recordings/:recordingName", async (req, res) => {
    const { recordingName } = req.params;

    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: `${DEFAULT_RECORDINGS_PATH}/${recordingName}`
    });

    try {
        const { Body, ContentLength: fileSize } = await s3Client.send(command);
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Length", fileSize);
        res.setHeader("Accept-Ranges", "bytes");
        Body.pipe(res).on("finish", () => res.end());
    } catch (error) {
        console.error("Error getting recording.", error);
        res.status(500).json({ errorMessage: "Error getting recording" });
    }
});

app.delete("/recordings/:recordingName", async (req, res) => {
    const { recordingName } = req.params;

    const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: `${DEFAULT_RECORDINGS_PATH}/${recordingName}`
    });

    try {
        await s3Client.send(command);
        res.json({ message: "Recording deleted" });
    } catch (error) {
        console.error("Error deleting recording.", error);
        res.status(500).json({ errorMessage: "Error deleting recording" });
    }
});

app.listen(SERVER_PORT, () => {
    console.log("Server started on port:", SERVER_PORT);
});
