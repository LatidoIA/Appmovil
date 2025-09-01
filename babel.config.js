module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // debe ir al final
      'react-native-reanimated/plugin'
    ]
  };
};
