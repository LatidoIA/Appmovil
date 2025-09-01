// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated siempre al final
      'react-native-reanimated/plugin',
    ],
  };
};
