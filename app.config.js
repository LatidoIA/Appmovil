// app.config.js
const { withAppBuildGradle } = require('@expo/config-plugins');
const appJson = require('./app.json');

// Quita libs antiguas "com.android.support" que chocan con AndroidX
const withStripSupportLibs = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let s = cfg.modResults.contents;
    if (!/configurations\.all\s*{/.test(s)) {
      s = s.replace(
        /(^|\n)dependencies\s*{/,
        `$1configurations.all {
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

module.exports = () => {
  const base = (appJson && appJson.expo) || {};
  return {
    expo: {
      // Tomamos lo que tengas en app.json y sobreescribimos lo necesario
      ...base,

      name: 'Latido',
      slug: 'latido',

      android: {
        ...(base.android || {}),
        package: 'com.latido.app',
      },

      extra: {
        ...(base.extra || {}),
        eas: {
          ...(base.extra?.eas || {}),
          projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f', // tu Project ID real
        },
      },

      plugins: [
        [
          'expo-build-properties',
          {
            android: {
              compileSdkVersion: 35,
              targetSdkVersion: 35,
              minSdkVersion: 26, // 🔧 arregla el error de minSdk (Health Connect)
              kotlinVersion: '2.0.21',
              gradleProperties: {
                'android.useAndroidX': 'true',
                'android.enableJetifier': 'true',
              },
            },
          },
        ],
        withStripSupportLibs, // 🔧 evita clases duplicadas de support libs
      ],

      version: '1.0.0',
      sdkVersion: '53.0.0',
      platforms: ['ios', 'android'],
    },
  };
};
