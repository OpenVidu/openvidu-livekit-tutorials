import { enableProdMode, importProvidersFrom } from '@angular/core';

import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { OpenViduAngularModule, OpenViduAngularConfig } from 'openvidu-angular';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
		importProvidersFrom(
			BrowserModule,
			MatButtonModule,
			MatIconModule,
			OpenViduAngularModule.forRoot(config)
		),
		provideAnimations(),
	],
}).catch((err) => console.error(err));
