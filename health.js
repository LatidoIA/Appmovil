// health.js (RAÍZ)
// Permisos + lecturas mínimas (Steps, HeartRate). Sin UI ni efectos laterales.
// El modal de App.js se encarga de pedir/abrir permisos.

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

// Permisos mínimos usados por la app en este estado
const PERMS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];

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
  try { await openHealthConnectSettings(); return true; } catch {}
  try { await openHealthConnectDataManagement(); return true; } catch {}
  const pkg = 'com.google.android.apps.healthdata';
  try { await Linking.openURL(`market://details?id=${pkg}`); return true; } catch {}
  try { await Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`); return true; } catch {}
  return false;
}

export async function hasAllPermissions() {
  if (Platform.OS !== 'android') return false;
  try { return await hasPermissions(PERMS); } catch { return false; }
}

export async function requestAllPermissions() {
  if (Platform.OS !== 'android') return false;
  try { await requestPermission(PERMS); } catch {}
  return hasAllPermissions();
}

export async function quickSetup() {
  if (Platform.OS !== 'android') return false;
  try {
    const s = await getSdkStatus();
    if (s !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      try { await openHealthConnectSettings(); } catch {}
      return false;
    }
    const ok = await requestAllPermissions();
    return !!ok;
  } catch {
    return false;
  }
}

// ---- Lecturas (asumen permisos ya otorgados por el modal al inicio) ----

export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0, asOf: null, origins: [] };
  try {
    const end = new Date();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { records = [] } = await readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    });
    const total = records.reduce((sum, r) => sum + (r?.count ?? r?.steps ?? 0), 0);
    const origins = Array.from(new Set(records.map(r => r?.metadata?.dataOrigin?.packageName).filter(Boolean)));
    return { steps: total, asOf: end.toISOString(), origins };
  } catch {
    return { steps: 0, asOf: null, origins: [] };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null, origin: null };
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 48);
    const { records = [] } = await readRecords('HeartRate', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascending: false,
      pageSize: 1,
    });
    if (!records.length) return { bpm: null, at: null, origin: null };
    const rec = records[0];
    let bpm = null; let at = rec?.endTime ?? null;
    if (Array.isArray(rec.samples) && rec.samples.length) {
      const last = rec.samples[rec.samples.length - 1];
      bpm = last?.beatsPerMinute ?? last?.bpm ?? null;
      at = last?.time ?? rec?.endTime ?? at;
    } else {
      bpm = rec?.beatsPerMinute ?? rec?.bpm ?? null;
    }
    const origin = rec?.metadata?.dataOrigin?.packageName ?? null;
    return { bpm, at, origin };
  } catch {
    return { bpm: null, at: null, origin: null };
  }
}
