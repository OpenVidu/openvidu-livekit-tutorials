import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnDestroy } from '@angular/core';
import {
	Room,
	RoomEvent,
	RemoteParticipant,
	RemoteTrackPublication,
	RemoteTrack,
	LocalTrackPublication,
} from 'livekit-client';
import { environment } from '../environments/environment';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnDestroy {
	APPLICATION_SERVER_URL = environment.applicationServerUrl;
	room: Room;
	localPublication: LocalTrackPublication;
	remotePublications: RemoteTrackPublication[] = [];

	// Join form
	myRoomName: string;
	myParticipantName: string;

	// Main video of the page, will be 'localPublication' or one of the 'remotePublications',
	// updated by click event in OpenViduVideoComponent children
	mainPublication: LocalTrackPublication | RemoteTrackPublication;

	constructor(private httpClient: HttpClient) {
		this.generateParticipantInfo();
	}

	@HostListener('window:beforeunload')
	beforeunloadHandler() {
		// On window closed leave session
		this.leaveRoom();
	}

	ngOnDestroy() {
		// On component destroyed leave session
		this.leaveRoom();
	}

	joinRoom() {
		// --- 1) Get a Room object ---

		this.room = new Room();

		// --- 2) Specify the actions when events take place in the room ---

		// On every new Track received...
		this.room.on(
			RoomEvent.TrackSubscribed,
			(
				track: RemoteTrack,
				publication: RemoteTrackPublication,
				participant: RemoteParticipant
			) => {
				// Store the new publication in remotePublications array
				this.remotePublications.push(publication);
			}
		);

		// On every track destroyed...
		this.room.on(
			RoomEvent.TrackUnsubscribed,
			(track, publication, participant) => {
				// Remove the publication from 'remotePublications' array
				this.deleteRemoteTrackPublication(publication);
			}
		);

		// --- 3) Connect to the room with a valid access token ---

		// Get a token from the application backend
		this.getToken(this.myRoomName, this.myParticipantName).then(
			async (token) => {
				const livekitUrl = this.getLivekitUrlFromMetadata(token);

				// First param is the LiveKit server URL. Second param is the access token
				try {
					await this.room.connect(livekitUrl, token);
					// --- 4) Publish your local tracks ---
					await this.room.localParticipant.setMicrophoneEnabled(true);
					const videoPublication = await this.room.localParticipant.setCameraEnabled(true);

					// Set the main video in the page to display our webcam and store our localPublication
					this.localPublication = videoPublication;
					this.mainPublication = videoPublication;
				} catch (error) {
					console.log(
						'There was an error connecting to the room:',
						error.code,
						error.message
					);
				}
			}
		);
	}

	leaveRoom() {
		// --- 5) Leave the session by calling 'disconnect' method over the Room object ---

		if (this.room) {
			this.room.disconnect();
		}

		// Empty all properties...
		this.remotePublications = [];
		delete this.localPublication;
		delete this.room;

		this.generateParticipantInfo();
	}

	getParticipantName(trackSid: string) {
		const isLocalTrack = trackSid === this.localPublication.trackSid;

		if (isLocalTrack) {
			// Return local participant name
			return this.myParticipantName;
		}

		// Find in remote participants the participant with the track and return his name
		const remoteParticipant = Array.from(this.room.participants.values()).find(
			(p) => {
				return p.getTracks().some((t) => t.trackSid === trackSid);
			}
		);
		return remoteParticipant?.identity;
	}

	private generateParticipantInfo() {
		// Random participant and room name
		this.myRoomName = 'RoomA';
		this.myParticipantName = 'Participant' + Math.floor(Math.random() * 100);
	}

	private deleteRemoteTrackPublication(
		publication: RemoteTrackPublication
	): void {
		let index = this.remotePublications.findIndex(
			(p) => p.trackSid === publication.trackSid
		);
		if (index > -1) {
			this.remotePublications.splice(index, 1);
		}
	}

	updateMainStreamManager(
		publication: LocalTrackPublication | RemoteTrackPublication
	) {
		this.mainPublication = publication;
	}

	private getLivekitUrlFromMetadata(token: string): string {
		if (!token)
			throw new Error('Trying to get room metadata from an empty token');
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
			if (!payload?.metadata)
				throw new Error('Token does not contain metadata');
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
	 * Visit https://docs.openvidu.io/en/stable/application-server to learn
	 * more about the integration of OpenVidu in your application server.
	 */

	async getToken(roomName: string, participantName: string): Promise<string> {
		return this.httpClient
			.post(
				this.APPLICATION_SERVER_URL + 'token',
				{ roomName, participantName },
				{
					headers: { 'Content-Type': 'application/json' },
					responseType: 'text',
				}
			)
			.toPromise();
	}
}
