// app.config.js
const { withAndroidManifest } = require("@expo/config-plugins");

const withFixAppComponentFactory = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
    const app = manifest.application?.[0];
    if (app) {
      app.$["android:appComponentFactory"] = "androidx.core.app.CoreComponentFactory";
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
    image: "./splash.png",            // 👈 ahora en raíz
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  android: {
    package: "com.latido.app",
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: "./adaptive-icon.png", // 👈 ahora en raíz
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
    withFixAppComponentFactory, // 👈 patch manifest
  ],
  sdkVersion: "53.0.0",
  platforms: ["ios", "android"],
};
