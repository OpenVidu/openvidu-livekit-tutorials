import { CapacitorConfig } from '@capacitor/cli';
import {environment} from './src/environments/environment';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'openvidu-ionic',
  webDir: 'www',

};

if (environment.externalIp) {

  // Android configuration
  config.android = config.android || {};
  config.android.includePlugins = config.android.includePlugins || [];
  config.android.includePlugins.push('@jcesarmobile/ssl-skip', 'cordova-plugin-android-permissions');

}

export default config;
