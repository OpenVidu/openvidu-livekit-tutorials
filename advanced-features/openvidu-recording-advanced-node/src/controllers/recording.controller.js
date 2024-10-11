import { Router } from "express";
import { RecordingService } from "../services/recording.service.js";
import { RoomService } from "../services/room.service.js";
import { RECORDING_PLAYBACK_STRATEGY } from "../config.js";

const recordingService = new RecordingService();
const roomService = new RoomService();

export const recordingController = Router();

recordingController.post("/start", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "roomName is required" });
        return;
    }

    const activeRecording = await recordingService.getActiveRecordingByRoom(roomName);

    // Check if there is already an active recording for this room
    if (activeRecording) {
        res.status(409).json({ errorMessage: "Recording already started for this room" });
        return;
    }

    try {
        const recording = recordingService.startRecording(roomName);
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

    const activeRecording = await recordingService.getActiveRecordingByRoom(roomName);

    // Check if there is an active recording for this room
    if (!activeRecording) {
        res.status(409).json({ errorMessage: "Recording not started for this room" });
        return;
    }

    try {
        const recording = await recordingService.stopRecording(activeRecording);
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
        const recordings = await recordingService.listRecordings(roomName, roomId);
        res.json({ recordings });
    } catch (error) {
        console.error("Error listing recordings.", error);
        res.status(500).json({ errorMessage: "Error listing recordings" });
    }
});

recordingController.get("/:recordingName", async (req, res) => {
    const { recordingName } = req.params;
    const { range } = req.headers;
    const exists = await recordingService.existsRecording(recordingName);

    if (!exists) {
        res.status(404).json({ errorMessage: "Recording not found" });
        return;
    }

    try {
        // Get the recording file from S3
        const { stream, size, start, end } = await recordingService.getRecordingStream(recordingName, range);

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
        res.status(500).json({ errorMessage: "Error getting recording" });
    }
});

recordingController.get("/:recordingName/url", async (req, res) => {
    const { recordingName } = req.params;
    const exists = await recordingService.existsRecording(recordingName);

    if (!exists) {
        res.status(404).json({ errorMessage: "Recording not found" });
        return;
    }

    // If the recording playback strategy is "PROXY", return the endpoint URL
    if (RECORDING_PLAYBACK_STRATEGY === "PROXY") {
        res.json({ recordingUrl: `/recordings/${recordingName}` });
        return;
    }

    try {
        // If the recording playback strategy is "S3", return a signed URL to access the recording directly from S3
        const recordingUrl = await recordingService.getRecordingUrl(recordingName);
        res.json({ recordingUrl });
    } catch (error) {
        console.error("Error getting recording URL.", error);
        res.status(500).json({ errorMessage: "Error getting recording URL" });
    }
});

recordingController.delete("/:recordingName", async (req, res) => {
    const { recordingName } = req.params;
    const exists = await recordingService.existsRecording(recordingName);

    if (!exists) {
        res.status(404).json({ errorMessage: "Recording not found" });
        return;
    }

    try {
        const { roomName } = await recordingService.getRecordingMetadata(recordingName);
        await recordingService.deleteRecording(recordingName);

        // Notify to all participants that the recording was deleted
        const existsRoom = await roomService.exists(roomName);

        if (existsRoom) {
            await roomService.sendDataToRoom(roomName, { recordingName });
        }

        res.json({ message: "Recording deleted" });
    } catch (error) {
        console.error("Error deleting recording.", error);
        res.status(500).json({ errorMessage: "Error deleting recording" });
    }
});
