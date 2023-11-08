import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { OpenViduVideoComponent } from '../components/ov-video.component';
import { OpenViduAudioComponent } from '../components/ov-audio.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    HttpClientModule,
  ],
  declarations: [HomePage, OpenViduVideoComponent, OpenViduAudioComponent],
})
export class HomePageModule {}
