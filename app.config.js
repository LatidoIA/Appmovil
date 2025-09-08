module.exports = () => ({
  expo: {
    name: 'Latido',
    slug: 'latido',
    version: '1.0.0',
    sdkVersion: '51.0.0',
    scheme: 'latido',
    platforms: ['ios', 'android'],
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    android: {
      package: 'com.latido.app',
      permissions: [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.BODY_SENSORS',
        'android.permission.POST_NOTIFICATIONS'
      ]
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 26,
            kotlinVersion: '1.9.24'
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: '2ac93018-3731-4e46-b345-6d54a5502b8f'
      }
    }
  }
});
