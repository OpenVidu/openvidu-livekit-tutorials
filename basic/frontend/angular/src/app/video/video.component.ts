import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';

@Component({
    selector: 'video-component',
    standalone: true,
    imports: [],
    templateUrl: './video.component.html',
    styleUrl: './video.component.css',
})
export class VideoComponent {
    @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

    private _track?: LocalVideoTrack | RemoteVideoTrack;
    @Input() participantIdentity?: string;
    @Input() isLocal = false;

    ngAfterViewInit() {
        if (this._track && this.videoElement) {
            this._track.attach(this.videoElement.nativeElement);
        }
    }

    @Input()
    set track(track: LocalVideoTrack | RemoteVideoTrack) {
        this._track = track;

        if (this.videoElement) {
            this._track.attach(this.videoElement.nativeElement);
        }
    }
}
