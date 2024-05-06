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
    const roomName = document.getElementById("room-name").value;
    const userName = document.getElementById("participant-name").value;

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
            removeVideoContainer(participant.identity);
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

    /* If the track is a video track, we create a container and append the video element to it 
    with the participant's identity */
    if (track.kind === "video") {
        const videoContainer = createVideoContainer(participantIdentity);
        videoContainer.appendChild(element);
        appendParticipantData(videoContainer, participantIdentity + (local ? " (You)" : ""));
    } else {
        document.getElementById("layout-container").appendChild(element);
    }
}

async function leaveRoom() {
    // 6. Leave the room by calling 'disconnect' method over the Room object
    await room.disconnect();

    // Removing all HTML elements inside the layout container
    removeAllLayoutElements();

    // Back to 'Join room' page
    document.getElementById("join").hidden = false;
    document.getElementById("room").hidden = true;
}

window.onbeforeunload = () => {
    room?.disconnect();
};

window.onload = generateFormValues;

function generateFormValues() {
    document.getElementById("room-name").value = "Test Room";
    document.getElementById("participant-name").value = "Participant" + Math.floor(Math.random() * 100);
}

function createVideoContainer(participantIdentity) {
    const videoContainer = document.createElement("div");
    videoContainer.id = `camera-${participantIdentity}`;
    videoContainer.className = "video-container";
    document.getElementById("layout-container").appendChild(videoContainer);
    return videoContainer;
}

function appendParticipantData(videoContainer, participantIdentity) {
    const dataElement = document.createElement("div");
    dataElement.className = "participant-data";
    dataElement.innerHTML = `<p>${participantIdentity}</p>`;
    videoContainer.appendChild(dataElement);
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
        throw new Error("Failed to get token");
    }

    const token = await response.json();
    return token;
}
