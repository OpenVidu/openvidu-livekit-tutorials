// When running OpenVidu locally, leave this variable empty
// For other deployment type, configure it with correct URL depending on your deployment
var LIVEKIT_URL = "";
configureLiveKitUrl();

const LivekitClient = window.LivekitClient;
var room;

function configureLiveKitUrl() {
    // If LIVEKIT_URL is not configured, use default value from OpenVidu Local deployment
    if (!LIVEKIT_URL) {
        if (window.location.hostname === "localhost") {
            LIVEKIT_URL = "ws://localhost:7880/";
        } else {
            LIVEKIT_URL = "wss://" + window.location.hostname + ":7443/";
        }
    }
}

async function joinRoom() {
    // Disable 'Join' button
    document.getElementById("join-button").disabled = true;
    document.getElementById("join-button").innerText = "Joining...";

    // Initialize a new Room object
    room = new LivekitClient.Room();

    // Specify the actions when events take place in the room
    // On every new Track received...
    room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        addTrack(track, participant.identity);
    });

    // On every new Track destroyed...
    room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
        track.detach();
        document.getElementById(track.sid)?.remove();

        if (track.kind === "video") {
            removeVideoContainer(participant.identity);
        }
    });

    // When recording status changes...
    room.on(LivekitClient.RoomEvent.RoomMetadataChanged, async (metadata) => {
        const { recordingStatus } = JSON.parse(metadata);
        await updateRecordingInfo(recordingStatus);
    });

    // When a message is received...
    room.on(LivekitClient.RoomEvent.DataReceived, async (payload, _participant, _kind, topic) => {
        // If the message is a recording deletion notification, remove the recording from the list
        if (topic === "RECORDING_DELETED") {
            const { recordingName } = JSON.parse(new TextDecoder().decode(payload));
            deleteRecordingContainer(recordingName);
        }
    });

    try {
        // Get the room name and participant name from the form
        const roomName = document.getElementById("room-name").value;
        const userName = document.getElementById("participant-name").value;

        // Get a token from your application server with the room name and participant name
        const token = await getToken(roomName, userName);

        // Connect to the room with the LiveKit URL and the token
        await room.connect(LIVEKIT_URL, token);

        // Hide the 'Join room' page and show the 'Room' page
        document.getElementById("room-title").innerText = roomName;
        document.getElementById("join").hidden = true;
        document.getElementById("room").hidden = false;

        // Publish your camera and microphone
        await room.localParticipant.enableCameraAndMicrophone();
        const localVideoTrack = this.room.localParticipant.videoTrackPublications.values().next().value.track;
        addTrack(localVideoTrack, userName, true);

        // Update recording info
        const { recordingStatus } = JSON.parse(room.metadata);
        await updateRecordingInfo(recordingStatus);

        if (recordingStatus !== "STOPPED" && recordingStatus !== "FAILED") {
            const roomId = await room.getSid();
            await listRecordings(room.name, roomId);
        }
    } catch (error) {
        console.log("There was an error connecting to the room:", error.message);
        await leaveRoom();
    }
}

function addTrack(track, participantIdentity, local = false) {
    const element = track.attach();
    element.id = track.sid;

    /* If the track is a video track, we create a container and append the video element to it 
    with the participant's identity */
    if (track.kind === "video") {
        const videoContainer = createVideoContainer(participantIdentity, local);
        videoContainer.append(element);
        appendParticipantData(videoContainer, participantIdentity + (local ? " (You)" : ""));
    } else {
        document.getElementById("layout-container").append(element);
    }
}

async function leaveRoom() {
    // Leave the room by calling 'disconnect' method over the Room object
    await room.disconnect();

    // Remove all HTML elements inside the layout container
    removeAllLayoutElements();

    // Remove all recordings from the list
    removeAllRecordings();

    // Reset recording state
    document.getElementById("recording-button").disabled = false;
    document.getElementById("recording-button").innerText = "Start Recording";
    document.getElementById("recording-button").className = "btn btn-primary";
    document.getElementById("recording-text").hidden = true;

    // Back to 'Join room' page
    document.getElementById("join").hidden = false;
    document.getElementById("room").hidden = true;

    // Enable 'Join' button
    document.getElementById("join-button").disabled = false;
    document.getElementById("join-button").innerText = "Join!";
}

