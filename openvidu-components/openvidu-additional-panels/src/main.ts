import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { environment as environment_1 } from 'src/environments/environment';
import { OpenViduAngularModule, OpenViduAngularConfig } from 'openvidu-angular';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';

const config: OpenViduAngularConfig = {
  production: environment.production
};



if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, MatButtonModule, MatIconModule, OpenViduAngularModule.forRoot(config)),
        provideAnimations(),
        provideHttpClient(withInterceptorsFromDi())
    ]
})
  .catch(err => console.error(err));
