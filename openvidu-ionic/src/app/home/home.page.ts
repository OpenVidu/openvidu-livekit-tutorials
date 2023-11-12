import { Component, HostListener } from '@angular/core';
import {
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  TrackPublishOptions,
} from 'livekit-client';
import { HttpClient } from '@angular/common/http';
import { AlertController, Platform } from '@ionic/angular';
import { lastValueFrom, take } from 'rxjs';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  APPLICATION_SERVER_URL = 'http://localhost:5000/';

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
  private isFrontCamera: boolean = false;

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

    // WARNING!! To make the mobile development easier, this code allows
    // using your local IP address for communicating with the backend.
    // For production uses, the server should be accessible from the Internet
    if (this.platform.is('hybrid')) {
      if (environment.externalIp) {
        console.warn('Your local IP address: ', environment.externalIp);
        this.APPLICATION_SERVER_URL = this.APPLICATION_SERVER_URL.replace(
          'localhost',
          environment.externalIp
        );
      }
    }
  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    // On window closed leave room
    this.leaveRoom();
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

      let livekitUrl = this.getLivekitUrlFromMetadata(token);

      if (environment.externalIp) {
        // WARNING!! To make the mobile development easier, this code allows
        // using your local IP address for communicating with the backend.
        // For production uses, the server should be accessible from the Internet
        livekitUrl = livekitUrl.replace('localhost', environment.externalIp);
      }

      // First param is the LiveKit server URL. Second param is the access token

      await this.room.connect(livekitUrl, token);

      // --- 5) Requesting and Checking Android Permissions
      if (this.platform.is('hybrid') && this.platform.is('android')) {
        await this.checkAndroidPermissions();
      }

      const publishOptions: TrackPublishOptions = {
        stream: 'test',
      };

      const [audioPublication, videoPublication] = await Promise.all([
        this.room.localParticipant.setMicrophoneEnabled(true),
        this.room.localParticipant.setCameraEnabled(true),
      ]);

      // Set the main video in the page to display our webcam and store our localPublication
      this.localPublication = videoPublication;
      this.refreshVideos();
      await this.initDevices();
    } catch (error: any) {
      console.log(
        'There was an error connecting to the room:',
        error.code,
        error.message
      );
    }
  }

  leaveRoom() {
    // --- 7) Leave the room by calling 'disconnect' method over the Session object ---

    if (this.room) {
      this.room.disconnect();
    }

    // Empty all properties...
    this.remotePublications = [];
    this.localPublication = undefined;
    this.room = undefined;
    this.generateParticipantInfo();
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
    const remoteParticipant = Array.from(this.room.participants.values()).find(
      (p) => {
        return p.getTracks().some((t) => t.trackSid === trackSid);
      }
    );
    return remoteParticipant?.identity;
  }

  async toggleCamera() {
    if (this.room) {
      const enabled = !this.room.localParticipant.isCameraEnabled;
      // const options: VideoCaptureOptions = {};
      // const publishOptions: TrackPublishOptions = {
      //   stream: 'test',
      // };

      await this.room.localParticipant.setCameraEnabled(enabled);
      this.refreshVideos();
      this.cameraIcon = enabled ? 'videocam' : 'eye-off';
    }
  }

  async toggleMicrophone() {
    if (this.room) {
      const enabled = !this.room.localParticipant.isMicrophoneEnabled;
      const publishOptions: TrackPublishOptions = {
        stream: 'test',
      };
      await this.room.localParticipant.setMicrophoneEnabled(
        enabled,
        undefined,
        publishOptions
      );
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
          },
        },
      ],
    });

    await alert.present();
  }

  private refreshVideos() {
    // setTimeout(() => {
    //     console.warn('track restarted: UPDATED DOM');
    //     const refreshedElement = document.getElementById('refreshed-workaround');
    //     if (refreshedElement) {
    //       refreshedElement.remove();
    //     } else {
    //       const p = document.createElement('p');
    //       p.id = 'refreshed-workaround';
    //       document.getElementById('room')?.appendChild(p);
    //     }
    // }, 200);
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

  private getLivekitUrlFromMetadata(token: string): string {
    if (!token)
      throw new Error('Trying to get room metadata from an empty token');
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      if (!payload?.metadata)
        throw new Error('Token does not contain metadata');
      const metadata = JSON.parse(payload.metadata);
      return metadata.livekitUrl;
    } catch (error) {
      throw new Error('Error decoding and parsing token: ' + error);
    }
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
