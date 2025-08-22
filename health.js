// health.js (RAÍZ)
// Health Connect: Steps, HeartRate, OxygenSaturation (SpO2), SleepSession, BloodPressure
// initialize() único, permisos dinámicos y lectores con fallbacks.

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

// ---- Tipos HC ----
const RT_STEPS = 'Steps';
const RT_HR = 'HeartRate';
const RT_SPO2 = 'OxygenSaturation';
const RT_SLEEP = 'SleepSession';
const RT_BP = 'BloodPressure';

// ---- Permisos (solo lectura) ----
const PERMS = [
  { accessType: 'read', recordType: RT_STEPS },
  { accessType: 'read', recordType: RT_HR },
  { accessType: 'read', recordType: RT_SPO2 },
  { accessType: 'read', recordType: RT_SLEEP },
  { accessType: 'read', recordType: RT_BP },
];

// ---- Init único ----
let _inited = false;
async function ensureInit() {
  if (_inited || Platform.OS !== 'android') return;
  await initialize(); // idempotente
  _inited = true;
}

// ---- Utils ----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function startOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}
function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}
function overlapMs(aStartIso, aEndIso, bStartIso, bEndIso) {
  const a0 = new Date(aStartIso).getTime();
  const a1 = new Date(aEndIso).getTime();
  const b0 = new Date(bStartIso).getTime();
  const b1 = new Date(bEndIso).getTime();
  const start = Math.max(a0, b0);
  const end = Math.min(a1, b1);
  return Math.max(0, end - start);
}

// ---- Estado SDK / Settings ----
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

// ---- Permisos (vía getGrantedPermissions) ----
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
  // pequeño reintento
  for (let i = 0; i < 3; i++) {
    const ok = await hasAllPermissions();
    if (ok) return true;
    await sleep(300);
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

// ---- Lecturas ----

// Pasos HOY
export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0, source: 'na', origins: [], asOf: null };
  await ensureInit();
  const start = startOfTodayIso();
  const end = new Date().toISOString();

  // Aggregate
  try {
    const agg = await aggregateRecord({
      recordType: RT_STEPS,
      timeRangeFilter: { operator: 'between', startTime: start, endTime: end },
    });
    const steps = agg?.count ?? agg?.countTotal ?? agg?.steps ?? null;
    if (typeof steps === 'number') {
      const originsFromAgg = (agg?.dataOrigins || agg?.dataOrigin || []).map(o =>
        o?.packageName ?? o?.package ?? o
      );
      return { steps, source: 'aggregate', origins: uniq(originsFromAgg), asOf: end };
    }
  } catch {}
  // Raw
  try {
    const { records = [] } = await readRecords(RT_STEPS, {
      timeRangeFilter: { operator: 'between', startTime: start, endTime: end },
      ascendingOrder: false,
      pageSize: 200,
    });
    let total = 0;
    const origins = [];
    let latestTs = null;
    for (const r of records) {
      total += (r?.count ?? r?.steps ?? 0);
      const pkg =
        r?.metadata?.dataOrigin?.packageName ??
        r?.metadata?.dataOrigin?.package ??
        r?.metadata?.dataOrigin ?? null;
      if (pkg) origins.push(pkg);
      const t = r?.endTime ?? r?.startTime ?? null;
      if (t && (!latestTs || new Date(t) > new Date(latestTs))) latestTs = t;
    }
    return { steps: total, source: 'raw', origins: uniq(origins), asOf: latestTs };
  } catch {
    return { steps: 0, source: 'error', origins: [], asOf: null };
  }
}

// Frecuencia cardíaca — último sample (48h)
export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null, origin: null };
  await ensureInit();
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 48);
    const { records = [] } = await readRecords(RT_HR, {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascendingOrder: false,
      pageSize: 100,
    });

    let best = { bpm: null, at: null, origin: null }, bestTs = 0;
    for (const rec of records) {
      const origin =
        rec?.metadata?.dataOrigin?.packageName ??
        rec?.metadata?.dataOrigin?.package ??
        rec?.metadata?.dataOrigin ?? null;

      if (Array.isArray(rec?.samples) && rec.samples.length) {
        for (const s of rec.samples) {
          const ts = s?.time ? new Date(s.time).getTime() : 0;
          const val = s?.beatsPerMinute ?? s?.bpm ?? null;
          if (val != null && ts > bestTs) { bestTs = ts; best = { bpm: val, at: s.time, origin }; }
        }
      } else {
        const ts = rec?.endTime ? new Date(rec.endTime).getTime()
                : rec?.startTime ? new Date(rec.startTime).getTime() : 0;
        const val = rec?.beatsPerMinute ?? rec?.bpm ?? null;
        if (val != null && ts > bestTs) { bestTs = ts; best = { bpm: val, at: rec?.endTime ?? rec?.startTime ?? null, origin }; }
      }
    }
    return best;
  } catch {
    return { bpm: null, at: null, origin: null };
  }
}

