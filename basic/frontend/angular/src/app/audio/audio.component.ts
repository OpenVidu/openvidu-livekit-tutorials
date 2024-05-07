import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { RemoteAudioTrack } from 'livekit-client';

@Component({
    selector: 'audio-component',
    standalone: true,
    imports: [],
    templateUrl: './audio.component.html',
    styleUrl: './audio.component.css',
})
export class AudioComponent {
    @ViewChild('audioElement') audioElement?: ElementRef<HTMLAudioElement>;

    _track?: RemoteAudioTrack;

    ngAfterViewInit() {
        if (this._track && this.audioElement) {
            this._track.attach(this.audioElement.nativeElement);
        }
    }

    @Input()
    set track(track: RemoteAudioTrack) {
        this._track = track;

        if (this.audioElement) {
            this._track.attach(this.audioElement.nativeElement);
        }
    }
}
