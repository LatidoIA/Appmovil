// withStripSupportLibs.js
const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withStripSupportLibs(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const mod = cfg.modResults;
    if (mod.language !== "groovy") return cfg;

    const insertion = `
configurations.all {
  exclude group: 'com.android.support'
  exclude group: 'com.android.support', module: 'support-compat'
  exclude group: 'com.android.support', module: 'support-v4'
  exclude group: 'com.android.support', module: 'support-media-compat'
  exclude group: 'com.android.support', module: 'support-annotations'
}
`;

    if (!mod.contents.includes("configurations.all")) {
      mod.contents += `

${insertion}
`;
    }
    return cfg;
  });
};
