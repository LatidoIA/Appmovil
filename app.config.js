// app.config.js
module.exports = () => ({
  expo: {
    name: 'Latido',
    slug: 'latido',
    version: '1.0.0',
    sdkVersion: '53.0.0',
    platforms: ['ios', 'android'],

    android: {
      package: 'com.latido.app',
      permissions: [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.BODY_SENSORS',
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.POST_NOTIFICATIONS'
      ],
    },

    plugins: [
      // Configuración de niveles de SDK/MinSDK/Kotlin
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

      // Plugin que añade Health Connect (manifiesto/gradle nativos)
      'expo-health-connect'
    ],

    extra: {
      eas: {
        // tu Project ID real
        projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f'
      }
    }
  }
});
