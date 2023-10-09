import {
	AfterViewInit,
	Component,
	ElementRef,
	Input,
	ViewChild,
} from '@angular/core';
import { RemoteAudioTrack } from 'livekit-client';

@Component({
	selector: 'ov-audio',
	template: '<audio #audioElement></audio>',
})
export class OpenViduAudioComponent implements AfterViewInit {
	@ViewChild('audioElement') elementRef: ElementRef;

	_track: RemoteAudioTrack;

	ngAfterViewInit() {
		this._track.attach(this.elementRef.nativeElement);
	}

	@Input()
	set track(track: RemoteAudioTrack) {
		this._track = track;
		if (!!this.elementRef) {
			this._track.attach(this.elementRef.nativeElement);
		}
	}
}
