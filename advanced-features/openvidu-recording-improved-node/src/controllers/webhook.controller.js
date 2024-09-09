import express, { Router } from "express";
import { EgressStatus, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";
import {
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    APP_NAME,
    RECORDINGS_PATH,
    RECORDINGS_METADATA_PATH
} from "../config.js";
import { S3Service } from "../services/s3.service.js";

const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const s3Service = new S3Service();
const roomClient = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

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
                    await handleEgressUpdated(egressInfo);
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
        const rooms = await roomClient.listRooms([roomName]);

        if (rooms.length === 0) {
            return false;
        }

        roomInfo = rooms[0];
    }

    const metadata = roomInfo.metadata ? JSON.parse(roomInfo.metadata) : null;
    return metadata?.createdBy === APP_NAME;
};

const handleEgressUpdated = async (egressInfo) => {
    await updateRecordingStatus(egressInfo);
};

const handleEgressEnded = async (egressInfo) => {
    const recordingInfo = convertToRecordingInfo(egressInfo);
    const metadataName = recordingInfo.name.replace(".mp4", ".json");
    const key = RECORDINGS_PATH + RECORDINGS_METADATA_PATH + metadataName;
    await s3Service.uploadObject(key, recordingInfo);

    await updateRecordingStatus(egressInfo);
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

const updateRecordingStatus = async (egressInfo) => {
    const roomName = egressInfo.roomName;
    const recordingStatus = getRecordingStatus(egressInfo.status);
    await roomClient.updateRoomMetadata(
        roomName,
        JSON.stringify({
            createdBy: APP_NAME,
            recordingStatus
        })
    );
};

const getRecordingStatus = (egressStatus) => {
    switch (egressStatus) {
        case EgressStatus.EGRESS_STARTING:
            return "STARTING";
        case EgressStatus.EGRESS_ACTIVE:
            return "STARTED";
        case EgressStatus.EGRESS_ENDING:
            return "STOPPING";
        case EgressStatus.EGRESS_COMPLETE:
            return "STOPPED";
        default:
            return "FAILED";
    }
};
