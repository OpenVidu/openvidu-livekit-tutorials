import { Component, HostListener } from '@angular/core';
import {
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
} from 'livekit-client';
import { HttpClient } from '@angular/common/http';
import { AlertController, Platform } from '@ionic/angular';
import { lastValueFrom, take } from 'rxjs';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  // For local development launching app in web browser, leave these variables empty
  // For production or when launching app in device, configure them with correct URLs
  APPLICATION_SERVER_URL = '';
  LIVEKIT_URL = '';
  
  private IS_DEVICE_DEV_MODE = false;

  // OpenVidu objects
  room: Room | undefined = undefined;
  localPublication: LocalTrackPublication | undefined = undefined;
  remotePublications: RemoteTrackPublication[] = [];
  // Join form
  myRoomName!: string;
  myParticipantName!: string;
  cameraIcon = 'videocam';
  microphoneIcon = 'mic';
  private cameras: MediaDeviceInfo[] = [];
  private cameraSelected!: MediaDeviceInfo;
  ANDROID_PERMISSIONS = [
    this.androidPermissions.PERMISSION.CAMERA,
    this.androidPermissions.PERMISSION.RECORD_AUDIO,
    this.androidPermissions.PERMISSION.MODIFY_AUDIO_SETTINGS,
  ];

  constructor(
    private httpClient: HttpClient,
    private alertController: AlertController,
    private platform: Platform,
    private androidPermissions: AndroidPermissions
  ) {
    this.generateParticipantInfo();
  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    // On window closed leave room
    this.leaveRoom();
  }

  ngOnInit() {
    this.IS_DEVICE_DEV_MODE = this.platform.is('hybrid');
    this.generateUrls();

    console.log('IS_DEVICE_DEV_MODE: ', this.IS_DEVICE_DEV_MODE);
    console.log('APPLICATION_SERVER_URL: ', this.APPLICATION_SERVER_URL);
    console.log('LIVEKIT_URL: ', this.LIVEKIT_URL);
  }

  generateUrls() {
		// If APPLICATION_SERVER_URL is not configured and app is not launched in device dev mode,
    // use default value from local development
		if (!this.APPLICATION_SERVER_URL && !this.IS_DEVICE_DEV_MODE) {
			if (window.location.hostname === 'localhost') {
				this.APPLICATION_SERVER_URL = 'http://localhost:6080/';
			} else {
				this.APPLICATION_SERVER_URL = 'https://' + window.location.hostname + ':6443/';
			}
		}

		// If LIVEKIT_URL is not configured and app is not launched in device dev mode,
    // use default value from local development
		if (!this.LIVEKIT_URL && !this.IS_DEVICE_DEV_MODE) {
			if (window.location.hostname === 'localhost') {
				this.LIVEKIT_URL = 'ws://localhost:7880/';	
			} else {
				this.LIVEKIT_URL = 'wss://' + window.location.hostname + ':7443/';
			}
		}
	}

  ngOnDestroy() {
    // On component destroyed leave room
    this.leaveRoom();
  }

  async joinRoom() {
    // --- 1) Get a Room object ---

    this.room = new Room();

    // --- 2) Specify the actions when events take place in the room ---

    // On every new Track received...
    this.room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        // Store the new publication in remotePublications array
        this.remotePublications.push(publication);
      }
    );

    // On every track destroyed...
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track, publication, participant) => {
        // Remove the publication from 'remotePublications' array
        this.deleteRemoteTrackPublication(publication);
      }
    );

    try {
      // Get a token from the application backend
      const token = await this.getToken(
        this.myRoomName,
        this.myParticipantName
      );

      // First param is the LiveKit server URL. Second param is the access token

      await this.room.connect(this.LIVEKIT_URL, token);

      // --- 5) Requesting and Checking Android Permissions
      if (this.platform.is('hybrid') && this.platform.is('android')) {
        await this.checkAndroidPermissions();
      }

      const [audioPublication, videoPublication] = await Promise.all([
        this.room.localParticipant.setMicrophoneEnabled(true),
        this.room.localParticipant.setCameraEnabled(true),
      ]);

      // Set the main video in the page to display our webcam and store our localPublication
      this.localPublication = videoPublication;
      videoPublication?.track?.on('elementAttached', (track) => {
        this.refreshVideos();
      });

      await this.initDevices();
    } catch (error: any) {
      console.log(
        'There was an error connecting to the room:',
        error.code,
        error.message
      );
    }
  }

  async leaveRoom() {
    // --- 7) Leave the room by calling 'disconnect' method over the Session object ---

    if (this.room) {
      await this.room.disconnect();
    }

    // Empty all properties...
    this.remotePublications = [];
    this.localPublication = undefined;
    this.room = undefined;
    this.generateParticipantInfo();
    this.cameraIcon = 'videocam';
    this.microphoneIcon = 'mic';
  }

  // Others methods...

  private generateParticipantInfo() {
    // Random user nickname and room name
    this.myRoomName = 'RoomA';
    this.myParticipantName = 'Participant' + Math.floor(Math.random() * 100);
  }

  private deleteRemoteTrackPublication(
    publication: RemoteTrackPublication
  ): void {
    let index = this.remotePublications.findIndex(
      (p) => p.trackSid === publication.trackSid
    );
    if (index > -1) {
      this.remotePublications.splice(index, 1);
    }
  }

  getParticipantName(trackSid: string) {
    const isLocalTrack = trackSid === this.localPublication?.trackSid;

    if (isLocalTrack) {
      // Return local participant name
      return this.myParticipantName;
    }

    // Find in remote participants the participant with the track and return his name
    if (!this.room) return;
    const remoteParticipant = Array.from(this.room.remoteParticipants.values()).find(
      (p) => {
        return p.getTrackPublications().some((t) => t.trackSid === trackSid);
      }
    );
    return remoteParticipant?.identity;
  }

  async toggleCamera() {
    if (this.room) {
      const enabled = !this.room.localParticipant.isCameraEnabled;
      await this.room.localParticipant.setCameraEnabled(enabled);
      this.refreshVideos();
      this.cameraIcon = enabled ? 'videocam' : 'eye-off';
    }
  }

  async toggleMicrophone() {
    if (this.room) {
      const enabled = !this.room.localParticipant.isMicrophoneEnabled;
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      this.microphoneIcon = enabled ? 'mic' : 'mic-off';
    }
  }

  async swapCamera() {
    try {
      const newCamera = this.cameras.find(
        (cam) => cam.deviceId !== this.cameraSelected.deviceId
      );

      if (newCamera && this.room) {
        await this.room.switchActiveDevice('videoinput', newCamera.deviceId);
        this.cameraSelected = newCamera;

        this.refreshVideos();
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * This method allows to change the LiveKit websocket URL and the application server URL
   * from the application itself. This is useful for development purposes.
   */
  async presentSettingsAlert() {
    const alert = await this.alertController.create({
      header: 'Application server',
      inputs: [
        {
          name: 'url',
          type: 'text',
          value: this.APPLICATION_SERVER_URL,
          placeholder: 'URL',
          id: 'url-input',
        },
        {
          name: 'websocket',
          type: 'text',
          value: this.LIVEKIT_URL,
          placeholder: 'WS URL',
          id: 'ws-input',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          id: 'cancel-btn',
          cssClass: 'secondary',
        },
        {
          text: 'Ok',
          id: 'ok-btn',
          handler: (data) => {
            this.APPLICATION_SERVER_URL = data.url;
            this.LIVEKIT_URL = data.websocket;
          },
        },
      ],
    });

    await alert.present();
  }

  private refreshVideos() {
    if (this.platform.is('hybrid') && this.platform.is('android')) {
      // Workaround for Android devices
      setTimeout(() => {
        const refreshedElement = document.getElementById(
          'refreshed-workaround'
        );
        if (refreshedElement) {
          refreshedElement.remove();
        } else {
          const p = document.createElement('p');
          p.id = 'refreshed-workaround';
          document.getElementById('room')?.appendChild(p);
        }
      }, 250);
    }
  }

  private async checkAndroidPermissions(): Promise<void> {
    await this.platform.ready();
    try {
      await this.androidPermissions.requestPermissions(
        this.ANDROID_PERMISSIONS
      );
      const promisesArray: Promise<any>[] = [];
      this.ANDROID_PERMISSIONS.forEach((permission) => {
        console.log('Checking ', permission);
        promisesArray.push(this.androidPermissions.checkPermission(permission));
      });
      const responses = await Promise.all(promisesArray);
      let allHasPermissions = true;
      responses.forEach((response, i) => {
        allHasPermissions = response.hasPermission;
        if (!allHasPermissions) {
          throw new Error('Permissions denied: ' + this.ANDROID_PERMISSIONS[i]);
        }
      });
    } catch (error) {
      console.error('Error requesting or checking permissions: ', error);
      throw error;
    }
  }

  private async initDevices() {
    this.cameras = await Room.getLocalDevices('videoinput');
    this.cameraSelected = this.cameras[0];
  }

  /**
   * --------------------------------------------
   * GETTING A TOKEN FROM YOUR APPLICATION SERVER
   * --------------------------------------------
   * The methods below request the creation of a Token to
   * your application server. This keeps your OpenVidu deployment secure.
   *
   * In this sample code, there is no user control at all. Anybody could
   * access your application server endpoints! In a real production
   * environment, your application server must identify the user to allow
   * access to the endpoints.
   *
   */
  async getToken(roomName: string, participantName: string): Promise<any> {
    const response = this.httpClient
      .post(
        this.APPLICATION_SERVER_URL + 'token',
        { roomName, participantName },
        {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'text',
        }
      )
      .pipe(take(1));

    return lastValueFrom(response);
  }
}
