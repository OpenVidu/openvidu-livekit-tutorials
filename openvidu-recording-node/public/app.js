var LivekitClient = window.LivekitClient;
var room;
var myRoomName;
var token;
var nickname;
var numVideos = 0;

var localVideoPublication;
var localAudioPublication;

/* OPENVIDU METHODS */

function joinRoom() {
	// --- 0) Change the button ---

	document.getElementById('join-btn').disabled = true;
	document.getElementById('join-btn').innerHTML = 'Joining...';
	const myParticipantName = `Participant${Math.floor(Math.random() * 100)}`;
	const myRoomName = $('#roomName').val();

	room = new LivekitClient.Room();

	room.on(
		LivekitClient.RoomEvent.TrackSubscribed,
		(track, publication, participant) => {
			const element = track.attach();
			element.id = track.sid;
			document.getElementById('video-container').appendChild(element);
			if (track.kind === 'video') {
				var audioTrackId;
				var videoTrackId;
				participant.getTracks().forEach((track) => {
					if (track.kind === 'audio') {
						audioTrackId = track.trackInfo.sid;
					} else if (track.kind === 'video') {
						videoTrackId = track.trackInfo.sid;
					}
				});
				addIndividualRecordingButton(element.id, videoTrackId, audioTrackId);
				updateNumVideos(1);
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
				// removeUserData(participant);
				updateNumVideos(-1);
			}
		}
	);

	room.on(LivekitClient.RoomEvent.RecordingStatusChanged, (isRecording) => {
		console.log('Recording status changed: ' + status);
		if (!isRecording) {
			listRecordings();
		}
	});

	getToken(myRoomName, myParticipantName).then(async (token) => {
		const livekitUrl = getLivekitUrlFromMetadata(token);

		try {
			await room.connect(livekitUrl, token);

			var participantName = $('#user').val();
			$('#room-title').text(myRoomName);
			$('#join').hide();
			$('#room').show();

			const [audioPublication, videoPublication] = await Promise.all([
				room.localParticipant.setMicrophoneEnabled(true),
				room.localParticipant.setCameraEnabled(true),
			]);
			localVideoPublication = videoPublication;
			localAudioPublication = audioPublication;

			console.log('Connected to room ' + myRoomName);
			const element = videoPublication.track.attach();
			element.id = videoPublication.track.sid;
			document.getElementById('video-container').appendChild(element);
			addIndividualRecordingButton(
				element.id,
				videoPublication.track.sid,
				audioPublication.track.sid
			);
			updateNumVideos(1);
		} catch (error) {
			console.warn(
				'There was an error connecting to the room:',
				error.code,
				error.message
			);
			enableBtn();
		}

		return false;
	});
}

function leaveRoom() {
	room.disconnect();
	room = null;

	$('#video-container').empty();
	numVideos = 0;

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

function getToken(roomName, participantName) {
	return new Promise((resolve, reject) => {
		// Video-call chosen by the user
		httpRequest(
			'POST',
			'token',
			{ roomName, participantName },
			'Error generating token',
			(response) => resolve(response.token)
		);
	});
}

async function httpRequest(method, url, body, errorMsg, successCallback) {
	try {
		const response = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
			},
			body: method === 'GET' ? undefined : JSON.stringify(body),
		});

		if (response.ok) {
			const data = await response.json();
			successCallback(data);
		} else {
			console.warn(errorMsg);
			console.warn('Error: ' + response.statusText);
		}
	} catch (error) {
		console.error(error);
	}
}

function startComposedRecording() {
	var hasAudio = $('#has-audio-checkbox').prop('checked');
	var hasVideo = $('#has-video-checkbox').prop('checked');

	httpRequest(
		'POST',
		'recordings/start',
		{
			roomName: room.roomInfo.name,
			outputMode: 'COMPOSED',
			videoOnly: hasVideo && !hasAudio,
			audioOnly: hasAudio && !hasVideo,
		},
		'Start recording WRONG',
		(res) => {
			console.log(res);
			document.getElementById('forceRecordingId').value = res.id;
			checkBtnsRecordings();
			$('#textarea-http').text(JSON.stringify(res, null, '\t'));
		}
	);
}

