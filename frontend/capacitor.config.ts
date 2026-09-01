import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esigma.harmonia',
  appName: 'Harmonia',
  webDir: 'dist',
  server: {
    url: 'https://harmonia.e-sigma.app',
    cleartext: true
  }
};

export default config;