window.onbeforeunload = () => {
    room?.disconnect();
};

document.addEventListener("DOMContentLoaded", async function () {
    var currentPage = window.location.pathname;

    if (currentPage === "/recordings.html") {
        await listRecordings();
    } else {
        generateFormValues();
    }

    // Remove recording video when the dialog is closed
    document.getElementById("recording-video-dialog").addEventListener("close", () => {
        const recordingVideo = document.getElementById("recording-video");
        recordingVideo.src = "";
    });
});

function generateFormValues() {
    document.getElementById("room-name").value = "Test Room";
    document.getElementById("participant-name").value = "Participant" + Math.floor(Math.random() * 100);
}

function createVideoContainer(participantIdentity, local = false) {
    const videoContainer = document.createElement("div");
    videoContainer.id = `camera-${participantIdentity}`;
    videoContainer.className = "video-container";
    const layoutContainer = document.getElementById("layout-container");

    if (local) {
        layoutContainer.prepend(videoContainer);
    } else {
        layoutContainer.append(videoContainer);
    }

    return videoContainer;
}

function appendParticipantData(videoContainer, participantIdentity) {
    const dataElement = document.createElement("div");
    dataElement.className = "participant-data";
    dataElement.innerHTML = `<p>${participantIdentity}</p>`;
    videoContainer.prepend(dataElement);
}

function removeVideoContainer(participantIdentity) {
    const videoContainer = document.getElementById(`camera-${participantIdentity}`);
    videoContainer?.remove();
}

function removeAllLayoutElements() {
    const layoutElements = document.getElementById("layout-container").children;
    Array.from(layoutElements).forEach((element) => {
        element.remove();
    });
}

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
async function getToken(roomName, participantName) {
    const [error, body] = await httpRequest("POST", "/token", {
        roomName,
        participantName
    });

    if (error) {
        throw new Error(`Failed to get token: ${error.message}`);
    }

    return body.token;
}

async function updateRecordingInfo(recordingStatus) {
    const recordingButton = document.getElementById("recording-button");
    const recordingText = document.getElementById("recording-text");

    switch (recordingStatus) {
        case "STARTING":
            recordingButton.disabled = true;
            recordingButton.innerText = "Starting...";
            break;
        case "STARTED":
            recordingButton.disabled = false;
            recordingButton.innerText = "Stop Recording";
            recordingButton.className = "btn btn-danger";
            recordingText.hidden = false;
            break;
        case "STOPPING":
            recordingButton.disabled = true;
            recordingButton.innerText = "Stopping...";
            recordingButton.className = "btn btn-danger";
            recordingText.hidden = false;
            break;
        case "STOPPED":
        case "FAILED":
            recordingButton.disabled = false;
            recordingButton.innerText = "Start Recording";
            recordingButton.className = "btn btn-primary";
            recordingText.hidden = true;

            const roomId = await room.getSid();
            await listRecordings(room.name, roomId);
            break;
    }
}

async function manageRecording() {
    const recordingButton = document.getElementById("recording-button");

    if (recordingButton.innerText === "Start Recording") {
        await startRecording();
    } else {
        await stopRecording();
    }
}

async function startRecording() {
    return httpRequest("POST", "/recordings/start", {
        roomName: room.name
    });
}

async function stopRecording() {
    return httpRequest("POST", "/recordings/stop", {
        roomName: room.name
    });
}

async function deleteRecording(recordingName) {
    const [error, _] = await httpRequest("DELETE", `/recordings/${recordingName}`);

    if (!error || error.status === 404) {
        deleteRecordingContainer(recordingName);
    }
}

