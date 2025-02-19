import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  WebhookReceiver,
} from "livekit-server-sdk";
import { S3Service } from "./s3.service.js";

// Configuration
const SERVER_PORT = process.env.SERVER_PORT || 6080;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "http://localhost:7880";
const RECORDINGS_PATH = process.env.RECORDINGS_PATH ?? "recordings/";
const RECORDING_FILE_PORTION_SIZE = 5 * 1024 * 1024; // 5MB

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/webhook+json" }));

// Set the static files location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

const egressClient = new EgressClient(
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);
const s3Service = new S3Service();
const webhookReceiver = new WebhookReceiver(
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

// Generate access tokens for participants to join a room
app.post("/token", async (req, res) => {
  const roomName = req.body.roomName;
  const participantName = req.body.participantName;

  if (!roomName || !participantName) {
    return res
      .status(400)
      .json({ errorMessage: "roomName and participantName are required" });
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
  });
  at.addGrant({ roomJoin: true, room: roomName, roomRecord: true });
  const token = await at.toJwt();

  return res.json({ token });
});

// Receive webhooks from LiveKit Server
app.post("/livekit/webhook", async (req, res) => {
  try {
    const event = await webhookReceiver.receive(
      req.body,
      req.get("Authorization")
    );
    console.log(event);
  } catch (error) {
    console.error("Error validating webhook event.", error);
  }
  return res.status(200).send();
});

// Start a recording
app.post("/recordings/start", async (req, res) => {
  const { roomName } = req.body;

  if (!roomName) {
    return res.status(400).json({ errorMessage: "roomName is required" });
  }

  const activeRecording = await getActiveRecordingByRoom(roomName);

  // Check if there is already an active recording for this room
  if (activeRecording) {
    return res
      .status(409)
      .json({ errorMessage: "Recording already started for this room" });
  }

  // Use the EncodedFileOutput to save the recording to an MP4 file
  // The room name, time and room ID in the file path help to organize the recordings
  const fileOutput = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: `${RECORDINGS_PATH}/{room_name}-{time}-{room_id}`,
    disableManifest: true,
  });

  try {
    // Start a RoomCompositeEgress to record all participants in the room
    const egressInfo = await egressClient.startRoomCompositeEgress(roomName, {
      file: fileOutput,
    });
    const recording = {
      name: egressInfo.fileResults[0].filename.split("/").pop(),
      startedAt: Number(egressInfo.startedAt) / 1_000_000,
    };
    res.json({ message: "Recording started", recording });
  } catch (error) {
    console.error("Error starting recording.", error);
    res.status(500).json({ errorMessage: "Error starting recording" });
  }
});

// Stop a recording
app.post("/recordings/stop", async (req, res) => {
  const { roomName } = req.body;

  if (!roomName) {
    return res.status(400).json({ errorMessage: "roomName is required" });
  }

  const activeRecording = await getActiveRecordingByRoom(roomName);

  // Check if there is an active recording for this room
  if (!activeRecording) {
    return res
      .status(409)
      .json({ errorMessage: "Recording not started for this room" });
  }

  try {
    // Stop the egress to finish the recording
    const egressInfo = await egressClient.stopEgress(activeRecording);
    const file = egressInfo.fileResults[0];
    const recording = {
      name: file.filename.split("/").pop(),
    };
    return res.json({ message: "Recording stopped", recording });
  } catch (error) {
    console.error("Error stopping recording.", error);
    return res.status(500).json({ errorMessage: "Error stopping recording" });
  }
});

// List recordings
app.get("/recordings", async (req, res) => {
  const roomId = req.query.roomId?.toString();
  try {
    const awsResponse = await s3Service.listObjects(RECORDINGS_PATH);
    let recordings = [];
    if (awsResponse.Contents) {
      recordings = awsResponse.Contents.map((recording) => {
        return {
          name: recording.Key.split("/").pop(),
        };
      });
    }
    // Filter recordings by room ID
    recordings = recordings.filter((recording) =>
      roomId ? recording.name.includes(roomId) : true
    );
    return res.json({ recordings });
  } catch (error) {
    console.error("Error listing recordings.", error);
    return res.status(500).json({ errorMessage: "Error listing recordings" });
  }
});

// Play a recording
app.get("/recordings/:recordingName", async (req, res) => {
  const { recordingName } = req.params;
  const { range } = req.headers;
  const key = RECORDINGS_PATH + recordingName;
  const exists = await s3Service.exists(key);

  if (!exists) {
    return res.status(404).json({ errorMessage: "Recording not found" });
  }

  try {
    // Get the recording file from S3
    const { stream, size, start, end } = await getRecordingStream(
      recordingName,
      range
    );

    // Set response headers
    res.status(206);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", end - start + 1);

    // Pipe the recording file to the response
    stream.pipe(res).on("finish", () => res.end());
  } catch (error) {
    console.error("Error getting recording.", error);
    return res.status(500).json({ errorMessage: "Error getting recording" });
  }
});

// Delete a recording
app.delete("/recordings/:recordingName", async (req, res) => {
  const { recordingName } = req.params;
  const key = RECORDINGS_PATH + recordingName;
  const exists = await s3Service.exists(key);

  if (!exists) {
    return res.status(404).json({ errorMessage: "Recording not found" });
  }

  try {
    // Delete the recording file from S3
    await Promise.all([s3Service.deleteObject(key)]);
    res.json({ message: "Recording deleted" });
  } catch (error) {
    console.error("Error deleting recording.", error);
    res.status(500).json({ errorMessage: "Error deleting recording" });
  }
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log("Server started on port:", SERVER_PORT);
});

// Helper functions

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

const getRecordingStream = async (recordingName, range) => {
  const key = RECORDINGS_PATH + recordingName;
  const size = await s3Service.getObjectSize(key);

  // Get the requested range
  const parts = range?.replace(/bytes=/, "").split("-");
  const start = range ? parseInt(parts[0], 10) : 0;
  const endRange = parts[1]
    ? parseInt(parts[1], 10)
    : start + RECORDING_FILE_PORTION_SIZE;
  const end = Math.min(endRange, size - 1);

  const stream = await s3Service.getObject(key, { start, end });
  return { stream, size, start, end };
};
