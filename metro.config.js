// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyShim = path.resolve(__dirname, 'shim-empty.js');
const reanimatedShim = path.resolve(__dirname, 'shim-reanimated.js');

// Conserva el resolver por defecto
const defaultResolver = config.resolver || {};

config.resolver = {
  ...defaultResolver,
  // 1) Bloquea leer @expo/config-plugins
  blockList: exclusionList([/node_modules\/@expo\/config-plugins\/.*/]),
  // 2) Shims de node y de plugins de build (evita que Metro los resuelva)
  extraNodeModules: {
    ...(defaultResolver.extraNodeModules || {}),
    fs: emptyShim,
    'node:fs': emptyShim,
    path: emptyShim,
    'node:path': emptyShim,
    os: emptyShim,
    'node:os': emptyShim,
    '@expo/config-plugins': emptyShim,
    '@expo/prebuild-config': emptyShim,
    'expo/config': emptyShim,

    // evita que Metro intente resolver el nativo de Reanimated
    'react-native-reanimated': reanimatedShim,

    // opcional: si no tienes instalado @react-native-voice/voice,
    '@react-native-voice/voice': emptyShim
  },
  // 3) Asegura que Metro empaquete .wav
  assetExts: [...new Set([...(defaultResolver.assetExts || []), 'wav'])]
};

module.exports = config;
