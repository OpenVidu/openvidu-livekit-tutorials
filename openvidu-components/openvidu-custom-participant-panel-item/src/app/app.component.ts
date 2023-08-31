import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { lastValueFrom } from "rxjs";

import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-root',
	template: `
		<!-- OpenVidu Video Conference Component -->
		<ov-videoconference [token]="token" (onTokenRequested)="onTokenRequested($event)">
			<!-- Participant Panel Items -->
			<div *ovParticipantPanelItem="let participant" style="display: flex">
				<p>{{ participant.name }}</p>

				<!-- More Options Menu -->
				<button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>

				<!-- Menu Content -->
				<mat-menu #menu="matMenu">
					<button mat-menu-item>Button 1</button>
					<button mat-menu-item>Button 2</button>
				</mat-menu>
			</div>
		</ov-videoconference>
  `,
	styles: []
})
export class AppComponent {
	// Define the URL of the application server
	APPLICATION_SERVER_URL = environment.applicationServerUrl;
	// Define the name of the room and initialize the token variable
	roomName = 'participant-panel-item';
	token!: string;

	constructor(private httpClient: HttpClient) { }

	// Function to request a token when a participant joins the room
	async onTokenRequested(participantName: string) {
		const { token } = await this.getToken(this.roomName, participantName);
		this.token = token;
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