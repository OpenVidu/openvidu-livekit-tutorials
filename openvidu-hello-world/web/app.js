// docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp -e LIVEKIT_KEYS="devkey: secret" livekit/livekit-server:latest

var LivekitClient = window.LivekitClient;
var livekitUrl = 'ws://localhost:7880/';
var room;

function joinRoom() {

	var roomName = document.getElementById("roomName").value;
	var participantName = document.getElementById("participantName").value;

	room = new LivekitClient.Room();

	room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
		const element = track.attach();
		element.classList.add('remote-video');
		element.id = track.sid;
		document.getElementById('subscriber').appendChild(element);
	});

	room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track) => {
		track.detach();
		document.getElementById(track.sid)?.remove();
	});

	createToken(roomName, participantName).then(token => {

		room.connect(livekitUrl, token)
			.then(() => {
				document.getElementById("room-header").innerText = roomName;
				document.getElementById("join").style.display = "none";
				document.getElementById("room").style.display = "block";
				room.localParticipant.setMicrophoneEnabled(true);
				room.localParticipant.setCameraEnabled(true).then(publication => {
					const element = publication.track.attach();
					element.classList.add('local-video');
					document.getElementById('publisher').appendChild(element);
				});
			})
			.catch(error => {
				console.log("There was an error connecting to the room:", error.code, error.message);
			});
	});

}

function leaveRoom() {
	room.disconnect();
	document.getElementsByClassName('local-video')[0].remove();
	Array.from(document.getElementsByClassName('remote-video')).forEach(el => el.remove());
	document.getElementById("join").style.display = "block";
	document.getElementById("room").style.display = "none";
}

window.onbeforeunload = function () {
	if (room) room.disconnect();
};

window.onload = function () {
	document.getElementById("participantName").value = "Participant-" + (Math.random() + 1).toString(36).substring(7);
}

/**
 * --------------------------------------------
 * GETTING A TOKEN FROM YOUR APPLICATION SERVER
 * --------------------------------------------
 * The methods below request the creation of an AccessToken to
 * your application server. This keeps your LiveKit deployment secure.
 * 
 * In this sample code, there is no user control at all. Anybody could
 * access your application server endpoints! In a real production
 * environment, your application server must identify the user to allow
 * access to the endpoints.
 * 
 */

var APPLICATION_SERVER_URL = "http://localhost:5000/";

function createToken(roomName, participantName) {
	return new Promise((resolve, reject) => {
		$.ajax({
			type: 'POST',
			url: APPLICATION_SERVER_URL + 'getToken',
			data: JSON.stringify({
				roomName,
				participantName,
				permissions: {}
			}),
			headers: { "Content-Type": "application/json" },
			success: (response) => resolve(response), // The token
			error: (error) => reject(error)
		});
	});
}