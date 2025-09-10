import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Latido",
  slug: "latido",
  scheme: "latido",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: ["**/*"],
  android: {
    package: "com.latido.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  extra: {
    eas: {
      // ⚠️ Reemplaza este UUID por el de tu proyecto en expo.dev
      projectId: "REEMPLAZA_CON_TU_PROJECT_ID"
    },
    // Estas variables vienen del profile "production" de eas.json
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    NODE_ENV: process.env.NODE_ENV ?? "development"
  }
};

export default config;
