// plugins/withStripSupportLibs.js
const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withStripSupportLibs(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const mod = cfg.modResults;
    if (mod.language !== "groovy") return cfg;

    const insertion = `
// --- injected by withStripSupportLibs ---
subprojects {
  configurations.all {
    exclude group: 'com.android.support'
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'support-media-compat'
    exclude group: 'com.android.support', module: 'support-annotations'
  }
}
configurations.all {
  exclude group: 'com.android.support'
  exclude group: 'com.android.support', module: 'support-compat'
  exclude group: 'com.android.support', module: 'support-v4'
  exclude group: 'com.android.support', module: 'support-media-compat'
  exclude group: 'com.android.support', module: 'support-annotations'
}
// --- end injected ---
`;

    if (!mod.contents.includes("withStripSupportLibs")) {
      mod.contents += `

${insertion}
`;
    }
    return cfg;
  });
};
