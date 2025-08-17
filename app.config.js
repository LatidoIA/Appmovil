// app.config.js
const withStripSupportLibs = require("./withStripSupportLibs.js"); // 👈 cambia la ruta

/** @type import('@expo/config').ExpoConfig */
module.exports = () => ({
  name: "LATIDO",
  slug: "latido",
  version: "1.0.0",
  scheme: "latido",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./icono.png",

  splash: {
    backgroundColor: "#000000",
    resizeMode: "contain",
  },

  android: {
    package: "com.latido.app",
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: "./icono.png",
      backgroundColor: "#000000",
    },
    minSdkVersion: 26,
    targetSdkVersion: 35,
  },

  plugins: [
    withStripSupportLibs,                // tu plugin local
    "expo-health-connect",               // Health Connect
    ["expo-build-properties", { android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 26 } }],
  ],

  extra: {
    eas: { projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f" },
  },

  sdkVersion: "53.0.0",
  platforms: ["android"],
});
