import { Router } from "express";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from "../config.js";
import { DataPacket_Kind, RoomServiceClient } from "livekit-server-sdk";

const roomClient = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export const roomController = Router();

// Create a new room
roomController.post("/", async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "'roomName' is required" });
        return;
    }

    try {
        const roomOptions = {
            name: roomName
        };
        const room = await roomClient.createRoom(roomOptions);
        res.json({ room });
    } catch (error) {
        const errorMessage = "Error creating room";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// List rooms. If a room name is provided, only that room is listed
roomController.get("/", async (req, res) => {
    const { roomName } = req.query;

    try {
        const roomNames = roomName ? [String(roomName)] : [];
        const rooms = await roomClient.listRooms(roomNames);
        res.json({ rooms });
    } catch (error) {
        const errorMessage = "Error listing rooms";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Update room metadata
roomController.post("/:roomName/metadata", async (req, res) => {
    const { roomName } = req.params;
    const { metadata } = req.body;

    if (!metadata) {
        res.status(400).json({ errorMessage: "'metadata' is required" });
        return;
    }

    try {
        const room = await roomClient.updateRoomMetadata(roomName, metadata);
        res.json({ room });
    } catch (error) {
        const errorMessage = "Error updating room metadata";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Send data message to participants in a room
roomController.post("/:roomName/send-data", async (req, res) => {
    const { roomName } = req.params;
    const { data: rawData } = req.body;

    if (!rawData) {
        res.status(400).json({ errorMessage: "'data' is required" });
        return;
    }

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(rawData));
        const options = {
            topic: "chat",
            destinationSids: [] // Send to all participants
        };
        await roomClient.sendData(roomName, data, DataPacket_Kind.RELIABLE, options);
        res.json({ message: "Data message sent" });
    } catch (error) {
        const errorMessage = "Error sending data message";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Delete a room
roomController.delete("/:roomName", async (req, res) => {
    const { roomName } = req.params;

    try {
        await roomClient.deleteRoom(roomName);
        res.json({ message: "Room deleted" });
    } catch (error) {
        const errorMessage = "Error deleting room";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// List participants in a room
roomController.get("/:roomName/participants", async (req, res) => {
    const { roomName } = req.params;

    try {
        const participants = await roomClient.listParticipants(roomName);
        res.json({ participants });
    } catch (error) {
        const errorMessage = "Error listing participants";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Get a participant in a room
roomController.get("/:roomName/participants/:participantIdentity", async (req, res) => {
    const { roomName, participantIdentity } = req.params;

    try {
        const participant = await roomClient.getParticipant(roomName, participantIdentity);
        res.json({ participant });
    } catch (error) {
        const errorMessage = "Error getting participant";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Update a participant in a room
roomController.patch("/:roomName/participants/:participantIdentity", async (req, res) => {
    const { roomName, participantIdentity } = req.params;
    const { metadata } = req.body;

    try {
        const updateParticipantOptions = {
            metadata,
            permission: {
                canPublish: false,
                canSubscribe: true
            }
        };
        const participant = await roomClient.updateParticipant(roomName, participantIdentity, updateParticipantOptions);
        res.json({ participant });
    } catch (error) {
        const errorMessage = "Error updating participant";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Remove a participant from a room
roomController.delete("/:roomName/participants/:participantIdentity", async (req, res) => {
    const { roomName, participantIdentity } = req.params;

    try {
        await roomClient.removeParticipant(roomName, participantIdentity);
        res.json({ message: "Participant removed" });
    } catch (error) {
        const errorMessage = "Error removing participant";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Mute published track of a participant in a room
roomController.post("/:roomName/participants/:participantIdentity/mute", async (req, res) => {
    const { roomName, participantIdentity } = req.params;
    const { trackId } = req.body;

    if (!trackId) {
        res.status(400).json({ errorMessage: "'trackId' is required" });
        return;
    }

    try {
        const track = await roomClient.mutePublishedTrack(roomName, participantIdentity, trackId, true);
        res.json({ track });
    } catch (error) {
        const errorMessage = "Error muting track";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Subscribe participant to tracks in a room
roomController.post("/:roomName/participants/:participantIdentity/subscribe", async (req, res) => {
    const { roomName, participantIdentity } = req.params;
    const { trackIds } = req.body;

    if (!Array.isArray(trackIds)) {
        res.status(400).json({ errorMessage: "'trackIds' is required and must be an array" });
        return;
    }

    try {
        await roomClient.updateSubscriptions(roomName, participantIdentity, trackIds, true);
        const message = "Participant subscribed to tracks";
        res.json({ message });
    } catch (error) {
        const errorMessage = "Error subscribing participant to tracks";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Unsubscribe participant from tracks in a room
roomController.post("/:roomName/participants/:participantIdentity/unsubscribe", async (req, res) => {
    const { roomName, participantIdentity } = req.params;
    const { trackIds } = req.body;

    if (!Array.isArray(trackIds)) {
        res.status(400).json({ errorMessage: "'trackIds' is required and must be an array" });
        return;
    }

    try {
        await roomClient.updateSubscriptions(roomName, participantIdentity, trackIds, false);
        const message = "Participant unsubscribed from tracks";
        res.json({ message });
    } catch (error) {
        const errorMessage = "Error unsubscribing participant from tracks";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});
