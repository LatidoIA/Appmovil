// app.config.js
module.exports = {
  name: "Latido",
  slug: "latido",
  version: "1.0.0",
  sdkVersion: "53.0.0",
  platforms: ["ios", "android"],

  android: {
    package: "com.latido.app"
  },

  extra: {
    eas: { projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f" } // <-- tu Project ID real
  },

  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 26,              // requerido por Health Connect
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          kotlinVersion: "2.0.21",
          gradleProperties: {
            "android.useAndroidX": "true",
            "android.enableJetifier": "true"
          }
        }
      }
    ],
    "withStripSupportLibs"               // deja este si ya está en tu repo
  ]
};
