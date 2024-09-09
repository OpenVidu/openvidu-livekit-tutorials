import express, { Router } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../config.js";
import { S3Service } from "../services/s3.service.js";

const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const s3Service = new S3Service();

export const webhookController = Router();
webhookController.use(express.raw({ type: "application/webhook+json" }));

webhookController.post("/", async (req, res) => {
    try {
        const event = await webhookReceiver.receive(req.body, req.get("Authorization"));
        console.log(event);

        switch (event.event) {
            case "egress_started":
            case "egress_updated":
                await handleEgressUpdated(event.egressInfo);
                break;
            case "egress_ended":
                await handleEgressEnded(event.egressInfo);
                break;
        }
    } catch (error) {
        console.error("Error validating webhook event.", error);
    }

    res.status(200).send();
});

const handleEgressUpdated = async (egressInfo) => {
    
};

const handleEgressEnded = async (egressInfo) => {
    const recordingInfo = convertToRecordingInfo(egressInfo);
    const metadataName = recordingInfo.name.replace(".mp4", ".json");
    const key = `recordings/.metadata/${metadataName}`;
    await s3Service.uploadObject(key, recordingInfo);
};

const convertToRecordingInfo = (egressInfo) => {
    const file = egressInfo.fileResults[0];
    return {
        name: file.filename.split("/").pop(),
        startedAt: Number(egressInfo.startedAt) / 1_000_000,
        duration: Number(file.duration) / 1_000_000_000,
        size: Number(file.size)
    };
};
