import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { lastValueFrom } from "rxjs";

import { ParticipantService, OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule } from "openvidu-angular";
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-root',
    template: `
		<ov-videoconference [token]="token" (onTokenRequested)="onTokenRequested($event)">
			<div *ovToolbar style="text-align: center;">
				<button (click)="toggleVideo()">Toggle Video</button>
				<button (click)="toggleAudio()">Toggle Audio</button>
			</div>
		</ov-videoconference>
	`,
    standalone: true,
    imports: [OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule]
})
export class AppComponent {

	// The URL of the application server.
	APPLICATION_SERVER_URL = environment.applicationServerUrl;

	// The name of the room.
	roomName = 'custom-toolbar';

	// The token used to connect to the videoconference.
	token!: string;

	constructor(private httpClient: HttpClient, private participantService: ParticipantService) { }

	// Called when a token is requested for a participant.
	async onTokenRequested(participantName: string) {
		const { token } = await this.getToken(this.roomName, participantName);
		this.token = token;
	}

	// Toggles the camera on and off.
	async toggleVideo() {
		const isCameraEnabled = this.participantService.isMyCameraEnabled();
		await this.participantService.setCameraEnabled(!isCameraEnabled);
	}

	// Toggles the microphone on and off.
	async toggleAudio() {
		const isMicrophoneEnabled = this.participantService.isMyMicrophoneEnabled();
		await this.participantService.setMicrophoneEnabled(!isMicrophoneEnabled);
	}

	// Gets a token for a participant.
	getToken(roomName: string, participantName: string): Promise<any> {
		try {
			return lastValueFrom(this.httpClient.post<any>(this.APPLICATION_SERVER_URL + 'api/sessions', { roomName, participantName }));
		} catch (error: any) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}
}