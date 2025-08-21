// health.js (RAÍZ) — estrategia nueva (sin cambios respecto a la última versión)
import { Platform, Linking } from 'react-native';
import {
  initialize,
  SdkAvailabilityStatus,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  aggregateRecord,
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

// Init único
let _inited = false;
async function ensureInit() {
  if (_inited) return;
  await initialize(); // idempotente
  _inited = true;
}

// Utils
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function startOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

// ---- ESTADO SDK / SETTINGS ----
export async function hcGetStatusDebug() {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    await ensureInit();
    const s = await getSdkStatus();
    return { status: s, label: statusLabel[s] ?? String(s) };
  } catch {
    return { status: -2, label: 'STATUS_ERROR' };
  }
}

export async function hcOpenSettings() {
  if (Platform.OS !== 'android') return false;
  await ensureInit();
  try { await openHealthConnectSettings(); return true; } catch {}
  try {
    if (typeof openHealthConnectDataManagement === 'function') {
      await openHealthConnectDataManagement();
      return true;
    }
  } catch {}
  const pkg = 'com.google.android.apps.healthdata';
  try { await Linking.openURL(`market://details?id=${pkg}`); return true; } catch {}
  try { await Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`); return true; } catch {}
  return false;
}

// ---- PERMISOS (estrategia nueva) ----
export async function getGrantedList() {
  if (Platform.OS !== 'android') return [];
  await ensureInit();
  try {
    const list = await getGrantedPermissions();
    return (list || []).map(p => `${p.recordType}:${p.accessType}`);
  } catch {
    return [];
  }
}

export function areAllGranted(grantedList) {
  const need = PERMS.map(p => `${p.recordType}:${p.accessType}`);
  return need.every(x => grantedList.includes(x));
}

export async function hasAllPermissions() {
  const grantedList = await getGrantedList();
  return areAllGranted(grantedList);
}

export async function requestAllPermissions() {
  if (Platform.OS !== 'android') return false;
  await ensureInit();
  try { await requestPermission(PERMS); } catch {}
  for (let i = 0; i < 3; i++) {
    const ok = await hasAllPermissions();
    if (ok) return true;
    await sleep(400);
  }
  return false;
}

export async function quickSetup() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInit();
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

// ---- LECTURAS ----
export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0, source: 'na' };
  await ensureInit();
  const start = startOfTodayIso();
  const end = new Date().toISOString();

  // 1) Aggregate
  try {
    const agg = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: start, endTime: end },
    });
    const steps =
      agg?.count ??
      agg?.countTotal ??
      agg?.steps ??
      null;
    if (typeof steps === 'number') return { steps, source: 'aggregate' };
  } catch {}

  // 2) Fallback raw
  try {
    const { records = [] } = await readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: start, endTime: end },
    });
    const total = records.reduce((sum, r) => sum + (r?.count ?? r?.steps ?? 0), 0);
    return { steps: total, source: 'raw' };
  } catch {
    return { steps: 0, source: 'error' };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };
  await ensureInit();
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 48); // últimas 48h
    const { records = [] } = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: false,
      pageSize: 1,
    });

    if (!records.length) return { bpm: null, at: null };

    const rec = records[0];
    if (Array.isArray(rec.samples) && rec.samples.length) {
      const last = rec.samples[rec.samples.length - 1];
      return { bpm: last?.beatsPerMinute ?? last?.bpm ?? null, at: last?.time ?? rec?.endTime ?? null };
    }
    return { bpm: rec?.beatsPerMinute ?? rec?.bpm ?? null, at: rec?.endTime ?? null };
  } catch {
    return { bpm: null, at: null };
  }
}
