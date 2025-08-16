// plugins/withAppComponentFactoryFix.js
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withAppComponentFactoryFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    manifest.manifest.$ = manifest.manifest.$ || {};
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    app.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    const existing = app.$['tools:replace'];
    if (existing) {
      const set = new Set(existing.split(',').map(s => s.trim()).filter(Boolean));
      set.add('android:appComponentFactory');
      app.$['tools:replace'] = Array.from(set).join(',');
    } else {
      app.$['tools:replace'] = 'android:appComponentFactory';
    }
    return config;
  });
};
