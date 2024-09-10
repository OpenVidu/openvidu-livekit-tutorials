import { RoomServiceClient } from "livekit-server-sdk";
import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, APP_NAME } from "../config.js";

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

    async updateRoomMetadata(roomName, recordingStatus) {
        const metadata = {
            createdBy: APP_NAME,
            recordingStatus
        };
        return this.roomClient.updateRoomMetadata(roomName, JSON.stringify(metadata));
    }
}
