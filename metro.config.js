const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Alias duros para que Metro NO incluya cosas de Node ni config-plugins en el bundle
config.resolver = {
  ...config.resolver,
  alias: {
    'fs': require.resolve('./shim-empty.js'),
    'node:fs': require.resolve('./shim-empty.js'),
    'path': require.resolve('./shim-empty.js'),
    'node:path': require.resolve('./shim-empty.js'),
    'os': require.resolve('./shim-empty.js'),
    'node:os': require.resolve('./shim-empty.js'),
    '@expo/config-plugins': require.resolve('./shim-empty.js'),
    '@expo/prebuild-config': require.resolve('./shim-empty.js'),
    'expo/config': require.resolve('./shim-empty.js'),
  },
};

module.exports = config;
