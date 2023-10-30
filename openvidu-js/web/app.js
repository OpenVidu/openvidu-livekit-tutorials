
var LivekitClient = window.LivekitClient;
var room;

/* OPENVIDU METHODS */

function joinRoom() {

	var myRoomName = document.getElementById("roomName").value;
	var myUserName = document.getElementById("userName").value;

	// --- 1) Get a Room object ---

	room = new LivekitClient.Room();

	// --- 2) Specify the actions when events take place in the room ---

	// On every new Track received...
	room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
		const element = track.attach();
		element.id = track.sid;
		element.className = 'removable';
		document.getElementById('video-container').appendChild(element);
		if (track.kind === 'video') {
			appendUserData(element, participant.identity);
		}
	});

	// On every new Track destroyed...
	room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
		track.detach();
		document.getElementById(track.sid)?.remove();
		if (track.kind === 'video') {
			removeUserData(participant);
		}
	});

	// --- 3) Connect to the room with a valid access token ---

	// Get a token from the application backend
	getToken(myRoomName, myUserName).then(token => {
		const livekitUrl = getLivekitUrlFromMetadata(token);

		// First param is the LiveKit server URL. Second param is the access token
		room.connect(livekitUrl, token)
			.then(() => {

				// --- 4) Set page layout for active call ---

				document.getElementById('room-title').innerText = myRoomName;
				document.getElementById('join').style.display = 'none';
				document.getElementById('room').style.display = 'block';

				// --- 5) Publish your local tracks ---

				room.localParticipant.setMicrophoneEnabled(true);
				room.localParticipant.setCameraEnabled(true).then(publication => {
					const element = publication.track.attach();
					document.getElementById('video-container').appendChild(element);
					initMainVideo(element, myUserName);
					appendUserData(element, myUserName);
					element.className = 'removable';
				});

			})
			.catch(error => {
				console.log('There was an error connecting to the room:', error.code, error.message);
			});
	});
}

function leaveRoom() {

	// --- 6) Leave the room by calling 'disconnect' method over the Room object ---

	room.disconnect();

	// Removing all HTML elements with user's nicknames.
	// HTML videos are automatically removed when leaving a Room
	removeAllUserData();

	// Back to 'Join room' page
	document.getElementById('join').style.display = 'block';
	document.getElementById('room').style.display = 'none';
}

window.onbeforeunload = function () {
	if (room) room.disconnect();
};


/* APPLICATION SPECIFIC METHODS */

window.addEventListener('load', function () {
	generateParticipantInfo();
});

function generateParticipantInfo() {
	document.getElementById("roomName").value = "RoomA";
	document.getElementById("userName").value = "Participant" + Math.floor(Math.random() * 100);
}

function appendUserData(videoElement, participantIdentity) {
	var dataNode = document.createElement('div');
	dataNode.className = "removable";
	dataNode.id = "data-" + participantIdentity;
	dataNode.innerHTML = "<p>" + participantIdentity + "</p>";
	videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
	addClickListener(videoElement, participantIdentity);
}

function removeUserData(participant) {
	var dataNode = document.getElementById("data-" + participant.identity);
	dataNode?.parentNode.removeChild(dataNode);
}

function removeAllUserData() {
	var elementsToRemove = document.getElementsByClassName('removable');
	while (elementsToRemove[0]) {
		elementsToRemove[0].parentNode.removeChild(elementsToRemove[0]);
	}
}

function addClickListener(videoElement, userData) {
	videoElement.addEventListener('click', function () {
		var mainVideo = $('#main-video video').get(0);
		if (mainVideo.srcObject !== videoElement.srcObject) {
			$('#main-video').fadeOut("fast", () => {
				$('#main-video p').html(userData);
				mainVideo.srcObject = videoElement.srcObject;
				$('#main-video').fadeIn("fast");
			});
		}
	});
}

function initMainVideo(videoElement, userData) {
	document.querySelector('#main-video video').srcObject = videoElement.srcObject;
	document.querySelector('#main-video p').innerHTML = userData;
	document.querySelector('#main-video video')['muted'] = true;
}

function getLivekitUrlFromMetadata(token) {
	if (!token) throw new Error('Trying to get metadata from an empty token');
	try {
		const base64Url = token.split('.')[1];
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			window
				.atob(base64)
				.split('')
				.map((c) => {
					return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
				})
				.join('')
		);

		const payload = JSON.parse(jsonPayload);
		if (!payload?.metadata) throw new Error('Token does not contain metadata');
		const metadata = JSON.parse(payload.metadata);
		return metadata.livekitUrl;
	} catch (error) {
		throw new Error('Error decoding and parsing token: ' + error);
	}
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

var APPLICATION_SERVER_URL = "http://localhost:5000/";

function getToken(roomName, participantName) {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: 'POST',
			url: APPLICATION_SERVER_URL + 'token',
			data: JSON.stringify({
				roomName,
				participantName
			}),
			headers: { "Content-Type": "application/json" },
			success: (token) => resolve(token),
			error: (error) => reject(error)
		});
	});
}

