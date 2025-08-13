module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // ¡Siempre al final!
    plugins: ['react-native-reanimated/plugin'],
  };
};
