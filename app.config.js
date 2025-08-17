// app.config.js
const { withPlugins, withProjectBuildGradle } = require('@expo/config-plugins');

// Quita cualquier dependencia del grupo com.android.support en todos los subproyectos
function withStripSupportLibs(config) {
  return withProjectBuildGradle(config, (conf) => {
    const snippet = `
/** Strip legacy support libs that conflict with AndroidX */
subprojects {
  configurations.all {
    exclude group: 'com.android.support'
  }
}
`;
    if (!conf.modResults.contents.includes("exclude group: 'com.android.support'")) {
      conf.modResults.contents += `\n${snippet}\n`;
    }
    return conf;
  });
}

module.exports = ({ config }) =>
  withPlugins(
    {
      name: "LATIDO",
      slug: "latido",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./icono.png",
      scheme: "latido",
      userInterfaceStyle: "automatic",
      splash: { image: "./splash.png", resizeMode: "contain", backgroundColor: "#000000" },
      android: {
        package: "com.latido.app",
        versionCode: 3,
        adaptiveIcon: { foregroundImage: "./adaptive-icon.png", backgroundColor: "#000000" },
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
              minSdkVersion: 26,
              // <- IMPORTANTÍSIMO para convertir dependencias heredadas a AndroidX
              gradleProperties: {
                "android.useAndroidX": "true",
                "android.enableJetifier": "true"
              }
            }
          }
        ]
      ],
      sdkVersion: "53.0.0",
      platforms: ["ios", "android"],
      // Si EAS te lo pidió, asegurate de tener:
      // extra: { eas: { projectId: "<TU_PROJECT_ID_DE_EAS>" } }
    },
    [withStripSupportLibs]
  );
