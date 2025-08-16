// app.config.js
export default {
  expo: {
    name: "LATIDO",
    slug: "latido",
    version: "1.0.0",
    icon: "./icono.png",              // ya lo subiste en la raíz
    android: {
      package: "com.latido.app",
      versionCode: 4,                 // súbelo en cada build
      adaptiveIcon: {
        foregroundImage: "./icono.png",
        backgroundColor: "#000000"
      },
      minSdkVersion: 26,
      targetSdkVersion: 35,
      // Permisos Health Connect (lectura)
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_HEART_RATE"
      ]
    },
    plugins: [
      "expo-health-connect",
      ["expo-build-properties", {
        android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 26 }
      }]
    ],
    extra: {
      eas: { projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f" } // <- el correcto
    },
    // Opcional: si no usas iOS, puedes quitar "ios" de aquí
    platforms: ["android"],
    sdkVersion: "53.0.0"
  }
}
  
