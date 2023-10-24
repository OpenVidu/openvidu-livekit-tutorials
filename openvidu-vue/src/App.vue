<template>
	<div id="main-container" class="container">
		<div id="join" v-if="!room">
			<div id="img-div">
				<img src="/assets/images/openvidu_grey_bg_transp_cropped.png" />
			</div>
			<div id="join-dialog" class="jumbotron vertical-center">
				<h1>Join a video room</h1>
				<div class="form-group">
					<p>
						<label>Participant</label>
						<input
							v-model="myParticipantName"
							class="form-control"
							type="text"
							required
						/>
					</p>
					<p>
						<label>Session</label>
						<input
							v-model="myRoomName"
							class="form-control"
							type="text"
							required
						/>
					</p>
					<p class="text-center">
						<button class="btn btn-lg btn-success" @click="joinRoom()">
							Join!
						</button>
					</p>
				</div>
			</div>
		</div>

		<div id="room" v-if="room">
			<div id="room-header">
				<h1 id="room-title">{{ myRoomName }}</h1>
				<input
					class="btn btn-large btn-danger"
					type="button"
					id="buttonLeaveRoom"
					@click="leaveRoom"
					value="Leave room"
				/>
			</div>
			<div v-if="mainPublication" id="main-video" class="col-md-6">
				<p class="participant-name">{{ getParticipantName(mainPublication.trackSid) }}</p>
				<OvVideo v-if="mainPublication.videoTrack"
					:track="mainPublication.videoTrack"
				/>
			</div>
			<div v-if="localPublication && localPublication.videoTrack" id="video-container" class="col-md-6">
				<p class="participant-name">{{ myParticipantName }}</p>
				<OvVideo
					:track="localPublication.videoTrack"
					@click="updateMainPublication(localPublication)"
				/>

				<div
					v-for="publication in remotePublications"
					:key="publication.trackSid"
				>
					<p v-if="publication.videoTrack" class="participant-name">
						{{ getParticipantName(publication.trackSid) }}
					</p>

					<OvVideo
						v-if="publication.videoTrack"
						:track="publication.videoTrack"
						@click="updateMainPublication(publication)"
					/>
					<OvAudio
						v-if="publication.audioTrack"
						:track="publication.audioTrack"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import axios from 'axios';

import OvVideo from './components/OvVideo.vue';
import OvAudio from './components/OvAudio.vue';
import { Room, RoomEvent } from 'livekit-client';

axios.defaults.headers.post['Content-Type'] = 'application/json';

const APPLICATION_SERVER_URL = 'http://localhost:5000/';

export default {
	name: 'App',

	components: {
    OvVideo,
    OvAudio
},

	data() {
		return {
			// OpenVidu objects
			room: undefined,
			mainPublication: undefined,
			localPublication: undefined,
			remotePublications: [],

			// Join form
			myRoomName: 'RoomA',
			myParticipantName: 'Participant' + Math.floor(Math.random() * 100),
		};
	},

	methods: {
		joinRoom() {
			// --- 1) Init a room ---
			this.room = new Room();

			// --- 2) Specify the actions when events take place in the room ---

			// On every new Track received...
			this.room.on(
				RoomEvent.TrackSubscribed,
				(track, publication, participant) => {
					console.log('Track subscribed', track, publication, participant);
					// Store the new publication in remotePublications array
					this.remotePublications.push(publication);
				}
			);

			// On every track destroyed...
			this.room.on(
				RoomEvent.TrackUnsubscribed,
				(track, publication, participant) => {
					console.log('Track unsubscribed', track, publication, participant);
					// Remove the publication from 'remotePublications' array
					this.deleteRemoteTrackPublication(publication);
				}
			);

			// --- 3) Connect to the room with a valid access token ---

			// Get a token from the application backend
			this.getToken(this.myRoomName, this.myParticipantName).then((token) => {
				const livekitUrl = this.getLivekitUrlFromMetadata(token);
				// First param is the token. Second param can be retrieved by every user on event
				// 'streamCreated' (property Stream.connection.data), and will be appended to DOM as the user's nickname
				this.room
					.connect(livekitUrl, token)
					.then(async () => {
						// --- 4) Publish your local tracks ---
						await this.room.localParticipant.setMicrophoneEnabled(true);
						const videoPublication = await this.room.localParticipant.setCameraEnabled(true);

						// Set the main video in the page to display our webcam and store our localPublication
						this.localPublication = videoPublication;
						this.mainPublication = videoPublication;
					})
					.catch((error) => {
						console.log(
							'There was an error connecting to the room:',
							error.code,
							error.message
						);
					});
			});

			window.addEventListener('beforeunload', this.leaveRoom);
		},

		leaveRoom() {
			// --- 7) Leave the room by calling 'disconnect' method over the Session object ---
			if (this.room) this.room.disconnect();

			// Empty all properties...
			this.room = undefined;
			this.mainPublication = undefined;
			this.localPublication = undefined;
			this.remotePublications = [];
			// Remove beforeunload listener
			window.removeEventListener('beforeunload', this.leaveRoom);
		},

		getParticipantName(trackSid) {
			if(!this.localPublication) return;
			const isLocalTrack = trackSid === this.localPublication.trackSid;

			if (isLocalTrack) {
				// Return local participant name
				return this.myParticipantName;
			}

			// Find in remote participants the participant with the track and return his name
			const remoteParticipant = Array.from(
				this.room.participants.values()
			).find((p) => {
				return p.getTracks().some((t) => t.trackSid === trackSid);
			});
			return remoteParticipant?.identity;
		},

		updateMainPublication(publication) {
			this.mainPublication = publication;
		},

		deleteRemoteTrackPublication(publication) {
			let index = this.remotePublications.findIndex(
				(p) => p.trackSid === publication.trackSid
			);
			if (index > -1) {
				this.remotePublications.splice(index, 1);
			}
		},


		getLivekitUrlFromMetadata(token) {
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
		},

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
		async getToken(roomName, participantName) {
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
	},
};
</script>
