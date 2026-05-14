import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.soumalama',
  appName: 'Malama',
  webDir: 'dist',

  server: {
    // Garante que cookies e auth do Supabase funcionem corretamente no Android
    androidScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FDFBF9',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
  },

  ios: {
    // Scheme usado para deep links (ex: Supabase OAuth callback)
    scheme: 'malama',
  },

  android: {
    // Flavor padrão para o build
    flavor: 'main',
  },
};

export default config;
