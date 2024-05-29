import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { lastValueFrom } from "rxjs";

import { environment } from 'src/environments/environment';
import { OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule } from "openvidu-angular";

@Component({
    selector: "app-root",
    template: `
		<!-- OpenVidu Video Conference Component -->
		<ov-videoconference [token]="token" (onTokenRequested)="onTokenRequested($event)">
			<!-- Custom Panels -->
			<ov-panel *ovPanel>

				<!-- Custom Chat Panel -->
				<div *ovChatPanel id="my-chat-panel">This is my custom chat panel</div>

				<!-- Custom Participants Panel -->
				<div *ovParticipantsPanel id="my-participants-panel">
					This is my custom participants panel
				</div>

				<!-- Custom Activities Panel -->
				<div *ovActivitiesPanel id="my-activities-panel">This is my custom activities panel</div>

			</ov-panel>
		</ov-videoconference>
	`,
    styleUrls: ["./app.component.scss"],
    standalone: true,
    imports: [OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule]
})
export class AppComponent {
	// Define the URL of the application server
	APPLICATION_SERVER_URL = environment.applicationServerUrl;

	// Define the name of the room and initialize the token variable
	roomName = 'custom-panels';
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