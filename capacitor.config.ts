import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.praj.vdata',
  appName: 'VolleyData Pro',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  }
};

export default config;
