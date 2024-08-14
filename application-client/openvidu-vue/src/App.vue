<script setup lang="ts">
import {
    LocalVideoTrack,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Room,
    RoomEvent
} from 'livekit-client';
import { onUnmounted, ref, type Ref } from 'vue';
import VideoComponent from './components/VideoComponent.vue';
import AudioComponent from './components/AudioComponent.vue';

type TrackInfo = {
    trackPublication: RemoteTrackPublication;
    participantIdentity: string;
};

// When running OpenVidu locally, leave these variables empty
// For other deployment type, configure them with correct URLs depending on your deployment
let APPLICATION_SERVER_URL = '';
let LIVEKIT_URL = '';
configureUrls();

function configureUrls() {
    // If APPLICATION_SERVER_URL is not configured, use default value from OpenVidu Local deployment
    if (!APPLICATION_SERVER_URL) {
        if (window.location.hostname === 'localhost') {
            APPLICATION_SERVER_URL = 'http://localhost:6080/';
        } else {
            APPLICATION_SERVER_URL = 'https://' + window.location.hostname + ':6443/';
        }
    }

    // If LIVEKIT_URL is not configured, use default value from OpenVidu Local deployment
    if (!LIVEKIT_URL) {
        if (window.location.hostname === 'localhost') {
            LIVEKIT_URL = 'ws://localhost:7880/';
        } else {
            LIVEKIT_URL = 'wss://' + window.location.hostname + ':7443/';
        }
    }
}

const room = ref<Room>();
const localTrack = ref<LocalVideoTrack>();
const remoteTracksMap: Ref<Map<string, TrackInfo>> = ref(new Map());

let participantName = ref('Participant' + Math.floor(Math.random() * 100));
let roomName = ref('Test Room');

async function joinRoom() {
    // Initialize a new Room object
    room.value = new Room();

    // Specify the actions when events take place in the room
    // On every new Track received...
    room.value.on(
        RoomEvent.TrackSubscribed,
        (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            remoteTracksMap.value.set(publication.trackSid, {
                trackPublication: publication,
                participantIdentity: participant.identity
            });
        }
    );

    // On every Track destroyed...
    room.value.on(RoomEvent.TrackUnsubscribed, (_track: RemoteTrack, publication: RemoteTrackPublication) => {
        remoteTracksMap.value.delete(publication.trackSid);
    });

    try {
        // Get a token from your application server with the room name and participant name
        const token = await getToken(roomName.value, participantName.value);

        // Connect to the room with the LiveKit URL and the token
        await room.value.connect(LIVEKIT_URL, token);

        // Publish your camera and microphone
        await room.value.localParticipant.enableCameraAndMicrophone();
        localTrack.value = room.value.localParticipant.videoTrackPublications.values().next().value.videoTrack;
    } catch (error: any) {
        console.log('There was an error connecting to the room:', error.message);
        await leaveRoom();
    }

    // Add listener for beforeunload event to leave the room when the user closes the tab
    window.addEventListener('beforeunload', leaveRoom);
}

async function leaveRoom() {
    // Leave the room by calling 'disconnect' method over the Room object
    await room.value?.disconnect();

    // Empty all variables
    room.value = undefined;
    localTrack.value = undefined;
    remoteTracksMap.value.clear();

    window.removeEventListener('beforeunload', leaveRoom);
}

onUnmounted(() => {
    // On component unmount, leave the room
    leaveRoom();
});

/**
 * --------------------------------------------
 * GETTING A TOKEN FROM YOUR APPLICATION SERVER
 * --------------------------------------------
 * The method below request the creation of a token to
 * your application server. This prevents the need to expose
 * your LiveKit API key and secret to the client side.
 *
 * In this sample code, there is no user control at all. Anybody could
 * access your application server endpoints. In a real production
 * environment, your application server must identify the user to allow
 * access to the endpoints.
 */
async function getToken(roomName: string, participantName: string) {
    const response = await fetch(APPLICATION_SERVER_URL + 'token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            roomName,
            participantName
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get token: ${error.errorMessage}`);
    }

    const data = await response.json();
    return data.token;
}
</script>

<template>
    <div v-if="!room" id="join">
        <div id="join-dialog">
            <h2>Join a Video Room</h2>
            <form @submit.prevent="joinRoom">
                <div>
                    <label for="participant-name">Participant</label>
                    <input v-model="participantName" id="participant-name" class="form-control" type="text" required />
                </div>
                <div>
                    <label for="room-name">Room</label>
                    <input v-model="roomName" id="room-name" class="form-control" type="text" required />
                </div>
                <button class="btn btn-lg btn-success" type="submit" :disabled="!roomName || !participantName">
                    Join!
                </button>
            </form>
        </div>
    </div>
    <div v-else id="room">
        <div id="room-header">
            <h2 id="room-title">{{ roomName }}</h2>
            <button class="btn btn-danger" id="leave-room-button" @click="leaveRoom">Leave Room</button>
        </div>
        <div id="layout-container">
            <VideoComponent
                v-if="localTrack"
                :track="localTrack"
                :participantIdentity="participantName"
                :local="true"
            />
            <template v-for="remoteTrack of remoteTracksMap.values()" :key="remoteTrack.trackPublication.trackSid">
                <VideoComponent
                    v-if="remoteTrack.trackPublication.kind === 'video'"
                    :track="remoteTrack.trackPublication.videoTrack!"
                    :participantIdentity="remoteTrack.participantIdentity"
                />
                <AudioComponent v-else :track="remoteTrack.trackPublication.audioTrack!" hidden />
            </template>
        </div>
    </div>
</template>

<style scoped>
#join {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
}

#join-dialog {
    width: 70%;
    max-width: 900px;
    padding: 60px;
    border-radius: 6px;
    background-color: #f0f0f0;
}

#join-dialog h2 {
    color: #4d4d4d;
    font-size: 60px;
    font-weight: bold;
    text-align: center;
}

#join-dialog form {
    text-align: left;
}

#join-dialog label {
    display: block;
    margin-bottom: 10px;
    color: #0088aa;
    font-weight: bold;
    font-size: 20px;
}

.form-control {
    width: 100%;
    padding: 8px;
    margin-bottom: 10px;
    box-sizing: border-box;
    color: #0088aa;
    font-weight: bold;
}

.form-control:focus {
    color: #0088aa;
    border-color: #0088aa;
    -webkit-box-shadow:
        inset 0 1px 1px rgba(0, 0, 0, 0.075),
        0 0 8px rgba(0, 136, 170, 0.6);
    box-shadow:
        inset 0 1px 1px rgba(0, 0, 0, 0.075),
        0 0 8px rgba(0, 136, 170, 0.6);
}

#join-dialog button {
    display: block;
    margin: 20px auto 0;
}

.btn {
    font-weight: bold;
}

.btn-success {
    background-color: #06d362;
    border-color: #06d362;
}

.btn-success:hover {
    background-color: #1abd61;
    border-color: #1abd61;
}

#room {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

#room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 1000px;
    padding: 0 20px;
    margin-bottom: 20px;
}

#room-title {
    font-size: 2em;
    font-weight: bold;
    margin: 0;
}

#layout-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 10px;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 1000px;
    height: 100%;
}

/* Media Queries */
@media screen and (max-width: 768px) {
    #join-dialog {
        width: 90%;
        padding: 30px;
    }

    #join-dialog h2 {
        font-size: 50px;
    }

    #layout-container {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
}

@media screen and (max-width: 480px) {
    #join-dialog {
        width: 100%;
        padding: 20px;
    }

    #join-dialog h2 {
        font-size: 40px;
    }

    #layout-container {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
}
</style>
