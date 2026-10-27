import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaivaii.mg30studio',
  appName: 'MG30 Studio',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  }
};

export default config;