// SpO₂ — último sample (48h)
export async function readLatestSpO2() {
  if (Platform.OS !== 'android') return { spo2: null, at: null, origin: null };
  await ensureInit();
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 48);
    const { records = [] } = await readRecords(RT_SPO2, {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascendingOrder: false,
      pageSize: 100,
    });

    let best = { spo2: null, at: null, origin: null }, bestTs = 0;
    for (const rec of records) {
      const origin =
        rec?.metadata?.dataOrigin?.packageName ??
        rec?.metadata?.dataOrigin?.package ??
        rec?.metadata?.dataOrigin ?? null;

      if (Array.isArray(rec?.samples) && rec.samples.length) {
        for (const s of rec.samples) {
          const ts = s?.time ? new Date(s.time).getTime() : 0;
          const val = s?.percentage ?? s?.oxygenSaturation ?? s?.value ?? null;
          if (val != null && ts > bestTs) { bestTs = ts; best = { spo2: val, at: s.time, origin }; }
        }
      } else {
        const ts = rec?.time ? new Date(rec.time).getTime()
                : rec?.endTime ? new Date(rec.endTime).getTime()
                : rec?.startTime ? new Date(rec.startTime).getTime() : 0;
        const val = rec?.percentage ?? rec?.oxygenSaturation ?? rec?.value ?? null;
        if (val != null && ts > bestTs) { bestTs = ts; best = { spo2: val, at: rec?.time ?? rec?.endTime ?? rec?.startTime ?? null, origin }; }
      }
    }
    return best;
  } catch {
    return { spo2: null, at: null, origin: null };
  }
}

// Sueño — total horas últimas 24h
export async function readSleepLast24h() {
  if (Platform.OS !== 'android') return { hours: null, origins: [], rangeEnd: null };
  await ensureInit();
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 24);
    const { records = [] } = await readRecords(RT_SLEEP, {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascendingOrder: false,
      pageSize: 200,
    });

    let totalMs = 0;
    const origins = [];
    for (const r of records) {
      const ms = overlapMs(r.startTime, r.endTime, start.toISOString(), end.toISOString());
      totalMs += ms;
      const pkg =
        r?.metadata?.dataOrigin?.packageName ??
        r?.metadata?.dataOrigin?.package ??
        r?.metadata?.dataOrigin ?? null;
      if (pkg) origins.push(pkg);
    }
    const hours = totalMs ? Number((totalMs / 3600000).toFixed(1)) : null;
    return { hours, origins: uniq(origins), rangeEnd: end.toISOString() };
  } catch {
    return { hours: null, origins: [], rangeEnd: null };
  }
}

// Presión arterial — último registro (7 días)
export async function readLatestBloodPressure() {
  if (Platform.OS !== 'android') return { sys: null, dia: null, at: null, origin: null };
  await ensureInit();
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 7);
    const { records = [] } = await readRecords(RT_BP, {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascendingOrder: false,
      pageSize: 100,
    });

    let best = { sys: null, dia: null, at: null, origin: null }, bestTs = 0;

    for (const rec of records) {
      const origin =
        rec?.metadata?.dataOrigin?.packageName ??
        rec?.metadata?.dataOrigin?.package ??
        rec?.metadata?.dataOrigin ?? null;

      const sys =
        rec?.systolic?.mmHg ??
        rec?.systolic?.millimetersOfMercury ??
        rec?.systolic?.value ?? null;

      const dia =
        rec?.diastolic?.mmHg ??
        rec?.diastolic?.millimetersOfMercury ??
        rec?.diastolic?.value ?? null;

      const ts = rec?.time ? new Date(rec.time).getTime()
              : rec?.endTime ? new Date(rec.endTime).getTime()
              : rec?.startTime ? new Date(rec.startTime).getTime() : 0;

      if (sys != null && dia != null && ts > bestTs) {
        bestTs = ts;
        best = { sys: Math.round(sys), dia: Math.round(dia), at: rec?.time ?? rec?.endTime ?? rec?.startTime ?? null, origin };
      }
    }

    return best;
  } catch {
    return { sys: null, dia: null, at: null, origin: null };
  }
}
