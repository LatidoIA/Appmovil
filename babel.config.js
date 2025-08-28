// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // (si usas otros plugins, van antes)
      'react-native-reanimated/plugin'
    ]
  };
};
