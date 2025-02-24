import e, { Router } from "express";
import {
    DirectFileOutput,
    EgressClient,
    EncodedFileOutput,
    EncodedFileType,
    StreamOutput,
    StreamProtocol
} from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from "../config.js";

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export const egressController = Router();

// Create a new RoomComposite egress
egressController.post("/room-composite", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "'roomName' is required" });
        return;
    }

    try {
        const outputs = {
            file: new EncodedFileOutput({
                fileType: EncodedFileType.MP4,
                filepath: "{room_name}-{room_id}-{time}"
            })
        };
        const options = {
            layout: "grid"
        };
        const egress = await egressClient.startRoomCompositeEgress(roomName, outputs, options);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error creating RoomComposite egress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Create a new RoomComposite egress to stream to a URL
egressController.post("/stream", async (req, res) => {
    const { roomName, streamUrl } = req.body;

    if (!roomName || !streamUrl) {
        res.status(400).json({ errorMessage: "'roomName' and 'streamUrl' are required" });
        return;
    }

    try {
        const outputs = {
            stream: new StreamOutput({
                protocol: StreamProtocol.RTMP,
                urls: [streamUrl]
            })
        };
        const egress = await egressClient.startRoomCompositeEgress(roomName, outputs);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error creating RoomComposite egress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Create a new Participant egress
egressController.post("/participant", async (req, res) => {
    const { roomName, participantIdentity } = req.body;

    if (!roomName || !participantIdentity) {
        res.status(400).json({ errorMessage: "'roomName' and 'participantIdentity' are required" });
        return;
    }

    try {
        const outputs = {
            file: new EncodedFileOutput({
                fileType: EncodedFileType.MP4,
                filepath: "{room_name}-{room_id}-{publisher_identity}-{time}"
            })
        };
        const options = {
            screenShare: false
        };
        const egress = await egressClient.startParticipantEgress(roomName, participantIdentity, outputs, options);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error creating Participant egress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Create a new TrackComposite egress
egressController.post("/track-composite", async (req, res) => {
    const { roomName, videoTrackId, audioTrackId } = req.body;

    if (!roomName || !videoTrackId || !audioTrackId) {
        res.status(400).json({ errorMessage: "'roomName', 'videoTrackId' and 'audioTrackId' are required" });
        return;
    }

    try {
        const outputs = {
            file: new EncodedFileOutput({
                fileType: EncodedFileType.MP4,
                filepath: "{room_name}-{room_id}-{publisher_identity}-{time}"
            })
        };
        const options = {
            videoTrackId,
            audioTrackId
        };
        const egress = await egressClient.startTrackCompositeEgress(roomName, outputs, options);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error creating TrackComposite egress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Create a new Track egress
egressController.post("/track", async (req, res) => {
    const { roomName, trackId } = req.body;

    if (!roomName || !trackId) {
        res.status(400).json({ errorMessage: "'roomName' and 'trackId' are required" });
        return;
    }

    try {
        const output = new DirectFileOutput({
            filepath: "{room_name}-{room_id}-{publisher_identity}-{track_source}-{track_id}-{time}"
        });
        const egress = await egressClient.startTrackEgress(roomName, output, trackId);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error creating Track egress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Create a new Web egress
egressController.post("/web", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        res.status(400).json({ errorMessage: "'url' is required" });
        return;
    }

    try {
        const outputs = {
            file: new EncodedFileOutput({
                fileType: EncodedFileType.MP4,
                filepath: "{time}"
            })
        };
        const egress = await egressClient.startWebEgress(url, outputs);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error creating Web egress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// List egresses
// If an egress ID is provided, only that egress is listed
// If a room name is provided, only egresses for that room are listed
// If active is true, only active egresses are listed
egressController.get("/", async (req, res) => {
    const { egressId, roomName, active } = req.query;

    try {
        const options = {
            egressId: egressId ? String(egressId) : undefined,
            roomName: roomName ? String(roomName) : undefined,
            active: active ? active === "true" : undefined
        };
        const egresses = await egressClient.listEgress(options);
        res.json({ egresses });
    } catch (error) {
        const errorMessage = "Error listing egresses";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Update egress layout
egressController.post("/:egressId/layout", async (req, res) => {
    const { egressId } = req.params;
    const { layout } = req.body;

    if (!layout) {
        res.status(400).json({ errorMessage: "'layout' is required" });
        return;
    }

    try {
        const egress = await egressClient.updateLayout(egressId, layout);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error updating egress layout";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Add/remove stream URLs to an egress
egressController.post("/:egressId/streams", async (req, res) => {
    const { egressId } = req.params;
    const { streamUrlsToAdd, streamUrlsToRemove } = req.body;

    if (!Array.isArray(streamUrlsToAdd) || !Array.isArray(streamUrlsToRemove)) {
        res.status(400).json({ errorMessage: "'streamUrlsToAdd' and 'streamUrlsToRemove' are required and must be arrays" });
        return;
    }

    try {
        const egress = await egressClient.updateStream(egressId, streamUrlsToAdd, streamUrlsToRemove);
        res.json({ egress });
    } catch (error) {
        const errorMessage = "Error updating egress streams";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Stop an egress
egressController.delete("/:egressId", async (req, res) => {
    const { egressId } = req.params;

    try {
        await egressClient.stopEgress(egressId);
        res.json({ message: "Egress stopped" });
    } catch (error) {
        const errorMessage = "Error stopping egress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});
