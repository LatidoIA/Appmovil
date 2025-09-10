// app.config.js
import "dotenv/config";

export default ({ config }) => {
  // IDs desde variables de entorno (EAS) con fallback a valores conocidos
  const extra = {
    googleAndroidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
      "107727896179-l6ggvj14sf7mvs24mqbrom94lu367ib2.apps.googleusercontent.com",
    googleWebClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      "107727896179-nab9msheben3smld5q950gqq3b234g50.apps.googleusercontent.com",
    // opcional, por si más adelante agregas iOS
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? null,
    // para Expo Go / dev builds puedes reutilizar el Web
    googleExpoClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      "107727896179-nab9msheben3smld5q950gqq3b234g50.apps.googleusercontent.com",
  };

  return {
    ...config,
    name: "Latido",
    slug: "latido",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "latido", // necesario para el redirectUri de AuthSession
    icon: "./assets/icon.png", // asegúrate de que exista
    splash: {
      image: "./assets/splash.png", // asegúrate de que exista (o quita esta línea)
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.latido.app",
    },
    android: {
      package: "com.latido.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png", // asegúrate de que exista (o elimina esta sección)
        backgroundColor: "#FFFFFF",
      },
    },
    extra,
  };
};
