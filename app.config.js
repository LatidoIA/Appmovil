// app.config.js (SDK 53)
const { withPlugins, withProjectBuildGradle } = require("@expo/config-plugins");

// Plugin inline para excluir libs legacy de support (evita conflictos con androidx)
function withStripSupportLibs(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const mod = cfg.modResults;
    if (mod.language !== "groovy") return cfg;

    const insertion = `
configurations.all {
  exclude group: 'com.android.support'
  exclude group: 'com.android.support', module: 'support-compat'
  exclude group: 'com.android.support', module: 'support-v4'
  exclude group: 'com.android.support', module: 'support-media-compat'
  exclude group: 'com.android.support', module: 'support-annotations'
}
`;
    if (!mod.contents.includes("exclude group: 'com.android.support'")) {
      mod.contents += `

${insertion}
`;
    }
    return cfg;
  });
}

module.exports = ({ config }) => {
  const base = {
    ...config,
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
      versionCode: 3,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000",
      },
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_HEART_RATE",
      ],
      minSdkVersion: 26,
      targetSdkVersion: 35,
    },
    extra: {
      eas: {
        projectId: "2ac93018-3731-4e46-b345-6d54a5502b8f", // ← tu projectId
      },
    },
    sdkVersion: "53.0.0",
    platforms: ["ios", "android"],
  };

  // Aplica plugins programáticamente:
  return withPlugins(base, [
    [withStripSupportLibs],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 26,
        },
      },
    ],
    "expo-health-connect",
  ]);
};
