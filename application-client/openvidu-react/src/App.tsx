import { useMemo, useState } from 'react';

import openviduCropped from './assets/openvidu_grey_bg_transp_cropped.png';
import './App.css';
import {
	LocalTrackPublication,
	RemoteTrack,
	RemoteTrackPublication,
	Room,
	RoomEvent,
} from 'livekit-client';
import axios from 'axios';
import OvVideo from './OvVideo';
import OvAudio from './OvAudio';

const App = () => {
	// For local development, leave these variables empty
	// For production, configure them with correct URLs depending on your deployment
	let APPLICATION_SERVER_URL = '';
	let LIVEKIT_URL = '';

	// If APPLICATION_SERVER_URL is not configured, use default value from local development
	if (!APPLICATION_SERVER_URL) {
		if (window.location.hostname === 'localhost') {
			APPLICATION_SERVER_URL = 'http://localhost:6080/';
		} else {
			APPLICATION_SERVER_URL = 'https://' + window.location.hostname + ':6443/';
		}
	}

	// If LIVEKIT_URL is not configured, use default value from local development
	if (!LIVEKIT_URL) {
		if (window.location.hostname === 'localhost') {
			LIVEKIT_URL = 'ws://localhost:7880/';
		} else {
			LIVEKIT_URL = 'wss://' + window.location.hostname + ':7443/';
		}
	}

	const [myRoomName, setMyRoomName] = useState('');
	const [myParticipantName, setMyParticipantName] = useState('');
	const [room, setRoom] = useState<Room | undefined>(undefined);
	const [myMainPublication, setMyMainPublication] = useState<
		LocalTrackPublication | RemoteTrackPublication | undefined
	>(undefined);
	const [localPublication, setLocalPublication] = useState<
		LocalTrackPublication | undefined
	>(undefined);
	const [remotePublications, setRemotePublications] = useState<
		RemoteTrackPublication[]
	>([]);

	const joinRoom = () => {

		// --- 1) Get a Room object ---

		const room = new Room();
		setRoom(room);

		// --- 2) Specify the actions when events take place in the room ---

		// On every new Track received...
		room.on(
			RoomEvent.TrackSubscribed,
			(_track: RemoteTrack, publication: RemoteTrackPublication) => {
				// Store the new publication in remotePublications array
				setRemotePublications((prevPublications) => [
					...prevPublications,
					publication,
				]);
			}
		);

		// On every track destroyed...
		room.on(
			RoomEvent.TrackUnsubscribed,
			(_track: RemoteTrack, publication: RemoteTrackPublication) => {
				// Remove the publication from 'remotePublications' array
				deleteRemoteTrackPublication(publication);
			}
		);

		getToken(myRoomName, myParticipantName).then(async (token: string) => {
			// First param is the LiveKit server URL. Second param is the access token
			try {
				await room.connect(LIVEKIT_URL, token);
				// --- 4) Publish your local tracks ---
				await room.localParticipant.setMicrophoneEnabled(true);
				const videoPublication = await room.localParticipant.setCameraEnabled(
					true
				);

				// Set the main video in the page to display our webcam and store our localPublication
				setLocalPublication(videoPublication);
				setMyMainPublication(videoPublication);
			} catch (error) {
				console.log(
					'There was an error connecting to the room:',
					error.code,
					error.message
				);
			}
		});
	};

	const leaveRoom = () => {
		// --- 5) Leave the room by calling 'disconnect' method over the Room object ---

		if (room) {
			room.disconnect();
		}

		// Empty all properties...
		setRemotePublications([]);
		setLocalPublication(undefined);
		setRoom(new Room());

	};

	const deleteRemoteTrackPublication = useMemo(
		() => (publication: RemoteTrackPublication) => {
			setRemotePublications((prevPublications) =>
				prevPublications.filter((p) => p !== publication)
			);
		},
		[]
	);

	const handleMainVideoStream = (
		publication: LocalTrackPublication | RemoteTrackPublication
	) => {
		if (publication) {
			setMyMainPublication(publication);
		}
	};

	const switchCamera = async () => {
		const localDevices: MediaDeviceInfo[] = await Room.getLocalDevices();
		const videoDevices = localDevices.filter(
			(device) => device.kind === 'videoinput'
		);
		const newDevice = videoDevices.find(
			(device) =>
				device.deviceId !==
				localPublication?.track?.mediaStreamTrack.getSettings().deviceId
		);
		if (!newDevice) return;
		room?.switchActiveDevice('videoinput', newDevice?.deviceId);
	};

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
	 * Visit https://docs.openvidu.io/en/stable/application-server to learn
	 * more about the integration of OpenVidu in your application server.
	 */
	const getToken = useMemo(
		() =>
			async (roomName: string, participantName: string): Promise<string> => {
				try {
					const response = await axios.post(
						APPLICATION_SERVER_URL + 'token',
						{ roomName, participantName },
						{
							headers: { 'Content-Type': 'application/json' },
							responseType: 'text',
						}
					);
					return response.data;
				} catch (error) {
					// Handle errors here
					console.error('Error getting token:', error);
					throw error;
				}
			},
		[APPLICATION_SERVER_URL]
	);

	return (
		<>
			{localPublication === undefined ? (
				<div id="join">
					<div id="img-div">
						<img src={openviduCropped} alt="OpenVidu logo" />
					</div>
					<div id="join-dialog" className="jumbotron vertical-center">
						<h1> Join a video room </h1>
						<form
							className="form-group"
							onSubmit={(e) => {
								joinRoom();
								e.preventDefault();
							}}
						>
							<p>
								<label>Participant: </label>
								<input
									className="form-control"
									type="text"
									id="userName"
									value={myParticipantName}
									onChange={(event) => setMyParticipantName(event.target.value)}
									required
								/>
							</p>
							<p>
								<label> Room: </label>
								<input
									className="form-control"
									type="text"
									id="roomName"
									value={myRoomName}
									onChange={(event) => setMyRoomName(event.target.value)}
									required
								/>
							</p>
							<p className="text-center">
								<input
									className="btn btn-lg btn-success"
									name="commit"
									type="submit"
									value="JOIN"
								/>
							</p>
						</form>
					</div>
				</div>
			) : (
				<div id="room">
					<div id="room-header">
						<h1 id="room-title">{myRoomName}</h1>
						<div className="button-container">
							<input
								className="btn btn-large btn-danger"
								type="button"
								id="buttonLeaveRoom"
								onClick={() => leaveRoom()}
								value="Leave room"
							/>
							<input
								className="btn btn-large btn-success"
								type="button"
								id="buttonSwitchCamera"
								onClick={() => switchCamera()}
								value="Switch Camera"
							/>
						</div>
					</div>

					{myMainPublication !== undefined ? (
						<div id="main-video" className="col-md-6">
							{myMainPublication.videoTrack && (
								<OvVideo track={myMainPublication.videoTrack} />
							)}
						</div>
					) : null}
					<div id="video-container" className="col-md-6">
						{localPublication !== undefined ? (
              // sss
							<div className="stream-container col-md-6 col-xs-6">
								{localPublication.videoTrack && (
									<OvVideo
										onClick={() => handleMainVideoStream(localPublication)}
										track={localPublication.videoTrack}
									/>
								)}
							</div>
						) : null}
						{remotePublications.map((publication) => (
							<div
								key={publication.trackSid}
								className={`stream-container col-md-6 col-xs-6 ${
									publication.kind === 'audio' ? 'hidden' : ''
								}`}
							>
								{publication.videoTrack && (
									<OvVideo
										onClick={() => handleMainVideoStream(publication)}
										track={publication.videoTrack}
									/>
								)}
								{publication.audioTrack && (
									<OvAudio track={publication.audioTrack} />
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
}

export default App;
