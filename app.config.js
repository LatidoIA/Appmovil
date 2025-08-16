// app.config.js
export default {
  expo: {
    name: "LATIDO",
    slug: "latido",
    version: "1.0.0",
    icon: "./icono.png",
    scheme: "latido",
    android: {
      package: "com.latido.app",
      versionCode: 6,
      adaptiveIcon: { foregroundImage: "./icono.png", backgroundColor: "#000000" },
      minSdkVersion: 26,
      targetSdkVersion: 35,
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_HEART_RATE"
      ]
    },
    plugins: [
      ["expo-build-properties", { android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 26 } }],
      "./plugins/withStripSupportLibs",          // 1) excluir support en todos los subprojects
      "./plugins/withAppComponentFactoryFix",    // 2) fijar appComponentFactory (AndroidX) + tools:replace
      "expo-health-connect"
    ],
    extra: {
      eas: { projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f" }
    },
    sdkVersion: "53.0.0",
    platforms: ["android"]
  }
};
