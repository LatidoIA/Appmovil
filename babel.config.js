module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ¡Siempre al final!
      'react-native-reanimated/plugin',
    ],
  };
};
