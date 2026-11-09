import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ro.panteras.weekplate',
  appName: 'WeekPlate',
  // The whole app — recipes, nutrition and price tables included — is bundled into the APK.
  // Nothing is fetched at runtime; the user's data stays on the phone.
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      backgroundColor: '#1f6f4a',
      showSpinner: false,
    },
  },
};

export default config;
