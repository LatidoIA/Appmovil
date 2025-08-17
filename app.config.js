// app.config.js
const { withAndroidManifest } = require("@expo/config-plugins");

// Patch para evitar el choque de appComponentFactory en el manifest:
const withFixAppComponentFactory = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    // Asegura namespace tools
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
    const app = manifest.application?.[0];
    if (app) {
      app.$["android:appComponentFactory"] = "androidx.core.app.CoreComponentFactory";
      const existing = app.$["tools:replace"];
      const items = new Set(
        (existing ? String(existing).split(",") : []).map((s) => s.trim()).filter(Boolean)
      );
      items.add("android:appComponentFactory");
      app.$["tools:replace"] = Array.from(items).join(",");
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
    image: "./splash.png",             // en raíz
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  android: {
    package: "com.latido.app",
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: "./adaptive-icon.png", // en raíz
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
    ["expo-build-properties", { android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 26 } }],
    withFixAppComponentFactory, // 👈 plugin inline (no rutas externas)
  ],
  extra: {
    eas: { projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f" }, // 👈 tu projectId
  },
  sdkVersion: "53.0.0",
  platforms: ["ios", "android"],
};
