import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    IonApp,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonTitle,
    IonToolbar,
    Platform,
} from '@ionic/angular/standalone';
import {
    LocalVideoTrack,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Room,
    RoomEvent,
} from 'livekit-client';
import { lastValueFrom } from 'rxjs';
import { VideoComponent } from './video/video.component';
import { AudioComponent } from './audio/audio.component';
import { addIcons } from 'ionicons';
import { logoGithub, book, settings } from 'ionicons/icons';

type TrackInfo = {
    trackPublication: RemoteTrackPublication;
    participantIdentity: string;
};

// When running OpenVidu locally and launching app in web browser, leave these variables empty
// For other deployment type or when launching app in a mobile device, configure them with correct URLs
// If you leave them empty when launching app in a mobile device, the user will be prompted to enter the URLs
var APPLICATION_SERVER_URL = '';
var LIVEKIT_URL = '';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrl: 'app.component.scss',
    standalone: true,
    imports: [
        IonApp,
        VideoComponent,
        AudioComponent,
        ReactiveFormsModule,
        IonHeader,
        IonToolbar,
        IonTitle,
        IonButtons,
        IonButton,
        IonIcon,
        IonContent,
        IonList,
        IonItem,
        IonInput,
        IonFooter,
    ],
})
export class AppComponent implements OnDestroy {
    roomForm = new FormGroup({
        roomName: new FormControl('Test Room', Validators.required),
        participantName: new FormControl('Participant' + Math.floor(Math.random() * 100), Validators.required),
    });

    urlsForm = new FormGroup({
        serverUrl: new FormControl(APPLICATION_SERVER_URL, Validators.required),
        livekitUrl: new FormControl(LIVEKIT_URL, Validators.required),
    });

    room = signal<Room | undefined>(undefined);
    localTrack = signal<LocalVideoTrack | undefined>(undefined);
    remoteTracksMap = signal<Map<string, TrackInfo>>(new Map());

    settingUrls = signal(false);

    constructor(private httpClient: HttpClient, private platform: Platform) {
        this.configureUrls();
        addIcons({
            logoGithub,
            book,
            settings,
        });
    }

    configureUrls() {
        const mobileMode = this.platform.is('hybrid');

        // If URLs are not configured and app is launched in a mobile device,
        // prompt the user to configure them
        if (mobileMode) {
            if (!APPLICATION_SERVER_URL || !LIVEKIT_URL) {
                this.settingUrls.set(true);
            }
        } else {
            // If APPLICATION_SERVER_URL is not configured and app is not launched in a mobile device,
            // use default value from OpenVidu Local deployment
            if (!APPLICATION_SERVER_URL) {
                if (window.location.hostname === 'localhost') {
                    APPLICATION_SERVER_URL = 'http://localhost:6080/';
                } else {
                    APPLICATION_SERVER_URL = 'https://' + window.location.hostname + ':6443/';
                }
            }

            // If LIVEKIT_URL is not configured and app is not launched in a mobile device,
            // use default value from OpenVidu Local deployment
            if (!LIVEKIT_URL) {
                if (window.location.hostname === 'localhost') {
                    LIVEKIT_URL = 'ws://localhost:7880/';
                } else {
                    LIVEKIT_URL = 'wss://' + window.location.hostname + ':7443/';
                }
            }
        }
    }

    saveUrls() {
        APPLICATION_SERVER_URL = this.urlsForm.value.serverUrl!;
        LIVEKIT_URL = this.urlsForm.value.livekitUrl!;
        this.settingUrls.set(false);
    }

    async joinRoom() {
        // Initialize a new Room object
        const room = new Room();
        this.room.set(room);

        // Specify the actions when events take place in the room
        // On every new Track received...
        room.on(
            RoomEvent.TrackSubscribed,
            (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
                this.remoteTracksMap.update((map) => {
                    map.set(publication.trackSid, {
                        trackPublication: publication,
                        participantIdentity: participant.identity,
                    });
                    return map;
                });
            }
        );

        // On every new Track destroyed...
        room.on(RoomEvent.TrackUnsubscribed, (_track: RemoteTrack, publication: RemoteTrackPublication) => {
            this.remoteTracksMap.update((map) => {
                map.delete(publication.trackSid);
                return map;
            });
        });

        try {
            // Get the room name and participant name from the form
            const roomName = this.roomForm.value.roomName!;
            const participantName = this.roomForm.value.participantName!;

            // Get a token from your application server with the room name and participant name
            const token = await this.getToken(roomName, participantName);

            // Connect to the room with the LiveKit URL and the token
            await room.connect(LIVEKIT_URL, token);

            // Publish your camera and microphone
            await room.localParticipant.enableCameraAndMicrophone();
            this.localTrack.set(room.localParticipant.videoTrackPublications.values().next().value.videoTrack);
        } catch (error: any) {
            console.log(
                'There was an error connecting to the room:',
                error?.error?.errorMessage || error?.message || error
            );
            await this.leaveRoom();
        }
    }

    async leaveRoom() {
        // Leave the room by calling 'disconnect' method over the Room object
        await this.room()?.disconnect();

        // Reset all variables
        this.room.set(undefined);
        this.localTrack.set(undefined);
        this.remoteTracksMap.set(new Map());
    }

    async ngOnDestroy() {
        // On window closed or component destroyed, leave the room
        await this.leaveRoom();
    }

    /**
     * --------------------------------------------
     * GETTING A TOKEN FROM YOUR APPLICATION SERVER
     * --------------------------------------------
     * The method below request the creation of a token to
     * your application server. This prevents the need to expose
     * your LiveKit API key and secret to the client side.
     *
     * In this sample code, there is no user control at all. Anybody could
     * access your application server endpoints. In a real production
     * environment, your application server must identify the user to allow
     * access to the endpoints.
     */
    async getToken(roomName: string, participantName: string): Promise<string> {
        const response = await lastValueFrom(
            this.httpClient.post<{ token: string }>(APPLICATION_SERVER_URL + 'token', { roomName, participantName })
        );
        return response.token;
    }
}
