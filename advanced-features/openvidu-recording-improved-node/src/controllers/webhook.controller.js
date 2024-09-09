import express, { Router } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../config.js";

const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export const webhookController = Router();
webhookController.use(express.raw({ type: "application/webhook+json" }));

webhookController.post("/", async (req, res) => {
    try {
        const event = await webhookReceiver.receive(req.body, req.get("Authorization"));
        console.log(event);
    } catch (error) {
        console.error("Error validating webhook event.", error);
    }
    
    res.status(200).send();
});