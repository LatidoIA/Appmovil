// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyShim = path.resolve(__dirname, 'shim-empty.js');
const reanimatedShim = path.resolve(__dirname, 'shim-reanimated.js');
const hcShim = path.resolve(__dirname, 'shim-health-connect.js');

// Conserva el resolver por defecto
const defaultResolver = config.resolver || {};

config.resolver = {
  ...defaultResolver,
  // 1) Bloquea leer @expo/config-plugins
  blockList: exclusionList([/node_modules\/@expo\/config-plugins\/.*/]),
  // 2) Shims de node y libs nativas que no queremos compilar
  extraNodeModules: {
    ...(defaultResolver.extraNodeModules || {}),

    // shims de node
    fs: emptyShim,
    'node:fs': emptyShim,
    path: emptyShim,
    'node:path': emptyShim,
    os: emptyShim,
    'node:os': emptyShim,

    // evita que Metro resuelva plugins de build
    '@expo/config-plugins': emptyShim,
    '@expo/prebuild-config': emptyShim,
    'expo/config': emptyShim,

    // módulos nativos que deshabilitamos en este build
    'react-native-reanimated': reanimatedShim,
    'react-native-health-connect': hcShim,
    'expo-health-connect': hcShim, // por si algún import apunta a expo-health-connect

    // opcional: si no está instalado en tu repo
    '@react-native-voice/voice': emptyShim,
  },
  // 3) Asegura que Metro empaquete .wav
  assetExts: [...new Set([...(defaultResolver.assetExts || []), 'wav'])],
};

module.exports = config;
