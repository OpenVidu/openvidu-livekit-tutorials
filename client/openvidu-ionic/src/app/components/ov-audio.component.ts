import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

@Component({
  selector: 'ov-audio',
  template: '<audio #audioElement style="width: 100%"></audio>',
})
export class OpenViduAudioComponent implements AfterViewInit {
  @ViewChild('audioElement') elementRef!: ElementRef;

  _track!: LocalAudioTrack | RemoteAudioTrack;

  constructor() {}

  ngAfterViewInit() {
    this.updateVideoView();
  }

  @Input()
  set track(track: LocalAudioTrack | RemoteAudioTrack) {
    this._track = track;
    if (!!this.elementRef) {
      this._track.attach(this.elementRef.nativeElement);
    }
  }

  private updateVideoView() {
    this._track.attach(this.elementRef.nativeElement);
  }
}
