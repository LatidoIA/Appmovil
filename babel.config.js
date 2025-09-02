module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // otras si las tuvieras…
      'react-native-reanimated/plugin',
    ],
  };
};
