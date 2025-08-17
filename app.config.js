// app.config.js
const withStripSupportLibs = require("./config/plugins/withStripSupportLibs.js");

/** @type import('@expo/config').ExpoConfig */
module.exports = () => ({
  name: "LATIDO",
  slug: "latido",
  version: "1.0.0",
  scheme: "latido",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./icono.png",

  // Sin imagen de splash para evitar ENOENT
  splash: {
    backgroundColor: "#000000",
    resizeMode: "contain",
  },

  android: {
    package: "com.latido.app",
    versionCode: 3,
    // Usa el mismo icono como foreground del adaptive icon
    adaptiveIcon: {
      foregroundImage: "./icono.png",
      backgroundColor: "#000000",
    },
    minSdkVersion: 26,
    targetSdkVersion: 35,
    // Deja que el plugin agregue los permisos de Health Connect
    // permissions: [],
  },

  plugins: [
    withStripSupportLibs, // Plan A (ya lo tienes)
    [
      "expo-build-properties",
      { android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 26 } },
    ],
    "expo-health-connect",
  ],

  extra: {
    eas: { projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f" },
  },

  sdkVersion: "53.0.0",
  platforms: ["android"],
});
