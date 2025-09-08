module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // reanimated SIEMPRE al final
      'react-native-reanimated/plugin',
    ],
  };
};
