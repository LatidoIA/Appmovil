// app.config.js
module.exports = {
  name: "LATIDO",
  slug: "latido",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./icono.png",            // ya existe en la raíz
  scheme: "latido",
  userInterfaceStyle: "automatic",

  // Splash sin imagen (solo color de fondo) para evitar ENOENT
  splash: {
    // sin "image"
    resizeMode: "contain",
    backgroundColor: "#000000"
  },

  android: {
    package: "com.latido.app",
    // versionCode lo maneja "remote" en EAS; puedes omitirlo si quieres
    adaptiveIcon: {
      // usa tu icono existente como foreground para evitar ./assets/*
      foregroundImage: "./icono.png",
      backgroundColor: "#000000"
    },
    minSdkVersion: 26,
    targetSdkVersion: 35,
    // si ya los traías, los mantengo (no afectan el fallo actual)
    permissions: [
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_HEART_RATE"
    ]
  },

  plugins: [
    // tu plugin de Health Connect si lo estás usando:
    "./config/plugins/withHealthConnectPermissions.js",
    ["expo-build-properties", {
      android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 26 }
    }]
  ],

  extra: {
    eas: {
      // el projectId correcto que te mostró EAS en el mismatch
      projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f"
    }
  },

  sdkVersion: "53.0.0",
  platforms: ["ios", "android"]
};
