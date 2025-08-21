// health.js (RAÍZ) — añade origen/tiempo de cada métrica y búsqueda del sample más reciente global

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

// Permisos mínimos
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
function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
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

// ---- PERMISOS (vía getGrantedPermissions) ----
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
// Pasos de HOY + orígenes (packages) y timestamp del último registro visto
export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0, source: 'na', origins: [], asOf: null };
  await ensureInit();
  const start = startOfTodayIso();
  const end = new Date().toISOString();

  // 1) Aggregate (preferido) — intenta exponer dataOrigins si la lib los provee
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

    if (typeof steps === 'number') {
      const originsFromAgg = (agg?.dataOrigins || agg?.dataOrigin || []).map(o =>
        o?.packageName ?? o?.package ?? o
      );
      return {
        steps,
        source: 'aggregate',
        origins: uniq(originsFromAgg),
        asOf: end,
      };
    }
  } catch {}
  // 2) Fallback raw + orígenes desde metadata.dataOrigin.packageName
  try {
    const { records = [] } = await readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: start, endTime: end },
      ascendingOrder: false,
      pageSize: 200, // suficiente para el día típico
    });
    let total = 0;
    const origins = [];
    let latestTs = null;
    for (const r of records) {
      total += (r?.count ?? r?.steps ?? 0);
      const pkg =
        r?.metadata?.dataOrigin?.packageName ??
        r?.metadata?.dataOrigin?.package ??
        r?.metadata?.dataOrigin ??
        null;
      if (pkg) origins.push(pkg);
      const t = r?.endTime ?? r?.startTime ?? null;
      if (t && (!latestTs || new Date(t).getTime() > new Date(latestTs).getTime())) {
        latestTs = t;
      }
    }
    return { steps: total, source: 'raw', origins: uniq(origins), asOf: latestTs };
  } catch {
    return { steps: 0, source: 'error', origins: [], asOf: null };
  }
}

// Último HR global más reciente dentro de una ventana (buscamos el sample con mayor timestamp)
export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null, origin: null };
  await ensureInit();
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 48); // 48h
    const { records = [] } = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: false,
      pageSize: 100, // escanea suficientes registros recientes
    });

    let best = { bpm: null, at: null, origin: null };
    let bestTs = 0;

    for (const rec of records) {
      const origin =
        rec?.metadata?.dataOrigin?.packageName ??
        rec?.metadata?.dataOrigin?.package ??
        rec?.metadata?.dataOrigin ??
        null;

      if (Array.isArray(rec?.samples) && rec.samples.length) {
        for (const s of rec.samples) {
          const ts = s?.time ? new Date(s.time).getTime() : 0;
          const val = s?.beatsPerMinute ?? s?.bpm ?? null;
          if (val != null && ts > bestTs) {
            bestTs = ts;
            best = { bpm: val, at: s.time, origin };
          }
        }
      } else {
        const ts =
          rec?.endTime ? new Date(rec.endTime).getTime()
          : rec?.startTime ? new Date(rec.startTime).getTime()
          : 0;
        const val = rec?.beatsPerMinute ?? rec?.bpm ?? null;
        if (val != null && ts > bestTs) {
          bestTs = ts;
          best = { bpm: val, at: rec?.endTime ?? rec?.startTime ?? null, origin };
        }
      }
    }

    return best;
  } catch {
    return { bpm: null, at: null, origin: null };
  }
}
