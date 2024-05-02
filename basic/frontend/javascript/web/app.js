// For local development, leave these variables empty
// For production, configure them with correct URLs depending on your deployment
var APPLICATION_SERVER_URL = "";
var LIVEKIT_URL = "";
configureUrls();

const LivekitClient = window.LivekitClient;
var room;

function configureUrls() {
    // If APPLICATION_SERVER_URL is not configured, use default value from local development
    if (!APPLICATION_SERVER_URL) {
        if (window.location.hostname === "localhost") {
            APPLICATION_SERVER_URL = "http://localhost:6080/";
        } else {
            APPLICATION_SERVER_URL = "https://" + window.location.hostname + ":6443/";
        }
    }

    // If LIVEKIT_URL is not configured, use default value from local development
    if (!LIVEKIT_URL) {
        if (window.location.hostname === "localhost") {
            LIVEKIT_URL = "ws://localhost:7880/";
        } else {
            LIVEKIT_URL = "wss://" + window.location.hostname + ":7443/";
        }
    }
}

async function joinRoom() {
    const roomName = document.getElementById("roomName").value;
    const userName = document.getElementById("userName").value;

    // 1. Get a Room object
    room = new LivekitClient.Room();

    // 2. Specify the actions when events take place in the room
    // On every new Track received...
    room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        addTrack(track, participant.identity);
    });

    // On every new Track destroyed...
    room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
        track.detach();
        document.getElementById(track.sid)?.remove();

        if (track.kind === "video") {
            removeUserData(participant.identity);
        }
    });

    // 3. Connect to the room with a valid access token
    try {
        // Get a token from the application backend
        const token = await getToken(roomName, userName);
        await room.connect(LIVEKIT_URL, token);

        // 4. Set page layout for active call
        document.getElementById("room-title").innerText = roomName;
        document.getElementById("join").hidden = true;
        document.getElementById("room").hidden = false;

        // 5. Publish your local tracks
        await room.localParticipant.setMicrophoneEnabled(true);
        const publication = await room.localParticipant.setCameraEnabled(true);
        addTrack(publication.track, userName, true);
    } catch (error) {
        console.log("There was an error connecting to the room:", error.message);
    }
}

function addTrack(track, participantIdentity, local = false) {
    const element = track.attach();
    element.id = track.sid;
    element.className = "removable";
    document.getElementById("video-container").appendChild(element);

    if (track.kind === "video") {
        appendUserData(element, participantIdentity + (local ? " (You)" : ""));
    }
}

async function leaveRoom() {
    // 6. Leave the room by calling 'disconnect' method over the Room object
    await room.disconnect();

    // Removing all HTML audio/video elements and user's nicknames.
    removeAllRemovableElements();

    // Back to 'Join room' page
    document.getElementById("join").hidden = false;
    document.getElementById("room").hidden = true;
}

window.onbeforeunload = () => {
    room?.disconnect();
};

window.onload = generateParticipantInfo;

function generateParticipantInfo() {
    document.getElementById("roomName").value = "Test Room";
    document.getElementById("userName").value = "Participant" + Math.floor(Math.random() * 100);
}

function appendUserData(videoElement, participantIdentity) {
    const dataNode = document.createElement("div");
    dataNode.id = `data-${participantIdentity}`;
    dataNode.className = "removable";
    dataNode.innerHTML = `<p>${participantIdentity}</p>`;
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
}

function removeUserData(participantIdentity) {
    const dataNode = document.getElementById(`data-${participantIdentity}`);
    dataNode?.remove();
}

function removeAllRemovableElements() {
    const elementsToRemove = document.getElementsByClassName("removable");
    Array.from(elementsToRemove).forEach((element) => {
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
        throw new Error("Failed to get token");
    }

    const token = await response.json();
    return token;
}
