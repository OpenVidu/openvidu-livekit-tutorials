import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { environment as environment_1 } from 'src/environments/environment';
import { OpenViduAngularModule, OpenViduAngularConfig } from 'openvidu-angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';

const config: OpenViduAngularConfig = {
	production: environment.production,
};



if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, OpenViduAngularModule.forRoot(config)),
        provideAnimations()
    ]
})
  .catch(err => console.error(err));
