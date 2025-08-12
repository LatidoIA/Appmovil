// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);
const shim = path.resolve(__dirname, 'shim-empty.js');

// 1) Bloquea que Metro lea cualquier archivo de @expo/config-plugins en node_modules
config.resolver = {
  ...(config.resolver || {}),
  blockList: exclusionList([/node_modules\/@expo\/config-plugins\/.*/]),
  // 2) Mapea módulos de Node y config-plugins a un shim vacío (fallback)
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    fs: shim,
    'node:fs': shim,
    path: shim,
    'node:path': shim,
    os: shim,
    'node:os': shim,
    '@expo/config-plugins': shim,
    '@expo/prebuild-config': shim,
    'expo/config': shim,
  },
};

module.exports = config;