function deleteRecordingContainer(recordingName) {
    const recordingContainer = document.getElementById(recordingName);

    if (recordingContainer) {
        recordingContainer.remove();

        const recordingsList = document.getElementById("recording-list");

        if (recordingsList.children.length === 0) {
            recordingsList.innerHTML = "<span>There are no recordings available</span>";
        }
    }
}

async function listRecordings(roomName, roomId) {
    const url = "/recordings" + (roomName ? `?roomName=${roomName}` + (roomId ? `&roomId=${roomId}` : "") : "");
    const [error, body] = await httpRequest("GET", url);

    if (!error) {
        const recordings = body.recordings;
        showRecordingList(recordings);
    }
}

async function listRecordingsByRoom() {
    const roomName = document.getElementById("room-name").value;
    await listRecordings(roomName);
}

async function getRecordingUrl(recordingName) {
    const [_, body] = await httpRequest("GET", `/recordings/${recordingName}/url`);
    return body?.recordingUrl;
}

async function httpRequest(method, url, body) {
    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: method !== "GET" ? JSON.stringify(body) : undefined
        });

        const responseBody = await response.json();

        if (!response.ok) {
            console.error(responseBody.errorMessage);
            const error = {
                status: response.status,
                message: responseBody.errorMessage
            };
            return [error, undefined];
        }

        return [undefined, responseBody];
    } catch (error) {
        console.error(error.message);
        const errorObj = {
            status: 0,
            message: error.message
        };
        return [errorObj, undefined];
    }
}

function showRecordingList(recordings) {
    const recordingsList = document.getElementById("recording-list");

    if (recordings.length === 0) {
        recordingsList.innerHTML = "<span>There are no recordings available</span>";
    } else {
        recordingsList.innerHTML = "";
    }

    recordings.forEach((recording) => {
        const recordingName = recording.name;
        const recordingDuration = secondsToHms(recording.duration ?? 0);
        const recordingSize = formatBytes(recording.size ?? 0);
        const recordingDate = new Date(recording.startedAt).toLocaleString();

        const recordingContainer = document.createElement("div");
        recordingContainer.className = "recording-container";
        recordingContainer.id = recordingName;

        recordingContainer.innerHTML = `
            <i class="fa-solid fa-file-video"></i>
            <div class="recording-info">
                <p class="recording-name">${recordingName}</p>
                <p class="recording-size">${recordingDuration} | ${recordingSize}</p>
                <p class="recording-date">${recordingDate}</p>
            </div>
            <div class="recording-actions">
                <button title="Play" class="icon-button" onclick="displayRecording('${recordingName}')">
                    <i class="fa-solid fa-play"></i>
                </button>
                <button title="Delete" class="icon-button delete-button" onclick="deleteRecording('${recordingName}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        recordingsList.append(recordingContainer);
    });
}

async function displayRecording(recordingName) {
    const recordingVideoDialog = document.getElementById("recording-video-dialog");
    recordingVideoDialog.showModal();
    const recordingVideo = document.getElementById("recording-video");

    const recordingUrl = await getRecordingUrl(recordingName);
    recordingVideo.src = recordingUrl;
}

function closeRecording() {
    const recordingVideoDialog = document.getElementById("recording-video-dialog");
    recordingVideoDialog.close();
}

function removeAllRecordings() {
    const recordingList = document.getElementById("recording-list").children;
    Array.from(recordingList).forEach((recording) => {
        recording.remove();
    });
}

function secondsToHms(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor((seconds % 3600) % 60);

    const hDisplay = h > 0 ? h + "h " : "";
    const mDisplay = m > 0 ? m + "m " : "";
    const sDisplay = s + "s";
    return hDisplay + mDisplay + sDisplay;
}

function formatBytes(bytes) {
    if (bytes === 0) {
        return "0Bytes";
    }

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const decimals = i < 2 ? 0 : 1;

    return (bytes / Math.pow(k, i)).toFixed(decimals) + sizes[i];
}
