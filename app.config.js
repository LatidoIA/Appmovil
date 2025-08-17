// app.config.js
const { withAndroidManifest, withProjectBuildGradle } = require("@expo/config-plugins");

// 🔧 Patch Manifest: evita choque de appComponentFactory
const withFixAppComponentFactory = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
    const app = manifest.application?.[0];
    if (app) {
      app.$["android:appComponentFactory"] = "androidx.core.app.CoreComponentFactory";
      const list = new Set(
        (app.$["tools:replace"] ? String(app.$["tools:replace"]).split(",") : [])
          .map((s) => s.trim())
          .filter(Boolean)
      );
      list.add("android:appComponentFactory");
      app.$["tools:replace"] = Array.from(list).join(",");
    }
    return cfg;
  });

// 🧹 EXCLUIR legacy Support libs (la causa de las clases duplicadas)
const withStripSupportLibs = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    const mod = cfg.modResults;
    if (mod.language !== "groovy") return cfg;

    const block = `
configurations.all {
  exclude group: 'com.android.support'
  exclude group: 'com.android.support', module: 'support-compat'
  exclude group: 'com.android.support', module: 'support-v4'
  exclude group: 'com.android.support', module: 'support-media-compat'
  exclude group: 'com.android.support', module: 'support-annotations'
  exclude group: 'com.android.support', module: 'versionedparcelable'
}
`;
    if (!mod.contents.includes("exclude group: 'com.android.support'")) {
      mod.contents += `

${block}
`;
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
    image: "./splash.png",
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  android: {
    package: "com.latido.app",
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: "./adaptive-icon.png",
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
    withFixAppComponentFactory,
    withStripSupportLibs, // 👈 aquí quitamos com.android.support*
  ],
  extra: {
    eas: { projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f" }, // usa tu ID real
  },
  sdkVersion: "53.0.0",
  platforms: ["ios", "android"],
};
