// health.js
import { Platform, Linking } from 'react-native';
import {
  SdkAvailabilityStatus,
  getSdkStatus,
  requestPermission,
  hasPermissions,
  readRecords,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
} from 'react-native-health-connect';

// Permisos mínimos para tus métricas
const PERMS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];

// Mapa legible de estados del SDK
const statusLabel = {
  [SdkAvailabilityStatus.SDK_AVAILABLE]: 'SDK_AVAILABLE',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED]: 'PROVIDER_UPDATE_REQUIRED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED]: 'PROVIDER_DISABLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED]: 'PROVIDER_NOT_INSTALLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE]: 'SDK_UNAVAILABLE',
};

export async function hcGetStatusDebug() {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    const s = await getSdkStatus();
    return { status: s, label: statusLabel[s] ?? String(s) };
  } catch {
    return { status: -2, label: 'STATUS_ERROR' };
  }
}

export async function hcOpenSettings() {
  if (Platform.OS !== 'android') return false;
  // 1) Ajustes específicos de HC
  try {
    await openHealthConnectSettings();
    return true;
  } catch {}
  // 2) Gestión de datos (fallback)
  try {
    await openHealthConnectDataManagement();
    return true;
  } catch {}
  // 3) Tienda
  const pkg = 'com.google.android.apps.healthdata';
  try { await Linking.openURL(`market://details?id=${pkg}`); return true; } catch {}
  try { await Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`); return true; } catch {}
  return false;
}

export async function hasAllPermissions() {
  if (Platform.OS !== 'android') return false;
  try {
    return await hasPermissions(PERMS);
  } catch {
    return false;
  }
}

export async function requestAllPermissions() {
  if (Platform.OS !== 'android') return false;
  try {
    await requestPermission(PERMS);
  } catch {}
  // siempre confirmamos con hasAllPermissions
  return hasAllPermissions();
}

export async function quickSetup() {
  if (Platform.OS !== 'android') return false;
  try {
    const s = await getSdkStatus();
    if (s !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      // si no está disponible, abrimos ajustes y devolvemos false
      try { await openHealthConnectSettings(); } catch {}
      return false;
    }
    // Pedimos permisos y confirmamos
    const ok = await requestAllPermissions();
    return !!ok;
  } catch {
    return false;
  }
}

// ---- LECTURAS ----

export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0 };
  try {
    const end = new Date();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { records = [] } = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    const total = records.reduce((sum, r) => sum + (r?.count ?? r?.steps ?? 0), 0);
    return { steps: total };
  } catch {
    return { steps: 0 };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 48); // últimas 48h
    const { records = [] } = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascending: false,
      pageSize: 1,
    });

    if (!records.length) return { bpm: null, at: null };

    const rec = records[0];
    if (Array.isArray(rec.samples) && rec.samples.length) {
      const last = rec.samples[rec.samples.length - 1];
      return { bpm: last?.beatsPerMinute ?? last?.bpm ?? null, at: last?.time ?? rec?.endTime ?? null };
    }
    // algunos proveedores dejan el valor plano
    return { bpm: rec?.beatsPerMinute ?? rec?.bpm ?? null, at: rec?.endTime ?? null };
  } catch {
    return { bpm: null, at: null };
  }
}
