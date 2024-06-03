import { Component } from '@angular/core';
import {
	RecordingInfo,
	OpenViduComponentsModule,
	ApiDirectiveModule,
	RecordingStatus,
	RecordingOutputMode,
	RecordingDeleteRequestedEvent,
} from 'openvidu-components-angular';

@Component({
	selector: 'app-root',
	template: `
		<!-- Reference documentation: https://docs.openvidu.io/en/stable/api/openvidu-components-angular/components/AdminLoginComponent.html -->
		@if (!logged) {
		<ov-admin-login
			(onLoginRequested)="onLoginClicked($event)"
		></ov-admin-login>
		}

		<!-- Reference documentation: https://docs.openvidu.io/en/stable/api/openvidu-components-angular/components/AdminDashboardComponent.html -->
		@if (logged) {
		<ov-admin-dashboard
			[recordingsList]="recordings"
			(onLogoutRequested)="onLogoutClicked()"
			(onRefreshRecordingsRequested)="onRefreshRecordingsClicked()"
			(onLoadMoreRecordingsRequested)="onLoadMoreRecordingsRequested()"
			(onRecordingDeleteRequested)="onDeleteRecordingClicked($event)"
		></ov-admin-dashboard>
		}
	`,
	standalone: true,
	imports: [OpenViduComponentsModule, ApiDirectiveModule],
})
export class AppComponent {
	title = 'openvidu-admin-dashboard';
	logged: boolean = false;
	recordings: RecordingInfo[] = [
		{
			id: 'recording1',
			roomName: this.title,
			roomId: 'roomId1',
			outputMode: RecordingOutputMode.COMPOSED,
			status: RecordingStatus.READY,
			filename: 'sampleRecording.mp4',
			startedAt: new Date().getTime(),
			endedAt: new Date().getTime(),
			duration: 0,
			size: 100,
			location: 'http://localhost:8080/recordings/recording1',
		},
	];

	constructor() {}

	onLoginClicked(credentials: { username: string; password: string }) {
		console.log(`Loggin button clicked ${credentials}`);
		/**
		 * WARNING! This code is developed for didactic purposes only.
		 * The authentication process should be done in the server side.
		 **/
		this.logged = true;
	}

	onLogoutClicked() {
		console.log('Logout button clicked');
		/**
		 * WARNING! This code is developed for didactic purposes only.
		 * The authentication process should be done in the server side.
		 **/
		this.logged = false;
	}

	onRefreshRecordingsClicked() {
		console.log('Refresh recording clicked');
		/**
		 * WARNING! This code is developed for didactic purposes only.
		 * The authentication process should be done in the server side.
		 **/
		// Getting the recordings from the server
		this.recordings = [
			{
				id: 'recording2',
				roomName: this.title,
				roomId: 'roomId2',
				outputMode: RecordingOutputMode.COMPOSED,
				status: RecordingStatus.READY,
				filename: 'sampleRecording2.mp4',
				startedAt: new Date().getTime(),
				endedAt: new Date().getTime(),
				duration: 0,
				size: 100,
				location: 'http://localhost:8080/recordings/recording2',
			},
		];
	}

	onLoadMoreRecordingsRequested() {
		console.log('Load more recordings clicked');
	}

	onDeleteRecordingClicked(recording: RecordingDeleteRequestedEvent) {
		console.log(`Delete recording clicked ${recording.recordingId}`);
	}
}
