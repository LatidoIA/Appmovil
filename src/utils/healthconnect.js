// src/utils/healthconnect.
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

export async function abrirAjustesHC() {
  if (Platform.OS !== 'android') return;

  try {
    // Intent directo a ajustes de Health Connect
    await IntentLauncher.startActivityAsync(
      'androidx.health.ACTION_HEALTH_CONNECT_SETTINGS'
    );
  } catch {
    // Si no está instalado, abrir en Play Store
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: 'market://details?id=com.google.android.apps.healthdata',
      });
    } catch {
      // Último recurso: URL web
      await Linking.openURL(
        'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'
      );
    }
  }
}
