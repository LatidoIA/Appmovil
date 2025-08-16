// app.config.js
export default {
  expo: {
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
      backgroundColor: "#000000"
    },
    android: {
      package: "com.latido.app",
      versionCode: 3, // súbelo en cada build
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      // ⬇️ CLAVE: permisos de Health Connect
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_HEART_RATE"
      ],
      // Requisitos del SDK de Health Connect
      minSdkVersion: 26,
      targetSdkVersion: 35
    },
    plugins: [
      "expo-health-connect",
      ["expo-build-properties", {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 26
        }
      }]
    ],
    extra: {
      eas: { projectId: "REEMPLAZA_CON_TU_PROJECT_ID" }
    }
  }
}
