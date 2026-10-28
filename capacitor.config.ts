import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaivaii.mg30studio',
  appName: 'MG30 Studio',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  },
  plugins: {
    CapacitorHttp: {
      // Use Android's native HTTP stack for external APIs and model downloads.
      // This avoids WebView CORS failures in the TONE3000 OAuth/API flow.
      enabled: true
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#0b1012',
      style: 'DARK'
    }
  }
};

export default config;