function startIndividualRecording(videoTrackId, audioTrackId) {
	return new Promise((resolve, reject) => {
		httpRequest(
			'POST',
			'recordings/start',
			{
				roomName: room.roomInfo.name,
				outputMode: 'INDIVIDUAL',
				audioTrackId,
				videoTrackId,
			},
			'Start recording WRONG',
			(res) => {
				console.log(res);
				$('#textarea-http').text(JSON.stringify(res.info, null, '\t'));
				resolve(res);
			}
		);
	});
}

function stopRecording(id) {
	var forceRecordingId = id ? id : $('#forceRecordingId').val();
	httpRequest(
		'POST',
		'recordings/stop',
		{
			recordingId: forceRecordingId,
		},
		'Stop recording WRONG',
		(res) => {
			console.log(res);
			$('#forceRecordingId').val('');
			$('#textarea-http').text(JSON.stringify(res.info, null, '\t'));
		}
	);
}

function listRecordings() {
	httpRequest('GET', 'recordings/list', {}, 'List recordings WRONG', (res) => {
		console.log(res);
		$('#recording-list').empty();
		if (res.recordings && res.recordings.length > 0) {
			res.recordings.forEach((recording) => {
				var li = document.createElement('li');
				var a = document.createElement('a');
				a.href = recording.path;
				a.target = '_blank';
				a.appendChild(document.createTextNode(recording.name));
				li.appendChild(a);
				$('#recording-list').append(li);
			});
			$('#delete-recordings-btn').prop('disabled', res.recordings.length === 0);
		}
	});
}

function deleteRecordings() {
	httpRequest('DELETE', 'recordings', {}, 'Delete recordings WRONG', (res) => {
		console.log(res);
		$('#recording-list').empty();
		$('#delete-recordings-btn').prop('disabled', true);
		$('#textarea-http').text(JSON.stringify(res, null, '\t'));
	});
}

/* APPLICATION REST METHODS */

/* APPLICATION BROWSER METHODS */

events = '';

window.onbeforeunload = function () {
	// Gracefully leave room
	if (room) {
		removeUser();
		leaveRoom();
	}
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

function updateNumVideos(i) {
	numVideos += i;
	$('video').removeClass();
	switch (numVideos) {
		case 1:
			$('video').addClass('two');
			break;
		case 2:
			$('video').addClass('two');
			break;
		case 3:
			$('video').addClass('three');
			break;
		case 4:
			$('video').addClass('four');
			break;
	}
}

function checkBtnsRecordings() {
	if (document.getElementById('forceRecordingId').value === '') {
		document.getElementById('buttonStopRecording').disabled = true;
	} else {
		document.getElementById('buttonStopRecording').disabled = false;
	}
}

function addIndividualRecordingButton(elementId, videoTrackId, audioTrackId) {
	const div = document.createElement('div');

	var button = document.createElement('button');
	// button.id = elementId + '-button';
	button.className = 'recording-track-button btn btn-sm';

	button.innerHTML = 'Record Track';
	button.style = 'position: absolute; left: 0; z-index: 1000;';

	button.onclick = async () => {
		if (button.innerHTML === 'Record Track') {
			button.innerHTML = 'Stop Recording';
			button.className = 'recording-track-button btn btn-sm btn-danger';
			var res = await startIndividualRecording(videoTrackId, audioTrackId);
			button.id = res.info.egressId;
		} else {
			button.innerHTML = 'Record Track';
			button.className = 'recording-track-button btn btn-sm';
			stopRecording(button.id);
		}
	};
	div.appendChild(button);
	var element = document.getElementById(elementId);
	element.parentNode.insertBefore(div, element.nextSibling);
}

function clearHttpTextarea() {
	$('#textarea-http').text('');
}

/* APPLICATION BROWSER METHODS */
