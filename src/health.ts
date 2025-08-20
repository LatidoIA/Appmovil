// src/health.js
import { Platform, Linking } from 'react-native';
import {
  initialize,
  requestPermission,
  getSdkStatus,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
  readRecords,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

// ——————————————————————————————
// Util: asegurar inicialización (idempotente)
// ——————————————————————————————
export async function ensureInitialized() {
  if (Platform.OS !== 'android') return false;
  try {
    await initialize(); // no falla si ya estaba inicializado
    return true;
  } catch {
    return false;
  }
}

// ——————————————————————————————
// Mapa legible de estados
// ——————————————————————————————
const statusLabel = {
  [SdkAvailabilityStatus.SDK_AVAILABLE]: 'SDK_AVAILABLE',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED]: 'PROVIDER_UPDATE_REQUIRED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED]: 'PROVIDER_DISABLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED]: 'PROVIDER_NOT_INSTALLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE]: 'SDK_UNAVAILABLE',
};

// ——————————————————————————————
// Estado legible (siempre responde)
// ——————————————————————————————
export async function hcGetStatusDebug() {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    await ensureInitialized();
    const s = await getSdkStatus();
    return { status: s, label: statusLabel[s] ?? String(s) };
  } catch {
    return { status: -2, label: 'STATUS_ERROR' };
  }
}

// ——————————————————————————————
// Abrir ajustes HC con fallbacks
// ——————————————————————————————
export async function hcOpenSettings() {
  if (Platform.OS !== 'android') return false;

  try {
    await openHealthConnectSettings();
    return true;
  } catch {}

  try {
    await openHealthConnectDataManagement();
    return true;
  } catch {}

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

// ——————————————————————————————
// Solicitud de permisos (pasos + pulso)
// ——————————————————————————————
const HEALTH_PERMS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];

export async function quickSetup() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInitialized();
    const res = await requestPermission(HEALTH_PERMS);
    return Array.isArray(res) ? res.length > 0 : !!res;
  } catch (e) {
    console.debug('quickSetup error:', e?.message || e);
    return false;
  }
}

// ——————————————————————————————
// Lecturas: Pasos (hoy) y último pulso
// ——————————————————————————————
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function nowISO() {
  return new Date().toISOString();
}

export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0 };
  try {
    await ensureInitialized();
    const records = await readRecords('Steps', {
      timeRangeFilter: { startTime: startOfTodayISO(), endTime: nowISO() },
    });
    const total = (records || []).reduce((acc, r) => acc + (r?.count || 0), 0);
    return { steps: total };
  } catch (e) {
    console.debug('readTodaySteps error:', e?.message || e);
    return { steps: 0 };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };
  try {
    await ensureInitialized();
    const records = await readRecords('HeartRate', {
      timeRangeFilter: { startTime: startOfTodayISO(), endTime: nowISO() },
    });
    if (!records || records.length === 0) return { bpm: null, at: null };

    const last = records.reduce((a, b) => {
      const atA = new Date(a?.startTime || 0).getTime();
      const atB = new Date(b?.startTime || 0).getTime();
      return atB > atA ? b : a;
    });

    let bpm = null;
    if (Array.isArray(last?.samples) && last.samples.length > 0) {
      bpm = last.samples[last.samples.length - 1]?.beatsPerMinute ?? null;
    } else {
      bpm = last?.beatsPerMinute ?? last?.heartRate?.value ?? null;
    }

    return { bpm: bpm ?? null, at: last?.startTime ?? null };
  } catch (e) {
    console.debug('readLatestHeartRate error:', e?.message || e);
    return { bpm: null, at: null };
  }
}
