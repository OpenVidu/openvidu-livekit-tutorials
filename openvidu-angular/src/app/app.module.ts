import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { OpenViduVideoComponent } from './ov-video.component';
import { OpenViduAudioComponent } from './ov-audio.component';

@NgModule({
	declarations: [AppComponent, OpenViduAudioComponent, OpenViduVideoComponent],
	imports: [BrowserModule, FormsModule, HttpClientModule],
	providers: [],
	bootstrap: [AppComponent],
})
export class AppModule {}
