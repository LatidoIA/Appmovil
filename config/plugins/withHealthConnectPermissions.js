// config/plugins/withHealthConnectPermissions.js
const { withAndroidManifest } = require("@expo/config-plugins");

const HC_PERMS = [
  "androidx.health.permission.READ_HEART_RATE",
  "androidx.health.permission.READ_STEPS",
  // Si luego quieres escribir: "androidx.health.permission.WRITE_HEART_RATE", "androidx.health.permission.WRITE_STEPS"
];

module.exports = function withHealthConnectPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // 1) uses-permission de Health Connect
    manifest["uses-permission"] = manifest["uses-permission"] || [];
    const existing = new Set(
      manifest["uses-permission"].map((p) => p.$?.["android:name"]).filter(Boolean)
    );
    for (const name of HC_PERMS) {
      if (!existing.has(name)) {
        manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    // 2) <queries> para detectar la app de Health Connect (imprescindible en Android 11+)
    // package oficial (AOSP/Google): com.google.android.apps.healthdata
    if (!manifest.queries) manifest.queries = [{}];
    const queries = manifest.queries[0];
    queries.package = queries.package || [];
    const hasHC =
      queries.package.find((p) => p.$?.["android:name"] === "com.google.android.apps.healthdata") != null;
    if (!hasHC) {
      queries.package.push({ $: { "android:name": "com.google.android.apps.healthdata" } });
    }

    return cfg;
  });
};
