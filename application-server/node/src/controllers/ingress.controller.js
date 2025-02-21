import { Router } from "express";
import { IngressClient, IngressInput } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from "../config.js";

const ingressClient = new IngressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export const ingressController = Router();

// Create a new RTMP ingress
ingressController.post("/rtmp", async (req, res) => {
    const { roomName, participantIdentity } = req.body;

    if (!roomName || !participantIdentity) {
        res.status(400).json({ errorMessage: "'roomName' and 'participantIdentity' are required" });
        return;
    }

    try {
        const ingressOptions = {
            name: "rtmp-ingress",
            roomName,
            participantIdentity
        };
        const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, ingressOptions);
        res.json({ ingress });
    } catch (error) {
        const errorMessage = "Error creating RTMP ingress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Create a new WHIP ingress
ingressController.post("/whip", async (req, res) => {
    const { roomName, participantIdentity } = req.body;

    if (!roomName || !participantIdentity) {
        res.status(400).json({ errorMessage: "'roomName' and 'participantIdentity' are required" });
        return;
    }

    try {
        const ingressOptions = {
            name: "whip-ingress",
            roomName,
            participantIdentity
        };
        const ingress = await ingressClient.createIngress(IngressInput.WHIP_INPUT, ingressOptions);
        res.json({ ingress });
    } catch (error) {
        const errorMessage = "Error creating WHIP ingress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Create a new URL ingress
ingressController.post("/url", async (req, res) => {
    const { roomName, participantIdentity, url } = req.body;

    if (!roomName || !participantIdentity || !url) {
        res.status(400).json({ errorMessage: "'roomName', 'participantIdentity' and 'url' are required" });
        return;
    }

    try {
        const ingressOptions = {
            name: "url-ingress",
            roomName,
            participantIdentity,
            url
        };
        const ingress = await ingressClient.createIngress(IngressInput.URL_INPUT, ingressOptions);
        res.json({ ingress });
    } catch (error) {
        const errorMessage = "Error creating URL ingress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// List ingresses
// If an ingress ID is provided, only that ingress is listed
// If a room name is provided, only ingresses for that room are listed
ingressController.get("/", async (req, res) => {
    const { ingressId, roomName } = req.query;

    try {
        const options = {
            ingressId: ingressId ? String(ingressId) : undefined,
            roomName: roomName ? String(roomName) : undefined
        };
        const ingresses = await ingressClient.listIngress(options);
        res.json({ ingresses });
    } catch (error) {
        const errorMessage = "Error listing ingresses";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Update ingress
ingressController.patch("/:ingressId", async (req, res) => {
    const { ingressId } = req.params;
    const { roomName } = req.body;

    if (!roomName) {
        res.status(400).json({ errorMessage: "'roomName' is required" });
        return;
    }

    try {
        const options = {
            name: "updated-ingress",
            roomName
        };
        const ingress = await ingressClient.updateIngress(ingressId, options);
        res.json({ ingress });
    } catch (error) {
        const errorMessage = "Error updating ingress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});

// Delete ingress
ingressController.delete("/:ingressId", async (req, res) => {
    const { ingressId } = req.params;

    try {
        await ingressClient.deleteIngress(ingressId);
        res.json({ message: "Ingress deleted" });
    } catch (error) {
        const errorMessage = "Error deleting ingress";
        console.error(errorMessage, error);
        res.status(500).json({ errorMessage });
    }
});
