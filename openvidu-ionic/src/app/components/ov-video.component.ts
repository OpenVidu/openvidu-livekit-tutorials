import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';

@Component({
  selector: 'ov-video',
  template: '<video #videoElement style="height: 100%"></video>',
})
export class OpenViduVideoComponent implements AfterViewInit {
  @ViewChild('videoElement') elementRef!: ElementRef;

  _track!: LocalVideoTrack | RemoteVideoTrack;

  ngAfterViewInit() {
    this._track.attach(this.elementRef.nativeElement);
  }

  @Input()
  set track(track: LocalVideoTrack | RemoteVideoTrack) {
    this._track = track;
    if (!!this.elementRef) {
      this._track.attach(this.elementRef.nativeElement);
    }
  }
}
