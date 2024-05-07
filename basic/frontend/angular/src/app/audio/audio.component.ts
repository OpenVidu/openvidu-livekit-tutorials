import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

@Component({
    selector: 'audio-component',
    standalone: true,
    imports: [],
    templateUrl: './audio.component.html',
    styleUrl: './audio.component.css',
})
export class AudioComponent implements AfterViewInit, OnDestroy {
    @ViewChild('audioElement') audioElement?: ElementRef<HTMLAudioElement>;

    private _track?: RemoteAudioTrack | LocalAudioTrack;

    @Input()
    set track(track: RemoteAudioTrack | LocalAudioTrack) {
        this._track = track;

        if (this.audioElement) {
            this._track.attach(this.audioElement.nativeElement);
        }
    }

    get track(): RemoteAudioTrack | LocalAudioTrack | undefined {
        return this._track;
    }

    ngAfterViewInit() {
        if (this._track && this.audioElement) {
            this._track.attach(this.audioElement.nativeElement);
        }
    }

    ngOnDestroy() {
        this._track?.detach();
    }
}
