const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  fs: path.resolve(__dirname, 'shim-empty.js'),
  path: path.resolve(__dirname, 'shim-empty.js'),
  os: path.resolve(__dirname, 'shim-empty.js'),
  '@expo/config-plugins': path.resolve(__dirname, 'shim-empty.js'),
  '@expo/prebuild-config': path.resolve(__dirname, 'shim-empty.js'),
  'expo/config': path.resolve(__dirname, 'shim-empty.js'),
};

module.exports = config;
