import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { lastValueFrom } from "rxjs";

import { OpenViduService, OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule } from "openvidu-angular";
import { environment } from 'src/environments/environment';


@Component({
    selector: "app-root",
    template: `
		<!-- OpenVidu Video Conference Component -->
		@if (connected) {
		  <ov-videoconference
		    [token]="token"
		    [toolbarDisplaySessionName]="false"
		    (onTokenRequested)="onTokenRequested($event)"
		    >
		    <!-- Participant Panel Item Elements -->
		    <div *ovParticipantPanelItemElements="let participant">
		      <!-- Leave Button for Local Participant -->
		      @if (participant.isLocal) {
		        <button (click)="leaveSession()">
		          Leave
		        </button>
		      }
		    </div>
		  </ov-videoconference>
		}
		
		<!-- Session Disconnected Message -->
		@if (!connected) {
		  <div style="text-align: center;">Session disconnected</div>
		}
		`,
    styles: [],
    standalone: true,
    imports: [OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule]
})
export class AppComponent {
	// Define the URL of the application server
	APPLICATION_SERVER_URL = environment.applicationServerUrl;

	// Define the name of the room and initialize the token variable
	roomName = 'participant-panel-item-elements';
	token!: string;

	// Flag to indicate session connection status
	connected = true;

	constructor(private httpClient: HttpClient, private openviduService: OpenViduService) { }

	// Function to request a token when a participant joins the room
	async onTokenRequested(participantName: string) {
		const { token } = await this.getToken(this.roomName, participantName);
		this.token = token;
	}

	// Function to leave the session
	async leaveSession() {
		await this.openviduService.disconnectRoom();
		this.connected = false;
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