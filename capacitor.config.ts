import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaivaii.mg30studio',
  appName: 'MG30 Studio',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#0b1012',
      style: 'DARK'
    }
  }
};

export default config;
