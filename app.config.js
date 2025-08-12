// app.config.js
const { withAndroidManifest } = require('@expo/config-plugins');

// Plugin inline: añade tools:replace para resolver el conflicto
const withReplaceAppComponentFactory = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    // Asegura el namespace tools
    manifest.manifest.$ = manifest.manifest.$ || {};
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const app = manifest.manifest.application?.[0];
    if (app) {
      app.$ = app.$ || {};
      // Resuelve choque entre androidx.core y support-compat
      app.$['tools:replace'] = 'android:appComponentFactory';
      app.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
    }
    return cfg;
  });

module.exports = ({ config }) => ({
  ...config,
  // Mantiene lo existente y añade nuestros plugins
  plugins: [
    withReplaceAppComponentFactory,
    ...(config.plugins || []),
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
        },
      },
    ],
  ],
});
