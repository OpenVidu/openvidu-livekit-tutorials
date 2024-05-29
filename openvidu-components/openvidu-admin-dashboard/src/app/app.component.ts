import { Component } from "@angular/core";
import { RecordingInfo, OpenViduAngularModule, ApiDirectiveModule } from "openvidu-angular";


@Component({
    selector: "app-root",
    template: `
		<!-- Reference documentation: https://docs.openvidu.io/en/stable/api/openvidu-angular/components/AdminLoginComponent.html -->
		@if (!logged) {
		  <ov-admin-login
		    (onLoginButtonClicked)="onLoginClicked($event)"
		  ></ov-admin-login>
		}
		
		<!-- Reference documentation: https://docs.openvidu.io/en/stable/api/openvidu-angular/components/AdminDashboardComponent.html -->
		@if (logged) {
		  <ov-admin-dashboard
		    [recordingsList]="recordings"
		    (onLogoutClicked)="onLogoutClicked()"
		    (onRefreshRecordingsClicked)="onRefreshRecordingsClicked()"
		    (onDeleteRecordingClicked)="onDeleteRecordingClicked($event)"
		  ></ov-admin-dashboard>
		}
		`,
    standalone: true,
    imports: [OpenViduAngularModule, ApiDirectiveModule]
})
export class AppComponent {
	title = "openvidu-admin-dashboard";
	logged: boolean = false;
	recordings: RecordingInfo[] = [];

	constructor() {}

	onLoginClicked(password: string) {
		console.log(`Loggin button clicked ${password}`);
		/**
		 * WARNING! This code is developed for didactic purposes only.
		 * The authentication process should be done in the server side.
		 **/
		this.logged = true;
	}

	onLogoutClicked() {
		console.log("Logout button clicked");
		/**
		 * WARNING! This code is developed for didactic purposes only.
		 * The authentication process should be done in the server side.
		 **/
		this.logged = false;
	}

	onRefreshRecordingsClicked() {
		console.log("Refresh recording clicked");
	}

	onDeleteRecordingClicked(recordingId: string) {
		console.log(`Delete recording clicked ${recordingId}`);
	}
}
