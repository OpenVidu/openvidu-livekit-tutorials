var LivekitClient = window.LivekitClient;
var room;
var myRoomName;
var token;
var nickname;

/* OPENVIDU METHODS */

function joinRoom() {
	document.getElementById('join-btn').disabled = true;
	document.getElementById('join-btn').innerHTML = 'Joining...';
	const myParticipantName = $('#myParticipantName').val();
	const myRoomName = $('#myRoomName').val();

	room = new LivekitClient.Room();

	room.on(
		LivekitClient.RoomEvent.TrackSubscribed,
		(track, publication, participant) => {
			const element = track.attach();
			element.id = track.sid;
			element.className = 'removable';
			document.getElementById('video-container').appendChild(element);
			if (track.kind === 'video') {
				var participantNickname;
				try {
					participantNickname = JSON.parse(participant.metadata).nickname;
				} catch (error) {
					console.warn('Error parsing participant metadata: ' + error);
				}
				appendUserData(element, participant.identity, participantNickname);
			}
		}
	);

	// On every new Track destroyed...
	room.on(
		LivekitClient.RoomEvent.TrackUnsubscribed,
		(track, publication, participant) => {
			track.detach();
			document.getElementById(track.sid)?.remove();
			if (track.kind === 'video') {
				removeUserData(participant);
			}
		}
	);

	getToken(myRoomName, myParticipantName).then((token) => {
		const livekitUrl = getLivekitUrlFromMetadata(token);

		room
			.connect(livekitUrl, token)
			.then(async () => {
				var participantName = $('#user').val();
				$('#room-title').text(myRoomName);
				$('#join').hide();
				$('#room').show();

				const canPublish = room.localParticipant.permissions.canPublish;

				if (canPublish) {
					const [microphonePublication, cameraPublication] = await Promise.all([
						room.localParticipant.setMicrophoneEnabled(true),
						room.localParticipant.setCameraEnabled(true),
					]);

					const element = cameraPublication.track.attach();
					element.className = 'removable';
					document.getElementById('video-container').appendChild(element);
					initMainVideo(element, myParticipantName, nickname);
					appendUserData(element, myParticipantName, nickname);
				} else {
					initMainVideoThumbnail();
				}
			})
			.catch((error) => {
				console.warn(
					'There was an error connecting to the room:',
					error.code,
					error.message
				);
				enableBtn();
			});
	});

	return false;
}

function leaveRoom() {
	room.disconnect();
	room = null;

	// Removing all HTML elements with the user's nicknames
	cleanRoomView();

	$('#join').show();
	$('#room').hide();

	enableBtn();
}

/* OPENVIDU METHODS */

function enableBtn() {
	document.getElementById('join-btn').disabled = false;
	document.getElementById('join-btn').innerHTML = 'Join!';
}

/* APPLICATION REST METHODS */

function logIn() {
	nickname = $('#user').val();
	var pass = $('#pass').val();

	httpPostRequest(
		'login',
		{ user: nickname, pass },
		'Login WRONG',
		(response) => {
			$('#name-user').text(nickname);
			$('#not-logged').hide();
			$('#logged').show();
			// Random myParticipantName and room
			$('#myRoomName').val('Room ' + Math.floor(Math.random() * 10));
			$('#myParticipantName').val(
				'Participant ' + Math.floor(Math.random() * 100)
			);
		}
	);
}

function logOut() {
	httpPostRequest('logout', {}, 'Logout WRONG', (response) => {
		$('#not-logged').show();
		$('#logged').hide();
	});

	enableBtn();
}

function getToken(roomName, participantName) {
	return new Promise((resolve, reject) => {
		// Video-call chosen by the user
		httpPostRequest(
			'token',
			{ roomName, participantName },
			'Error generating token',
			(response) => resolve(response.token)
		);
	});
}

async function httpPostRequest(url, body, errorMsg, successCallback) {
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (response.ok) {
			const data = await response.json();
			successCallback(data);
		} else {
			console.warn(errorMsg);
			console.warn('Error: ', response);
		}
	} catch (error) {
		console.error(error);
	}
}

/* APPLICATION REST METHODS */

/* APPLICATION BROWSER METHODS */

window.onbeforeunload = () => {
	if (room) {
		leaveRoom();
	}
	logOut();
};

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

function appendUserData(videoElement, participantName, nickname) {
	var dataNode = document.createElement('div');
	dataNode.className = 'removable';
	dataNode.id = 'data-' + participantName;
	dataNode.innerHTML = `
		<p class='nickname'>${nickname}</p>
		<p class='participantName'>${participantName}</p>
	`;
	videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
	addClickListener(videoElement, participantName);
}

function removeUserData(participant) {
	var dataNode = document.getElementById('data-' + participant.identity);
	dataNode?.parentNode.removeChild(dataNode);
}

function removeAllUserData() {
	var elementsToRemove = document.getElementsByClassName('removable');
	while (elementsToRemove[0]) {
		elementsToRemove[0].parentNode.removeChild(elementsToRemove[0]);
	}
}

function cleanMainVideo() {
	$('#main-video video').get(0).srcObject = null;
	$('#main-video p').each(function () {
		$(this).html('');
	});
}

function addClickListener(videoElement, clientData, serverData) {
	videoElement.addEventListener('click', function () {
		var mainVideo = $('#main-video video').get(0);
		if (mainVideo.srcObject !== videoElement.srcObject) {
			$('#main-video').fadeOut('fast', () => {
				$('#main-video p.nickname').html(clientData);
				$('#main-video p.participantName').html(serverData);
				mainVideo.srcObject = videoElement.srcObject;
				$('#main-video').fadeIn('fast');
			});
		}
	});
}

function initMainVideo(videoElement, participantName, nickname) {
	$('#main-video video').get(0).srcObject = videoElement.srcObject;
	$('#main-video p.nickname').html(nickname);
	$('#main-video p.participantName').html(participantName);
}

function initMainVideoThumbnail() {
	$('#main-video video').css(
		'background',
		"url('images/subscriber-msg.jpg') round"
	);
}

function cleanRoomView() {
	removeAllUserData();
	cleanMainVideo();
	$('#main-video video').css('background', '');
}

/* APPLICATION BROWSER METHODS */
