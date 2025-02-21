import { Router } from "express";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../config.js";
import { AccessToken } from "livekit-server-sdk";

export const tokenController = Router();

tokenController.post("/", async (req, res) => {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
        res.status(400).json({ errorMessage: "'roomName' and 'participantName' are required" });
        return;
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: participantName
    });

    const grant = {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true
    };
    at.addGrant(grant);

    const token = await at.toJwt();
    res.json({ token });
});
