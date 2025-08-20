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
    await initialize(); // idempotente
    const res = await requestPermission(HEALTH_PERMS);
    // res es un array con los permisos retornados; si vuelve vacío, lo tratamos como no concedido
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
    const records = await readRecords('Steps', {
      timeRangeFilter: { startTime: startOfTodayISO(), endTime: nowISO() },
    });
    // Health Connect Steps tiene propiedad 'count'
    const total = (records || []).reduce((acc, r) => acc + (r?.count || 0), 0);
    return { steps: total };
  } catch (e) {
    // sin permiso o sin datos
    return { steps: 0 };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };
  try {
    const records = await readRecords('HeartRate', {
      timeRangeFilter: { startTime: startOfTodayISO(), endTime: nowISO() },
      // Si tu versión soporta "ascending: false, limit: 1" puedes añadirlo.
    });
    if (!records || records.length === 0) return { bpm: null, at: null };

    // Tomar la última muestra por startTime
    const last = records.reduce((a, b) => {
      const atA = new Date(a?.startTime || 0).getTime();
      const atB = new Date(b?.startTime || 0).getTime();
      return atB > atA ? b : a;
    });

    // En HeartRate cada record puede traer samples; si no, usa average
    let bpm = null;
    if (Array.isArray(last?.samples) && last.samples.length > 0) {
      bpm = last.samples[last.samples.length - 1]?.beatsPerMinute ?? null;
    } else {
      bpm = last?.beatsPerMinute ?? last?.heartRate?.value ?? null;
    }

    return { bpm: bpm ?? null, at: last?.startTime ?? null };
  } catch (e) {
    return { bpm: null, at: null };
  }
}
