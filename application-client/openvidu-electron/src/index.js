const axios = require("axios");
const { Room, RoomEvent } = require("livekit-client");

const ipcRenderer = require("electron").ipcRenderer;
const { BrowserWindow } = require("@electron/remote");
var room;
var myParticipantName;
var myRoomName;
var isScreenShared = false;
var screenSharePublication;

// Configure this constants with correct URLs depending on your deployment
const APPLICATION_SERVER_URL = "http://localhost:6080/";
const LIVEKIT_URL = "ws://localhost:7880/";

ipcRenderer.on("screen-share-ready", async (event, sourceId) => {
  if (sourceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        },
      });

      const track = stream.getVideoTracks()[0];
      const screenPublication = await room.localParticipant.publishTrack(track);
      isScreenShared = true;
      screenSharePublication = screenPublication;
      const element = screenPublication.track.attach();
      element.id = screenPublication.trackSid;
      element.className = "removable";
      document.getElementById("local-participant").appendChild(element);
    } catch (error) {
      console.error("Error enabling screen sharing", error);
    }
  }
});

async function joinRoom() {
  myRoomName = document.getElementById("roomName").value;
  myParticipantName = document.getElementById("participantName").value;

  // --- 1) Get a Room object ---
  room = new Room();

  // --- 2) Specify the actions when events take place in the room ---

  // On every new Track received...
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log("TrackSubscribed", track, publication, participant);
    const element = track.attach();
    element.id = track.sid;
    element.className = "removable";
    document.getElementById("remote-participants").appendChild(element);
  });

  // On every new Track destroyed...
  room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    console.log("TrackUnSubscribed", track, publication, participant);

    track.detach();
    document.getElementById(track.sid)?.remove();
  });

  // --- 3) Connect to the room with a valid access token ---

  // Get a token from the application backend
  const token = await getToken(myRoomName, myParticipantName);

  await room.connect(LIVEKIT_URL, token);

  showRoom();
  // --- 4) Publish your local tracks ---
  await room.localParticipant.setMicrophoneEnabled(true);
  const publication = await room.localParticipant.setCameraEnabled(true);
  const element = publication.track.attach();
  element.className = "removable";
  document.getElementById("local-participant").appendChild(element);
}

async function toggleScreenShare() {
  console.log("Toggling screen share");
  const enabled = !isScreenShared;

  if (enabled) {
    openScreenShareModal();
  } else {
    // Disable screen sharing
    await stopScreenSharing();
  }
}

async function stopScreenSharing() {
  try {
    await room.localParticipant.unpublishTrack(screenSharePublication.track);
    isScreenShared = false;
    const trackSid = screenSharePublication?.trackSid;

    if (trackSid) {
      document.getElementById(trackSid)?.remove();
    }
    screenSharePublication = undefined;
  } catch (error) {
    console.error("Error stopping screen sharing", error);
  }
}

function leaveRoom() {
  // --- 5) Leave the room by calling 'disconnect' method over the Room object ---

  room.disconnect();
  // Removing all HTML elements with user's nicknames.
  // HTML videos are automatically removed when leaving a Room
  removeAllParticipantElements();
  hideRoom();
}

function showRoom() {
  document.getElementById("room-header").innerText = myRoomName;
  document.getElementById("join").style.display = "none";
  document.getElementById("room").style.display = "block";
}

function hideRoom() {
  document.getElementById("join").style.display = "block";
  document.getElementById("room").style.display = "none";
}

function removeAllParticipantElements() {
  var elementsToRemove = document.getElementsByClassName("removable");
  while (elementsToRemove[0]) {
    elementsToRemove[0].parentNode.removeChild(elementsToRemove[0]);
  }
}

function openScreenShareModal() {
  let win = new BrowserWindow({
    parent: require("@electron/remote").getCurrentWindow(),
    modal: true,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
    resizable: false,
  });
  require("@electron/remote")
    .require("@electron/remote/main")
    .enable(win.webContents);

  win.setMenu(null);
  // win.webContents.openDevTools();

  var theUrl = "file://" + __dirname + "/modal.html";
  win.loadURL(theUrl);
}

/**
 * --------------------------------------------
 * GETTING A TOKEN FROM YOUR APPLICATION SERVER
 * --------------------------------------------
 * The methods below request the creation of a Token to
 * your application server. This keeps your OpenVidu deployment secure.
 *
 * In this sample code, there is no user control at all. Anybody could
 * access your application server endpoints! In a real production
 * environment, your application server must identify the user to allow
 * access to the endpoints.
 *
 */
async function getToken(roomName, participantName) {
  try {
    const response = await axios.post(
      APPLICATION_SERVER_URL + "token",
      {
        roomName,
        participantName,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("No connection to application server", error);
  }
}
