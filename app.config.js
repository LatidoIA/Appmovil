// app.config.js
export default () => {
  // Expo/EAS setea esta var en los builds: "dev", "production", etc.
  const profile = process.env.EAS_BUILD_PROFILE || 'production';
  const isDev = profile === 'dev';

  return {
    name: 'Latido',
    slug: 'latido',
    version: '1.0.0',
    sdkVersion: '53.0.0',

    // Paquetes distintos para que el dev client conviva con la release
    android: {
      package: isDev ? 'com.latido.app.dev' : 'com.latido.app'
    },

    extra: {
      eas: {
        // TU projectId real (el que te mostró EAS): no lo cambies
        projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f'
      }
    },

    plugins: [
      // Necesario para Orbit / Development Build
      'expo-dev-client',

      // Propiedades de build (forzamos minSdk 26 por Health Connect)
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 26,
            kotlinVersion: '2.0.21',
            gradleProperties: {
              'android.useAndroidX': 'true',
              'android.enableJetifier': 'true'
            }
          }
        }
      ],

      // Si ya tienes este plugin custom en tu repo, lo mantenemos
      'withStripSupportLibs'
    ],

    platforms: ['ios', 'android']
  };
};
