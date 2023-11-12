import { CapacitorConfig } from '@capacitor/cli';
import {environment} from './src/environments/environment';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'openvidu-ionic',
  webDir: 'www',
  server: {
    androidScheme: 'http',
    iosScheme: 'http',
  }
};

if (environment.externalIp) {
  config.server = config.server || {};
  // config.server.hostname = 'localhost';
  config.server.cleartext = true;
  config.includePlugins = config.includePlugins || [];
  // '@jcesarmobile/ssl-skip' plugin is needed to allow serve the app over HTTPS
  // with a self-signed certificate without installing the certificate in the device
  config.includePlugins.push('@jcesarmobile/ssl-skip', 'cordova-plugin-android-permissions');

  // Android configuration
  config.android = config.android || {};
  config.android.allowMixedContent = true;

  // iOS configuration

}

export default config;
