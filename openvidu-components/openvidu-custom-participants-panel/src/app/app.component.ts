import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { lastValueFrom, Subscription } from "rxjs";

import { ParticipantModel, ParticipantService } from "openvidu-angular";
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-root',
	template: `
		<!-- OpenVidu Video Conference Component -->
		<ov-videoconference [token]="token" (onTokenRequested)="onTokenRequested($event)">

			<!-- Custom Participants Panel -->
			<div *ovParticipantsPanel id="my-panel">
				<ul id="local">
					<li>{{localParticipant.name}}</li>
				</ul>
				<ul id="remote">
					<li *ngFor="let p of remoteParticipants">{{p.name}}</li>
				</ul>
			</div>

		</ov-videoconference>
  `,
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
	// Define the URL of the application server
	APPLICATION_SERVER_URL = environment.applicationServerUrl;
	// Define the name of the room and initialize the token variable
	roomName = 'custom-participants-panel';
	token!: string;

	// Participant-related properties
	localParticipant!: ParticipantModel;
	remoteParticipants!: ParticipantModel[];
	localParticipantSubs!: Subscription;
	remoteParticipantsSubs!: Subscription;

	constructor(private httpClient: HttpClient, private participantService: ParticipantService) { }

	// Subscribes to updates for local and remote participants.
	ngOnInit() {
		this.subscribeToParticipants();
	}

	// Unsubscribes from updates for local and remote participants to prevent memory leaks.
	ngOnDestroy() {
		this.localParticipantSubs.unsubscribe();
		this.remoteParticipantsSubs.unsubscribe();
	}

	// Function called when a participant requests a token to join the room.
	async onTokenRequested(participantName: string) {
		const { token } = await this.getToken(this.roomName, participantName);
		this.token = token;
	}

	// Subscribes to updates for local and remote participants.
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

	// Sends a request to the server to obtain a token for a participant.
	async getToken(roomName: string, participantName: string): Promise<any> {
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
