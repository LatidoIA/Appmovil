// app.config.js
const {
  withProjectBuildGradle,
  withAndroidManifest,
} = require('@expo/config-plugins');

/**
 * Excluye todas las libs legacy de com.android.support para evitar mezcla con AndroidX.
 * Se inyecta en el build.gradle del proyecto.
 */
const withStripLegacySupportLibs = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      const inject = `
/** ---- Strip legacy support libs injected by config plugin ---- */
subprojects {
  project.configurations.all {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-media-compat'
    exclude group: 'com.android.support', module: 'support-fragment'
    exclude group: 'com.android.support', module: 'animated-vector-drawable'
    exclude group: 'com.android.support', module: 'support-vector-drawable'
  }
}
`;
      if (!cfg.modResults.contents.includes('Strip legacy support libs')) {
        cfg.modResults.contents += `\n${inject}\n`;
      }
    }
    return cfg;
  });

/**
 * Añade tools:replace="android:appComponentFactory" en <application>
 * y asegura el namespace tools en el manifest.
 */
const withAppComponentFactoryReplace = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    // Asegura xmlns:tools
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    // Aplica tools:replace en <application>
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
    name: 'Latido',
    slug: 'latido',
    version: '1.0.0',
    sdkVersion: '53.0.0',
    platforms: ['android', 'ios'],

    android: {
      package: 'com.latido.app',
      // Permisos que ya estabas usando
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
      'expo-health-connect',
      // Plugins locales (los definimos arriba):
      withStripLegacySupportLibs,
      withAppComponentFactoryReplace,
    ],

    extra: {
      eas: {
        projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f', // deja tu ID real
      },
    },
  },
});
