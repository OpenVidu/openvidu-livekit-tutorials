import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';

@Component({
    selector: 'video-component',
    standalone: true,
    imports: [],
    templateUrl: './video.component.html',
    styleUrl: './video.component.css',
})
export class VideoComponent implements AfterViewInit, OnDestroy {
    @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

    private _track?: LocalVideoTrack | RemoteVideoTrack;
    @Input() participantIdentity?: string;
    @Input() local = false;

    @Input()
    set track(track: LocalVideoTrack | RemoteVideoTrack) {
        this._track = track;

        if (this.videoElement) {
            this._track.attach(this.videoElement.nativeElement);
        }
    }

    get track(): LocalVideoTrack | RemoteVideoTrack | undefined {
        return this._track;
    }

    ngAfterViewInit() {
        if (this._track && this.videoElement) {
            this._track.attach(this.videoElement.nativeElement);
        }
    }

    ngOnDestroy() {
        this._track?.detach();
    }
}
