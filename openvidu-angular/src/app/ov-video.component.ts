import {
	AfterViewInit,
	Component,
	ElementRef,
	Input,
	ViewChild,
} from '@angular/core';
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

@Component({
	selector: 'ov-video',
	template: '<video #videoElement></video>',
})
export class OpenViduVideoComponent implements AfterViewInit {
	@ViewChild('videoElement') elementRef: ElementRef;

	_track: LocalAudioTrack | RemoteAudioTrack;

	ngAfterViewInit() {
		this._track.attach(this.elementRef.nativeElement);
	}

	@Input()
	set track(track: LocalAudioTrack | RemoteAudioTrack) {
		this._track = track;
		if (!!this.elementRef) {
			this._track.attach(this.elementRef.nativeElement);
		}
	}
}
