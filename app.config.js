const {
  withProjectBuildGradle,
  withAndroidManifest,
  withAppBuildGradle, // 👈
} = require('@expo/config-plugins');

const withStripLegacySupport = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    const marker = '/* ⛳ strip-legacy-support */';
    if (!cfg.modResults.contents.includes(marker)) {
      cfg.modResults.contents += `
${marker}
subprojects {
  project.configurations.all {
    exclude group: 'com.android.support'
  }
}
`;
    }
    return cfg;
  });

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

// 🔧 NUEVO: elimina cualquier uso de `enableBundleCompression` del bloque `react { ... }`
const withRemoveEnableBundleCompression = (config) =>
  withAppBuildGradle(config, (cfg) => {
    const isGroovy = cfg.modResults.language === 'groovy';
    if (!isGroovy) return cfg;
    const before = cfg.modResults.contents;
    // Quita la línea (o líneas) que contengan la clave dentro del bloque react
    const cleaned = before.replace(/react\s*\{[^}]*\benableBundleCompression\s*=\s*.*?\n([^}]*\})/gs, (m) =>
      m.replace(/^\s*enableBundleCompression\s*=.*\n/gm, '')
    );
    // Por si estuviera fuera del bloque react:
    cfg.modResults.contents = cleaned.replace(/^\s*enableBundleCompression\s*=.*\n/gm, '');
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
        'android.permission.POST_NOTIFICATIONS'
      ]
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
              'android.enableJetifier': 'true'
            }
          }
        }
      ],
      withStripLegacySupport,
      withFixAppComponentFactory,
      withRemoveEnableBundleCompression // 👈 añade este
    ],
    extra: {
      eas: { projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f' }
    }
  }
});
