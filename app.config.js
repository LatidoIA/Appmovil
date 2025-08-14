// app.config.js
const {
  withProjectBuildGradle,
  withAndroidManifest,
} = require('@expo/config-plugins');

/**
 * Excluye dependencias legacy "com.android.support" que chocan con AndroidX
 * (evita el error de manifest merger por appComponentFactory).
 */
const withStripLegacySupport = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    const marker = '/* ⛳ strip-legacy-support */';
    if (!cfg.modResults.contents.includes(marker)) {
      cfg.modResults.contents += `
${marker}
subprojects {
  project.configurations.all {
    // elimina completamente libs legacy de support 28.x
    exclude group: 'com.android.support'
  }
}
`;
    }
    return cfg;
  });

/**
 * Añade tools:replace="android:appComponentFactory" en <application>
 * y asegura xmlns:tools en el Manifest.
 */
const withReplaceAppComponentFactory = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const app = manifest.application?.[0];
    if (app) {
      app.$ = app.$ || {};
      const curr = app.$['tools:replace'] || '';
      if (!curr.includes('android:appComponentFactory')) {
        app.$['tools:replace'] = curr
          ? `${curr},android:appComponentFactory`
          : 'android:appComponentFactory';
      }
    }
    return cfg;
  });

module.exports = () => ({
  expo: {
    // === tomado de tu app.json ===
    name: 'Latido',
    slug: 'latido',
    version: '1.0.0',
    sdkVersion: '53.0.0',
    platforms: ['ios', 'android'],
    android: {
      package: 'com.latido.app',
      // permisos que usa tu app
      permissions: [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.BODY_SENSORS',
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.POST_NOTIFICATIONS',
      ],
    },
    extra: {
      eas: {
        projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f',
      },
    },

    // === plugins (build props + health + fixes) ===
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 26,
            kotlinVersion: '2.0.21',
            gradleProperties: {
              'android.useAndroidX': 'true',
              'android.enableJetifier': 'true',
            },
          },
        },
      ],
      // configura Health Connect a nivel nativo
      'expo-health-connect',
      // parches para el merge de manifests y support libs
      withStripLegacySupport,
      withReplaceAppComponentFactory,
    ],
  },
});

