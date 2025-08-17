// app.config.js
export default ({ config }) => ({
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
    backgroundColor: "#000000"
  },
  android: {
    package: "com.latido.app",
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: "./adaptive-icon.png",
      backgroundColor: "#000000"
    },
    // Si ya te funcionaba sin pedir permisos explícitos, podés borrar esto:
    permissions: [
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_HEART_RATE"
    ],
    minSdkVersion: 26,
    targetSdkVersion: 35
  },
  plugins: [
    "expo-health-connect",
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 26
          // Dejá esto simple; si agregaste cosas raras acá, quitalas para volver al baseline
        }
      }
    ]
    // ⚠️ Si agregaste "withFixAppComponentFactory", quitalo para volver a la base estable
  ],
  extra: {
    eas: {
      // ⚠️ NECESARIO para EAS con token/robot user (no interactivo)
      projectId: process.env.EAS_PROJECT_ID
    }
  },
  sdkVersion: "53.0.0",
  platforms: ["ios", "android"]
});
