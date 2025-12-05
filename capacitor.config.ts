import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simplebookkeeping.app',
  appName: '极简记账',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;