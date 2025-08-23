// health.js (RAÍZ)
// Única fuente de verdad para Health Connect.
// Incluye: quickSetup, estado/debug, permisos, y lecturas: Steps, HeartRate, SpO2, Sleep(24h), BloodPressure, Stress.
// Defensivo ante diferencias de campos según versión de la lib.

import { Platform, Linking } from 'react-native';
import {
  SdkAvailabilityStatus,
  getSdkStatus,
  requestPermission,
  hasPermissions,
  readRecords,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
  // algunas versiones exponen getGrantedPermissions; lo manejamos con try/catch
} from 'react-native-health-connect';

// ---- Permisos mínimos para tus métricas ----
const PERMS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'BloodPressure' },
  { accessType: 'read', recordType: 'Stress' }, // si no existe, leerá en try/catch
];

// ---- Mapa legible de estados del SDK ----
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

// Lista “humana” de permisos concedidos (si la lib lo soporta)
export async function getGrantedList() {
  if (Platform.OS !== 'android') return [];
  try {
    // @ts-ignore — algunas versiones exponen getGrantedPermissions
    const { getGrantedPermissions } = require('react-native-health-connect');
    if (typeof getGrantedPermissions === 'function') {
      const granted = await getGrantedPermissions();
      // normaliza a array de nombres de recordType
      return (granted || []).map(g => g.recordType || g.name).filter(Boolean);
    }
  } catch {}
  // Fallback: si hasPermissions devuelve true, devolvemos PERMS nominales
  const ok = await hasAllPermissions();
  return ok ? PERMS.map(p => p.recordType) : [];
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

// ------------------ LECTURAS ------------------

// Steps (hoy, sumatoria)
export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0, origins: [], asOf: null };
  try {
    const end = new Date();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { records = [] } = await readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    });
    const total = records.reduce((sum, r) => sum + (r?.count ?? r?.steps ?? 0), 0);
    // orígenes
    const origins = Array.from(new Set(records.map(r => r?.metadata?.dataOrigin?.packageName).filter(Boolean)));
    return { steps: total, origins, asOf: end.toISOString() };
  } catch {
    return { steps: 0, origins: [], asOf: null };
  }
}

// HeartRate (última muestra en 48h)
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
    // samples array o valor directo
    let bpm = null;
    let at = rec?.endTime ?? null;
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

// SpO2 (última muestra 72h)
export async function readLatestSpO2() {
  if (Platform.OS !== 'android') return { spo2: null, at: null, origin: null };
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 72);
    const { records = [] } = await readRecords('OxygenSaturation', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascending: false,
      pageSize: 1,
    });
    if (!records.length) return { spo2: null, at: null, origin: null };
    const rec = records[0];
    // distintos nombres según versión
    const spo2 = rec?.percentage ?? rec?.oxygenSaturation ?? rec?.value ?? null;
    const at = rec?.time ?? rec?.endTime ?? null;
    const origin = rec?.metadata?.dataOrigin?.packageName ?? null;
    return { spo2: spo2 != null ? Math.round(Number(spo2)) : null, at, origin };
  } catch {
    return { spo2: null, at: null, origin: null };
  }
}

// Sleep (últimas 24h) — total en horas
export async function readSleepLast24h() {
  if (Platform.OS !== 'android') return { hours: null, rangeStart: null, rangeEnd: null, origins: [] };
  try {
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - 1000 * 60 * 60 * 24);
    const { records = [] } = await readRecords('SleepSession', {
      timeRangeFilter: { operator: 'overlaps', startTime: rangeStart.toISOString(), endTime: rangeEnd.toISOString() },
    });
    let ms = 0;
    const originsSet = new Set();
    for (const s of records) {
      const st = new Date(s.startTime).getTime();
      const en = new Date(s.endTime).getTime();
      const clippedStart = Math.max(st, rangeStart.getTime());
      const clippedEnd = Math.min(en, rangeEnd.getTime());
      if (clippedEnd > clippedStart) ms += (clippedEnd - clippedStart);
      const o = s?.metadata?.dataOrigin?.packageName;
      if (o) originsSet.add(o);
    }
    const hours = ms ? +(ms / 36e5).toFixed(1) : null;
    return { hours, rangeStart: rangeStart.toISOString(), rangeEnd: rangeEnd.toISOString(), origins: Array.from(originsSet) };
  } catch {
    return { hours: null, rangeStart: null, rangeEnd: null, origins: [] };
  }
}

// Blood Pressure (última lectura 14 días)
export async function readLatestBloodPressure() {
  if (Platform.OS !== 'android') return { sys: null, dia: null, at: null, origin: null };
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 14);
    const { records = [] } = await readRecords('BloodPressure', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascending: false,
      pageSize: 1,
    });
    if (!records.length) return { sys: null, dia: null, at: null, origin: null };
    const r = records[0];
    // diferentes formas: {systolic:{value}, diastolic:{value}} o {systolic:120, diastolic:80} o {sys, dia}
    const sys = r?.systolic?.value ?? r?.systolic ?? r?.sys ?? null;
    const dia = r?.diastolic?.value ?? r?.diastolic ?? r?.dia ?? null;
    const at = r?.endTime ?? r?.time ?? null;
    const origin = r?.metadata?.dataOrigin?.packageName ?? null;
    return { sys: sys != null ? Math.round(Number(sys)) : null, dia: dia != null ? Math.round(Number(dia)) : null, at, origin };
  } catch {
    return { sys: null, dia: null, at: null, origin: null };
  }
}

// Stress (último 72h) — puede NO existir; devolvemos null si la lib no lo soporta
export async function readLatestStress() {
  if (Platform.OS !== 'android') return { value: null, label: null, at: null };
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60 * 72);
    const { records = [] } = await readRecords('Stress', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      ascending: false,
      pageSize: 1,
    });
    if (!records.length) return { value: null, label: null, at: null };
    const r = records[0];
    const v = r?.level ?? r?.value ?? null; // 0-100 o escala propia
    let label = null;
    const n = Number(v);
    if (!Number.isNaN(n)) {
      if (n < 33) label = 'Bajo';
      else if (n < 66) label = 'Normal';
      else label = 'Alto';
    }
    const at = r?.endTime ?? r?.time ?? null;
    return { value: v != null ? Math.round(n) : null, label, at };
  } catch {
    return { value: null, label: null, at: null };
  }
}
