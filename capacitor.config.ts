import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.praj.vdata',
  appName: 'VolleyData Pro',
  webDir: 'dist',
  server: {
    url: 'https://v-data.praj.uk',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
