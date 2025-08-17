// app.config.js
const { withAndroidManifest } = require("@expo/config-plugins");

// Plugin inline: fija appComponentFactory y tools:replace en el AndroidManifest.
const withFixAppComponentFactory = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Asegura xmlns:tools
    manifest.$["xmlns:tools"] =
      manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";

    const app = manifest.application?.[0];
    if (app) {
      // Valor explícito + autorización para reemplazar
      app.$["android:appComponentFactory"] = "androidx.core.app.CoreComponentFactory";

      // Si ya hay tools:replace, lo mantenemos y añadimos appComponentFactory
      const existing = app.$["tools:replace"];
      const list = new Set(
        (Array.isArray(existing) ? existing : [existing])
          .filter(Boolean)
          .flatMap((v) => String(v).split(","))
          .map((s) => s.trim())
      );
      list.add("android:appComponentFactory");
      app.$["tools:replace"] = Array.from(list).join(",");
    }
    return cfg;
  });

module.exports = {
  name: "LATIDO",
  slug: "latido",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./icono.png",
  scheme: "latido",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  android: {
    package: "com.latido.app",
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#000000",
    },
    permissions: [
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_HEART_RATE",
    ],
    minSdkVersion: 26,
    targetSdkVersion: 35,
  },
  plugins: [
    "expo-health-connect",
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 26,
        },
      },
    ],
    // 👉 nuestro patch inline (sin archivos externos)
    withFixAppComponentFactory,
  ],
  sdkVersion: "53.0.0",
  platforms: ["ios", "android"],
};
