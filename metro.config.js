const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);
const shim = path.resolve(__dirname, 'shim-empty.js');

// + .wav
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts || []), 'wav'])
);

// === Stub condicional de Health Connect ===
const shouldStubHC = process.env.STUB_HEALTH_CONNECT !== '0';

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
    'expo/config': shim,
    ...(shouldStubHC
      ? {
          'react-native-health-connect': shim,
          'expo-health-connect': shim,
        }
      : {}),
  },
};

module.exports = config;
