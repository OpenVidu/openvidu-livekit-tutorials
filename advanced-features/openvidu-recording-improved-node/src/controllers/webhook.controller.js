import express, { Router } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, APP_NAME } from "../config.js";
import { RoomService } from "../services/room.service.js";
import { RecordingService } from "../services/recording.service.js";

const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const roomService = new RoomService();
const recordingService = new RecordingService();

export const webhookController = Router();
webhookController.use(express.raw({ type: "application/webhook+json" }));

webhookController.post("/", async (req, res) => {
    try {
        const webhookEvent = await webhookReceiver.receive(req.body, req.get("Authorization"));
        const isWebhookRelatedToMe = await checkWebhookRelatedToMe(webhookEvent);

        if (isWebhookRelatedToMe) {
            console.log(webhookEvent);
            const { event: eventType, egressInfo } = webhookEvent;

            switch (eventType) {
                case "egress_started":
                case "egress_updated":
                    await notifyRecordingStatusUpdate(egressInfo);
                    break;
                case "egress_ended":
                    await handleEgressEnded(egressInfo);
                    break;
            }
        }
    } catch (error) {
        console.error("Error validating webhook event.", error);
    }

    res.status(200).send();
});

const checkWebhookRelatedToMe = async (webhookEvent) => {
    const { room, egressInfo, ingressInfo } = webhookEvent;
    let roomInfo = room;

    if (!room || !room.metadata) {
        const roomName = room?.name ?? egressInfo?.roomName ?? ingressInfo?.roomName;
        roomInfo = await roomService.getRoom(roomName);

        if (!roomInfo) {
            return false;
        }
    }

    const metadata = roomInfo.metadata ? JSON.parse(roomInfo.metadata) : null;
    return metadata?.createdBy === APP_NAME;
};

const handleEgressEnded = async (egressInfo) => {
    try {
        await recordingService.saveRecordingMetadata(egressInfo);
    } catch (error) {
        console.error("Error saving recording metadata.", error);
    }

    await notifyRecordingStatusUpdate(egressInfo);
};

const notifyRecordingStatusUpdate = async (egressInfo) => {
    const roomName = egressInfo.roomName;
    const recordingStatus = recordingService.getRecordingStatus(egressInfo.status);

    try {
        await roomService.updateRoomMetadata(roomName, recordingStatus);
    } catch (error) {
        console.error("Error updating room metadata.", error);
    }
};
