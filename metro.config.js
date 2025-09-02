const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);
const shim = path.resolve(__dirname, 'shim-empty.js');

// ✅ agregar .wav si no estuviera
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts || []), 'wav'])
);

// ✅ mantener tus shims y bloqueos
config.resolver = {
  ...(config.resolver || {}),
  blockList: exclusionList([/node_modules\/@expo\/config-plugins\/.*/]),
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
    'expo/config': shim
  }
};

module.exports = config;
