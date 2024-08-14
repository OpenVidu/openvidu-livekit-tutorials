// When running OpenVidu locally, leave these variables empty
// For other deployment type, configure them with correct URLs depending on your deployment
var APPLICATION_SERVER_URL = "";
var LIVEKIT_URL = "";
configureUrls();

const LivekitClient = window.LivekitClient;
var room;

function configureUrls() {
    // If APPLICATION_SERVER_URL is not configured, use default value from OpenVidu Local deployment
    if (!APPLICATION_SERVER_URL) {
        if (window.location.hostname === "localhost") {
            APPLICATION_SERVER_URL = "http://localhost:6080/";
        } else {
            APPLICATION_SERVER_URL = "https://" + window.location.hostname + ":6443/";
        }
    }

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
    const response = await fetch(APPLICATION_SERVER_URL + "token", {
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
