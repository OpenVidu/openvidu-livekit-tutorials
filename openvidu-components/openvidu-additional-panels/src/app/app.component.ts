import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { lastValueFrom } from "rxjs";

import { PanelEvent, PanelService } from "openvidu-angular";
import { environment } from 'src/environments/environment';

@Component({
	selector: "app-root",
	template: `
			<!-- OpenVidu Video Conference Component -->
			<ov-videoconference [token]="token" [toolbarDisplaySessionName]="false" (onTokenRequested)="onTokenRequested($event)">
			<!-- Additional Toolbar Buttons -->
			<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
				<button mat-icon-button (click)="toggleMyPanel('my-panel1')">
				<mat-icon>360</mat-icon>
				</button>
				<button mat-icon-button (click)="toggleMyPanel('my-panel2')">
				<mat-icon>star</mat-icon>
				</button>
			</div>

			<!-- Additional Panels -->
			<div *ovAdditionalPanels id="my-panels">
				<div id="my-panel1" *ngIf="showExternalPanel">
				<h2>NEW PANEL 1</h2>
				<p>This is my new additional panel</p>
				</div>
				<div id="my-panel2" *ngIf="showExternalPanel2">
				<h2>NEW PANEL 2</h2>
				<p>This is another new panel</p>
				</div>
			</div>
			</ov-videoconference>
	`,
	styleUrls: ["./app.component.scss"]
})
export class AppComponent {

	// Define the URL of the application server
	APPLICATION_SERVER_URL = environment.applicationServerUrl;

	// Define the name of the room and initialize the token variable
	roomName = 'additional-panels';
	token!: string;

	// Flags to control the visibility of external panels
	showExternalPanel: boolean = false;
	showExternalPanel2: boolean = false;

	constructor(private httpClient: HttpClient, private panelService: PanelService) { }

	ngOnInit() {
		this.subscribeToPanelToggling();
	}

	// Function to request a token when a participant joins the room
	async onTokenRequested(participantName: string) {
		const { token } = await this.getToken(this.roomName, participantName);
		this.token = token;
	}

	// Subscribe to panel toggling events
	subscribeToPanelToggling() {
		this.panelService.panelOpenedObs.subscribe((ev: PanelEvent) => {
			this.showExternalPanel = ev.isOpened && ev.panelType === 'my-panel1';
			this.showExternalPanel2 = ev.isOpened && ev.panelType === 'my-panel2';
		});
	}

	// Toggle the visibility of external panels
	toggleMyPanel(type: string) {
		this.panelService.togglePanel(type);
	}

	// Function to get a token from the server
	async getToken(roomName: string, participantName: string): Promise<any> {
		try {
			// Send a POST request to the server to obtain a token
			return lastValueFrom(this.httpClient.post<any>(this.APPLICATION_SERVER_URL + 'api/sessions', { roomName, participantName }));
		} catch (error: any) {
			// Handle errors, e.g., if the server is not reachable
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with the backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}
}