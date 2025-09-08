const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// agrega .wav si no estuviera
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts || []), 'wav'])
);

module.exports = config;
