// app.config.js
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
    // versionCode: lo maneja EAS (remote); lo dejo fuera para evitar warnings
    minSdkVersion: 26,
    targetSdkVersion: 35,
    // ⚠️ Importante: NO listar aquí android.permission.health.*
    // Health Connect se declarará con el plugin de abajo.
  },
  plugins: [
    // Mantén expo-build-properties como lo tenías
    ["expo-build-properties", { android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 26 } }],
    // Plugin local para inyectar permisos y <queries> de Health Connect
    "./config/plugins/withHealthConnectPermissions",
  ],
  extra: {
    eas: {
      projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f", // tu projectId real
    },
  },
  sdkVersion: "53.0.0",
  platforms: ["ios", "android"],
};
