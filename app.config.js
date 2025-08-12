// app.config.js
const { withAppBuildGradle } = require('@expo/config-plugins');

// Quita cualquier librería antigua "com.android.support" que esté entrando por dependencias
const withExcludeSupportLibs = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes("exclude group: 'com.android.support'")) {
      src = src.replace(
        /(^|\n)dependencies\s*{/,
        `$1configurations.all {
  // Evita clases duplicadas con AndroidX
  exclude group: 'com.android.support'
}

dependencies {`
      );
      cfg.modResults.contents = src;
    }
    return cfg;
  });

module.exports = {
  expo: {
    name: 'Latido',
    slug: 'latido',
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            // Ya estás en Expo SDK 53 → usa APIs modernas
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            kotlinVersion: '2.0.21',
            gradleProperties: {
              'android.useAndroidX': 'true',
              'android.enableJetifier': 'true',
            },
          },
        },
      ],
      withExcludeSupportLibs,
    ],
  },
};
