import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../config.js";
import { RoomService } from "../services/room.service.js";

const roomService = new RoomService();

export const roomController = Router();

roomController.post("/", async (req, res) => {
    const roomName = req.body.roomName;
    const participantName = req.body.participantName;

    if (!roomName || !participantName) {
        res.status(400).json({ errorMessage: "roomName and participantName are required" });
        return;
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: participantName
    });
    at.addGrant({ room: roomName, roomJoin: true, roomRecord: true });
    const token = await at.toJwt();

    try {
        // Create room if it doesn't exist
        const exists = await roomService.exists(roomName);

        if (!exists) {
            await roomService.createRoom(roomName);
        }

        res.json({ token });
    } catch (error) {
        console.error("Error creating room.", error);
        res.status(500).json({ errorMessage: "Error creating room" });
    }
});
