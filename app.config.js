// app.config.js
const { withAppBuildGradle } = require('@expo/config-plugins');

// Elimina libs antiguas "com.android.support" que chocan con AndroidX
const withStripSupportLibs = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let s = cfg.modResults.contents;
    if (!/configurations\.all\s*{/.test(s)) {
      s = s.replace(
        /(^|\n)dependencies\s*{/,
        `$1configurations.all {
  // Evita clases duplicadas con AndroidX
  exclude group: 'com.android.support', module: 'support-compat'
  exclude group: 'com.android.support', module: 'animated-vector-drawable'
  exclude group: 'com.android.support', module: 'support-vector-drawable'
  exclude group: 'com.android.support', module: 'versionedparcelable'
  exclude group: 'com.android.support'
}

dependencies {`
      );
    }
    cfg.modResults.contents = s;
    return cfg;
  });

module.exports = {
  expo: {
    name: 'Latido',
    slug: 'latido',

    // Requerido por builds desde GitHub
    android: { package: 'com.latido.app' },

    // Requerido por GitHub integration (presente aunque no tengas el secreto).
    // Si tienes el secreto EAS_PROJECT_ID en GitHub, se usará automáticamente.
    extra: {
      eas: {
        projectId:
          process.env.EAS_PROJECT_ID || '00000000-0000-0000-0000-000000000000',
      },
    },

    plugins: [
      [
        'expo-build-properties',
        {
          android: {
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
      withStripSupportLibs,
    ],
  },
};
