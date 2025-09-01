const {
  withProjectBuildGradle,
  withAndroidManifest,
  withAppBuildGradle,
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

// 3) Borra línea obsoleta enableBundleCompression del app/build.gradle
const withStripEnableBundleCompression = (config) =>
  withAppBuildGradle(config, (cfg) => {
    const mod = cfg.modResults;
    if (mod.language !== 'groovy') return cfg;
    const marker = '/* ⛳ strip-enableBundleCompression */';
    if (!mod.contents.includes(marker)) {
      mod.contents = mod.contents.replace(/^\s*enableBundleCompression\s*=\s*.*\n/gm, '');
      mod.contents += `\n${marker}\n`;
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
    scheme: 'latido',
    android: {
      package: 'com.latido.app',
      permissions: [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.BODY_SENSORS',
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.POST_NOTIFICATIONS',
        // Health Connect (lectura)
        'android.permission.health.READ_STEPS',
        'android.permission.health.READ_HEART_RATE'
      ]
    },
    plugins: [
      'expo-health-connect',
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
              'android.enableJetifier': 'true'
            }
          }
        }
      ],
      withStripLegacySupport,
      withFixAppComponentFactory,
      withStripEnableBundleCompression
    ],
    extra: {
      eas: {
        projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f'
      }
    },
    cli: {
      appVersionSource: 'remote'
    }
  }
});
