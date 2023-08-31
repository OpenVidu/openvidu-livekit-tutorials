import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { lastValueFrom, Subscription } from "rxjs";
import { ParticipantModel, ParticipantService } from "openvidu-angular";
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-root',
	template: `
		<!-- OpenVidu Video Conference Component -->
		<ov-videoconference
			[token]="token"
			(onTokenRequested)="onTokenRequested($event)"
		>
			<!-- Custom Layout for Video Streams -->
			<div *ovLayout>
				<div class="container">
					<!-- Local Participant's Tracks -->
					<div *ngFor="let track of localParticipant.tracks" class="item"
					[ngClass]="{'hidden': track.isAudioTrack && !track.participant.onlyHasAudioTracks}"
					>
						<ov-stream [track]="track"></ov-stream>
					</div>

					<!-- Remote Participants' Tracks -->
					<div *ngFor="let track of remoteParticipants | tracks" class="item"
					[ngClass]="{'hidden': track.isAudioTrack && !track.participant.onlyHasAudioTracks}"
					>
						<ov-stream [track]="track"></ov-stream>
					</div>
				</div>
			</div>
		</ov-videoconference>
	`,
	styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
	// Define the URL of the application server
	APPLICATION_SERVER_URL = environment.applicationServerUrl;

	// Define the name of the room and initialize the token variable
	roomName = 'custom-layout';
	token!: string;

	// Participant-related properties
	localParticipant!: ParticipantModel;
	remoteParticipants!: ParticipantModel[];
	localParticipantSubs!: Subscription;
	remoteParticipantsSubs!: Subscription;

	constructor(
		private httpClient: HttpClient,
		private participantService: ParticipantService
	) { }

	ngOnInit() {
		// Subscribe to participants' updates
		this.subscribeToParticipants();
	}

	// Function to request a token when a participant joins the room
	async onTokenRequested(participantName: string) {
		const { token } = await this.getToken(this.roomName, participantName);
		this.token = token;
	}

	ngOnDestroy() {
		// Unsubscribe from participant updates to prevent memory leaks
		this.localParticipantSubs.unsubscribe();
		this.remoteParticipantsSubs.unsubscribe();
	}

	// Subscribe to updates for local and remote participants
	subscribeToParticipants() {
		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
			if (p) this.localParticipant = p;
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe(
			(participants) => {
				this.remoteParticipants = participants;
			}
		);
	}

	// Function to get a token from the server
	getToken(roomName: string, participantName: string): Promise<any> {
		try {
			// Send a POST request to the server to obtain a token
			return lastValueFrom(
				this.httpClient.post<any>(this.APPLICATION_SERVER_URL + 'api/sessions', {
					roomName,
					participantName,
				})
			);
		} catch (error: any) {
			// Handle errors, e.g., if the server is not reachable
			if (error.status === 404) {
				throw {
					status: error.status,
					message: 'Cannot connect with the backend. ' + error.url + ' not found',
				};
			}
			throw error;
		}
	}
}