// 👇 añade esta import arriba (junto a Platform)
import { Platform, Linking } from 'react-native';

// ...

// Mapa legible de estados del SDK (déjalo como lo tienes)
const statusLabel: Record<number, string> = {
  [SdkAvailabilityStatus.SDK_AVAILABLE]: 'SDK_AVAILABLE',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED]: 'PROVIDER_UPDATE_REQUIRED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED]: 'PROVIDER_DISABLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED]: 'PROVIDER_NOT_INSTALLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE]: 'SDK_UNAVAILABLE',
};

// ✅ SIEMPRE devuelve algo legible (con try/catch)
export async function hcGetStatusDebug(): Promise<{ status: number; label: string }> {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    const s = await getSdkStatus();
    return { status: s, label: statusLabel[s] ?? String(s) };
  } catch {
    return { status: -2, label: 'STATUS_ERROR' };
  }
}

// ✅ Abrir ajustes con fallback a Play Store (sin libs extra)
export async function hcOpenSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  // 1) Intent nativo de ajustes HC
  try {
    await openHealthConnectSettings();
    return true;
  } catch {}

  // 2) Fallback a pantalla de gestión de datos
  try {
    await openHealthConnectDataManagement();
    return true;
  } catch {}

  // 3) Fallback a Play Store (algunas ROMs sólo permiten abrir desde la tienda)
  const pkg = 'com.google.android.apps.healthdata';
  try {
    await Linking.openURL(`market://details?id=${pkg}`);
    return true;
  } catch {}
  try {
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`);
    return true;
  } catch {}

  return false;
}
