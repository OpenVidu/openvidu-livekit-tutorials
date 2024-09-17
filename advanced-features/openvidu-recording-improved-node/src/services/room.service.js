import { DataPacket_Kind, RoomServiceClient } from "livekit-server-sdk";
import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, APP_NAME } from "../config.js";

const encoder = new TextEncoder();

export class RoomService {
    static instance;

    constructor() {
        if (RoomService.instance) {
            return RoomService.instance;
        }

        this.roomClient = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        RoomService.instance = this;
        return this;
    }

    async createRoom(roomName) {
        const roomOptions = {
            name: roomName,
            metadata: JSON.stringify({
                createdBy: APP_NAME,
                recordingStatus: "STOPPED"
            })
        };
        return this.roomClient.createRoom(roomOptions);
    }

    async getRoom(roomName) {
        const rooms = await this.roomClient.listRooms([roomName]);
        return rooms.length > 0 ? rooms[0] : null;
    }

    async exists(roomName) {
        const room = await this.getRoom(roomName);
        return room !== null;
    }

    async updateRoomMetadata(roomName, recordingStatus) {
        const metadata = {
            createdBy: APP_NAME,
            recordingStatus
        };
        return this.roomClient.updateRoomMetadata(roomName, JSON.stringify(metadata));
    }

    async sendDataToRoom(roomName, rawData) {
        const data = encoder.encode(JSON.stringify(rawData));
        const options = {
            topic: "RECORDING_DELETED",
            destinationSids: []
        };

        try {
            await this.roomClient.sendData(roomName, data, DataPacket_Kind.RELIABLE, options);
        } catch (error) {
            console.error("Error sending data to room", error);
        }
    }
}
