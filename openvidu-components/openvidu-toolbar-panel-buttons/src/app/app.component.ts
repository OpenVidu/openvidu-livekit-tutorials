import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { lastValueFrom } from "rxjs";

import { environment } from 'src/environments/environment';
import { OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule } from "openvidu-angular";

@Component({
    selector: "app-root",
    template: `
		<ov-videoconference [token]="token" [toolbarDisplaySessionName]="false" (onTokenRequested)="onTokenRequested($event)">
			<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
				<button (click)="onButtonClicked()">MY PANEL</button>
			</div>
		</ov-videoconference>
	`,
    styles: [],
    standalone: true,
    imports: [OpenViduAngularModule, ApiDirectiveModule, OpenViduAngularDirectiveModule]
})
export class AppComponent {

  // Set the application server URL from the environment variables
  APPLICATION_SERVER_URL = environment.applicationServerUrl;

  // Set the room name
  roomName = "toolbar-additional-panel-btn";

  // Initialize the token variable
  token!: string;

  constructor(private httpClient: HttpClient) { }

  // Method to request a token for a participant
  async onTokenRequested(participantName: string) {
    const { token } = await this.getToken(this.roomName, participantName);
    this.token = token;
  }

  // Method to handle button click
  onButtonClicked() {
    alert('button clicked');
  }

  // Method to get a token from the backend
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
