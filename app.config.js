import { ConfigContext, ExpoConfig } from 'expo/config';

const ANDROID_CLIENT = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB_CLIENT = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Latido',
  slug: 'latido',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'latido',
  icon: './icon.png',
  splash: {
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.latido.app',
    supportsTablet: false,
  },
  android: {
    package: 'com.latido.app',
    adaptiveIcon: {
      foregroundImage: './adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  extra: {
    eas: { projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f' },
    google: {
      androidClientId: ANDROID_CLIENT,
      webClientId: WEB_CLIENT,
    },
  },
  runtimeVersion: { policy: 'sdkVersion' },
  updates: { enabled: true },
});
