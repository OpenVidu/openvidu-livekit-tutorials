import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { lastValueFrom } from "rxjs";
import { environment } from 'src/environments/environment';
import { OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule } from "openvidu-angular";

@Component({
    selector: "app-root",
    template: `
		<ov-videoconference
			[token]="token"
			[livekitUrl]="LIVEKIT_URL"
			[toolbarRecordingButton]="false"
			[toolbarDisplayRoomName]="false"
			(onTokenRequested)="onTokenRequested($event)">

			<!-- Custom activities panel -->
			<div *ovActivitiesPanel id="my-panel">
				<h3>ACTIVITIES</h3>
				<div>
					CUSTOM ACTIVITIES
				</div>
			</div>
		</ov-videoconference>
	`,
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule]
})
export class AppComponent {

	APPLICATION_SERVER_URL = environment.applicationServerUrl;
	LIVEKIT_URL = environment.livekitUrl;
	roomName = "custom-activities-panel";
	token!: string;

	constructor(private httpClient: HttpClient) { }

	async onTokenRequested(participantName: string) {
		const { token } = await this.getToken(this.roomName, participantName);
		this.token = token;
	}

	getToken(roomName: string, participantName: string): Promise<any> {
		try {
			return lastValueFrom(this.httpClient.post<any>(this.APPLICATION_SERVER_URL + 'token', { roomName, participantName }));
		} catch (error: any) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}
}