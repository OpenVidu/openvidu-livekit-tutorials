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

    room.on(LivekitClient.RoomEvent.RecordingStatusChanged, async (isRecording) => {
        await updateRecordingInfo(isRecording);
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

window.onload = generateFormValues;

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
    const response = await fetch("/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
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

    const token = await response.json();
    return token.token;
}

async function openRecordingsDialog() {
    const recordingsDialog = document.getElementById("recordings-dialog");
    recordingsDialog.showModal();
    await updateRecordingInfo(room.isRecording);
}

function closeRecordingsDialog() {
    const recordingsDialog = document.getElementById("recordings-dialog");
    recordingsDialog.close();
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("recordings-dialog").addEventListener("close", () => {
        const recordingVideo = document.getElementById("recording-video");

        if (recordingVideo) {
            recordingVideo.remove();
        }
    });
});

async function updateRecordingInfo(isRecording) {
    const recordingButton = document.getElementById("recording-button");
    const recordingText = document.getElementById("recording-text");

    if (isRecording) {
        recordingButton.disabled = false;
        recordingButton.innerText = "Stop Recording";
        recordingButton.className = "btn btn-danger";
        recordingText.hidden = false;
    } else {
        recordingButton.disabled = false;
        recordingButton.innerText = "Start Recording";
        recordingButton.className = "btn btn-success";
        recordingText.hidden = true;
    }

    await listRecordings();
}

async function manageRecording() {
    const recordingButton = document.getElementById("recording-button");

    if (recordingButton.innerText === "Start Recording") {
        recordingButton.disabled = true;
        recordingButton.innerText = "Starting...";
        await startRecording();
    } else {
        recordingButton.disabled = true;
        recordingButton.innerText = "Stopping...";
        await stopRecording();
    }
}

async function startRecording() {
    const response = await fetch("/recordings/start", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            roomName: room.name
        })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error(error.errorMessage);
        return;
    }
}

async function stopRecording() {
    const response = await fetch("/recordings/stop", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            roomName: room.name
        })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error(error.errorMessage);
        return;
    }
}

async function deleteRecording(recordingName) {
    const response = await fetch(`/recordings/${recordingName}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        const error = await response.json();
        console.error(error.errorMessage);
        return;
    }

    await listRecordings();
}

async function listRecordings() {
    const response = await fetch(`/recordings?roomName=${room.name}`);

    if (!response.ok) {
        const error = await response.json();
        console.error(error.errorMessage);
        return;
    }

    const body = await response.json();
    const recordings = body.recordings;

    showRecordingList(recordings);
}

function showRecordingList(recordings) {
    const recordingsList = document.getElementById("recording-list");

    if (recordings.length === 0) {
        recordingsList.innerHTML = "There are no recordings available";
    } else {
        recordingsList.innerHTML = "";
    }

    recordings.forEach((recording) => {
        const recordingContainer = document.createElement("div");
        recordingContainer.className = "recording-container";
        recordingContainer.id = recording.name;

        const recordingName = document.createElement("p");
        recordingName.innerText = `${recording.name} - ${recording.duration} - ${recording.size} - ${new Date(
            recording.startedAt
        ).toLocaleString()}`;
        recordingContainer.append(recordingName);

        const playButton = document.createElement("button");
        playButton.innerText = "Play";
        playButton.className = "btn btn-primary";
        playButton.onclick = () => displayRecording(recording.name);
        recordingContainer.append(playButton);

        const deleteButton = document.createElement("button");
        deleteButton.innerText = "Delete";
        deleteButton.className = "btn btn-danger";
        deleteButton.onclick = async () => {
            await deleteRecording(recording.name);
        };
        recordingContainer.append(deleteButton);

        recordingsList.append(recordingContainer);
    });
}

function displayRecording(recordingName) {
    const recordingContainer = document.getElementById("recording-video-container");
    let recordingVideo = document.getElementById("recording-video");

    if (!recordingVideo) {
        recordingVideo = document.createElement("video");
        recordingVideo.id = "recording-video";
        recordingVideo.width = 600;
        recordingVideo.controls = true;
        recordingVideo.autoplay = true;
        recordingContainer.append(recordingVideo);
    }

    recordingVideo.src = `/recordings/${recordingName}`;
}
