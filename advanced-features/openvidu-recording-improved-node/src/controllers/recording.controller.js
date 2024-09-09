import { Router } from "express";
import { EgressClient, EncodedFileOutput, EncodedFileType } from "livekit-server-sdk";
import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, RECORDINGS_PATH } from "../config.js";
import { S3Service } from "../services/s3.service.js";

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const s3Service = new S3Service();

export const recordingController = Router();

recordingController.post("/start", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "roomName is required" });
        return;
    }

    const activeEgresses = await getActiveEgressesByRoom(roomName);

    // Check if there is already an active egress for this room
    if (activeEgresses.length > 0) {
        res.status(409).json({ errorMessage: "Recording already started for this room" });
        return;
    }

    // Use the EncodedFileOutput to save the recording to an MP4 file
    const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `${RECORDINGS_PATH}{room_name}-{room_id}-{time}`,
        disableManifest: true
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

recordingController.post("/stop", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "roomName is required" });
        return;
    }

    const activeEgresses = await getActiveEgressesByRoom(roomName);

    // Check if there is an active egress for this room
    if (activeEgresses.length === 0) {
        res.status(409).json({ errorMessage: "Recording not started for this room" });
        return;
    }

    const egressId = activeEgresses[0].egressId;

    try {
        // Stop the Egress to finish the recording
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

recordingController.get("/", async (req, res) => {
    const roomName = req.query.roomName?.toString();
    const roomId = req.query.roomId?.toString();

    try {
        const keyStart =
            RECORDINGS_PATH + ".metadata/" + (roomName ? `${roomName}` + (roomId ? `-${roomId}` : "") : "");
        const keyEnd = ".json";
        const regex = new RegExp(`^${keyStart}.*${keyEnd}$`);

        // List all Egress metadata files in the recordings path that match the regex
        const metadataKeys = await s3Service.listObjects(RECORDINGS_PATH + ".metadata/", regex);
        const recordings = await Promise.all(metadataKeys.map((metadataKey) => s3Service.getObjectAsJson(metadataKey)));
        res.json({ recordings });
    } catch (error) {
        console.error("Error listing recordings.", error);
        res.status(500).json({ errorMessage: "Error listing recordings" });
    }
});

recordingController.get("/:recordingName", async (req, res) => {
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

recordingController.delete("/:recordingName", async (req, res) => {
    const { recordingName } = req.params;
    const recordingKey = RECORDINGS_PATH + recordingName;
    const metadataKey = RECORDINGS_PATH + ".metadata/" + recordingName.replace(".mp4", ".json");
    const exists = await s3Service.exists(recordingKey);

    if (!exists) {
        res.status(404).json({ errorMessage: "Recording not found" });
        return;
    }

    try {
        // Delete the recording file and metadata file from S3
        await Promise.all([s3Service.deleteObject(recordingKey), s3Service.deleteObject(metadataKey)]);
        res.json({ message: "Recording deleted" });
    } catch (error) {
        console.error("Error deleting recording.", error);
        res.status(500).json({ errorMessage: "Error deleting recording" });
    }
});

const getActiveEgressesByRoom = async (roomName) => {
    try {
        // List all active egresses for the room
        return await egressClient.listEgress({ roomName, active: true });
    } catch (error) {
        console.error("Error listing egresses.", error);
        return [];
    }
};
