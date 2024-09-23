import { EgressClient, EgressStatus, EncodedFileOutput, EncodedFileType } from "livekit-server-sdk";
import {
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    RECORDINGS_PATH,
    RECORDINGS_METADATA_PATH,
    RECORDING_FILE_PORTION_SIZE
} from "../config.js";
import { S3Service } from "./s3.service.js";

const s3Service = new S3Service();

export class RecordingService {
    static instance;

    constructor() {
        if (RecordingService.instance) {
            return RecordingService.instance;
        }

        this.egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        RecordingService.instance = this;
        return this;
    }

    async startRecording(roomName) {
        // Use the EncodedFileOutput to save the recording to an MP4 file
        const fileOutput = new EncodedFileOutput({
            fileType: EncodedFileType.MP4,
            filepath: `${RECORDINGS_PATH}{room_name}-{room_id}-{time}`,
            disableManifest: true
        });
        // Start a RoomCompositeEgress to record all participants in the room
        const egressInfo = await this.egressClient.startRoomCompositeEgress(roomName, { file: fileOutput });
        return this.convertToRecordingInfo(egressInfo);
    }

    async stopRecording(recordingId) {
        // Stop the egress to finish the recording
        const egressInfo = await this.egressClient.stopEgress(recordingId);
        return this.convertToRecordingInfo(egressInfo);
    }

    async listRecordings(roomName, roomId) {
        const keyStart =
            RECORDINGS_PATH + RECORDINGS_METADATA_PATH + (roomName ? `${roomName}-` + (roomId ? roomId : "") : "");
        const keyEnd = ".json";
        const regex = new RegExp(`^${keyStart}.*${keyEnd}$`);

        // List all egress metadata files in the recordings path that match the regex
        const metadataKeys = await s3Service.listObjects(RECORDINGS_PATH + RECORDINGS_METADATA_PATH, regex);
        const recordings = await Promise.all(metadataKeys.map((metadataKey) => s3Service.getObjectAsJson(metadataKey)));
        return this.filterAndSortRecordings(recordings, roomName, roomId);
    }

    filterAndSortRecordings(recordings, roomName, roomId) {
        let filteredRecordings = recordings;

        if (roomName || roomId) {
            filteredRecordings = recordings.filter((recording) => {
                return (!roomName || recording.roomName === roomName) && (!roomId || recording.roomId === roomId);
            });
        }

        return filteredRecordings.sort((a, b) => b.startedAt - a.startedAt);
    }

    async getActiveRecordingByRoom(roomName) {
        try {
            // List all active egresses for the room
            const egresses = await this.egressClient.listEgress({ roomName, active: true });
            return egresses.length > 0 ? egresses[0].egressId : null;
        } catch (error) {
            console.error("Error listing egresses.", error);
            return null;
        }
    }

    async getRecordingMetadata(recordingName) {
        const key = this.getMetadataKey(recordingName);
        return s3Service.getObjectAsJson(key);
    }

    async getRecordingStream(recordingName, range) {
        const key = this.getRecordingKey(recordingName);
        const size = await s3Service.getObjectSize(key);

        // Get the requested range
        const parts = range?.replace(/bytes=/, "").split("-");
        const start = range ? parseInt(parts[0], 10) : 0;
        const endRange = parts[1] ? parseInt(parts[1], 10) : start + RECORDING_FILE_PORTION_SIZE;
        const end = Math.min(endRange, size - 1);

        const stream = await s3Service.getObject(key, { start, end });
        return { stream, size, start, end };
    }

    async getRecordingUrl(recordingName) {
        const key = this.getRecordingKey(recordingName);
        return s3Service.getObjectUrl(key);
    }

    async existsRecording(recordingName) {
        const key = this.getRecordingKey(recordingName);
        return s3Service.exists(key);
    }

    async deleteRecording(recordingName) {
        const recordingKey = this.getRecordingKey(recordingName);
        const metadataKey = this.getMetadataKey(recordingName);
        // Delete the recording file and metadata file from S3
        await Promise.all([s3Service.deleteObject(recordingKey), s3Service.deleteObject(metadataKey)]);
    }

    async saveRecordingMetadata(egressInfo) {
        const recordingInfo = this.convertToRecordingInfo(egressInfo);
        const key = this.getMetadataKey(recordingInfo.name);
        await s3Service.uploadObject(key, recordingInfo);
    }

    convertToRecordingInfo(egressInfo) {
        const file = egressInfo.fileResults[0];
        return {
            id: egressInfo.egressId,
            name: file.filename.split("/").pop(),
            roomName: egressInfo.roomName,
            roomId: egressInfo.roomId,
            startedAt: Number(egressInfo.startedAt) / 1_000_000,
            duration: Number(file.duration) / 1_000_000_000,
            size: Number(file.size)
        };
    }

    getRecordingStatus(egressStatus) {
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
    }

    getRecordingKey(recordingName) {
        return RECORDINGS_PATH + recordingName;
    }

    getMetadataKey(recordingName) {
        return RECORDINGS_PATH + RECORDINGS_METADATA_PATH + recordingName.replace(".mp4", ".json");
    }
}
