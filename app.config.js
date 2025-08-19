// app.config.js
const {
  withProjectBuildGradle,
  withAndroidManifest,
} = require('@expo/config-plugins');

// 1) Excluye libs legacy com.android.support (evita choques con AndroidX)
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

// 2) Fija appComponentFactory y añade tools:replace
const withFixAppComponentFactory = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    // asegura el namespace tools
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    const app = manifest.application?.[0];
    if (app) {
      app.$ = app.$ || {};
      app.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
      const curr = app.$['tools:replace'] || '';
      if (!curr.includes('android:appComponentFactory')) {
        app.$['tools:replace'] = curr
          ? `${curr},android:appComponentFactory`
          : 'android:appComponentFactory';
      }
    }
    return cfg;
  });

/**
 * 3) Añade <queries> para Health Connect:
 *    - ACTION_HEALTH_CONNECT_SETTINGS
 *    - paquete com.google.android.apps.healthdata
 */
const withHealthConnectQueries = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Asegura el nodo <queries>
    manifest.queries = manifest.queries || [{}];
    const queries = manifest.queries[0];

    // <queries><intent><action android:name="androidx.health.ACTION_HEALTH_CONNECT_SETTINGS" />
    queries.intent = queries.intent || [];
    const HC_SETTINGS = 'androidx.health.ACTION_HEALTH_CONNECT_SETTINGS';
    const hasIntent = queries.intent.some(
      (i) => Array.isArray(i.action) && i.action.some((a) => a.$['android:name'] === HC_SETTINGS)
    );
    if (!hasIntent) {
      queries.intent.push({
        action: [{ $: { 'android:name': HC_SETTINGS } }],
      });
    }

    // <queries><package android:name="com.google.android.apps.healthdata" />
    queries.package = queries.package || [];
    const HC_PKG = 'com.google.android.apps.healthdata';
    const hasPkg = queries.package.some((p) => p.$['android:name'] === HC_PKG);
    if (!hasPkg) {
      queries.package.push({ $: { 'android:name': HC_PKG } });
    }

    return cfg;
  });

module.exports = () => ({
  expo: {
    name: 'Latido',
    slug: 'latido',
    version: '1.0.0',
    sdkVersion: '53.0.0',
    platforms: ['ios', 'android'],

    android: {
      package: 'com.latido.app',
      permissions: [
        // --- TUS PERMISOS EXISTENTES ---
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.BODY_SENSORS',
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.POST_NOTIFICATIONS',

        // --- Health Connect (coinciden con lo que pide tu App.js) ---
        'android.permission.health.READ_HEART_RATE',
        'android.permission.health.READ_STEPS',

        // Si luego lees/escribes más tipos, añade aquí sus READ_/WRITE_ correspondientes
        // p.ej: 'android.permission.health.READ_BLOOD_PRESSURE'
        //       'android.permission.health.READ_DISTANCE'
        //       'android.permission.health.WRITE_HEART_RATE', etc.
      ],
    },

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

      // Health Connect (Expo)
      'expo-health-connect',

      // Tus custom plugins
      withStripLegacySupport,
      withFixAppComponentFactory,

      // Añadimos consultas de manifest para Health Connect
      withHealthConnectQueries,
    ],

    extra: {
      eas: {
        projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f',
      },
    },
  },
});
