module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo']
    // ⚠️ Quitamos el plugin de reanimated para no compilar worklets
  };
};
