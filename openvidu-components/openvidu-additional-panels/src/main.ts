import { enableProdMode, importProvidersFrom } from '@angular/core';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { OpenViduAngularModule, OpenViduAngularConfig } from 'openvidu-angular';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
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
		provideAnimations(),
		provideHttpClient(withInterceptorsFromDi()),
	],
}).catch((err) => console.error(err));
