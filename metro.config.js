// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);
const shim = path.resolve(__dirname, 'shim-empty.js');

// Conserva el resolver por defecto
const defaultResolver = config.resolver || {};

config.resolver = {
  ...defaultResolver,
  // 1) Bloquea leer @expo/config-plugins
  blockList: exclusionList([/node_modules\/@expo\/config-plugins\/.*/]),

  // 2) Shims de node y de plugins de build (evita que Metro los resuelva)
  extraNodeModules: {
    ...(defaultResolver.extraNodeModules || {}),
    fs: shim,
    'node:fs': shim,
    path: shim,
    'node:path': shim,
    os: shim,
    'node:os': shim,
    '@expo/config-plugins': shim,
    '@expo/prebuild-config': shim,
    'expo/config': shim,

    // opcional: si no tienes instalado @react-native-voice/voice,
    // evita que Metro lo rompa
    '@react-native-voice/voice': shim,

    // 👇 Aislar módulos problemáticos nativos hacia nuestros shims JS
    'react-native-svg': path.resolve(__dirname, 'src/shims/react-native-svg.js'),
    'react-native-health-connect': path.resolve(
      __dirname,
      'src/shims/react-native-health-connect.js'
    ),
  },

  // 3) Asegura que Metro empaquete .wav
  assetExts: [...new Set([...(defaultResolver.assetExts || []), 'wav'])],
};

module.exports = config;
