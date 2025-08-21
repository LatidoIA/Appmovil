// src/health.js
import { Platform, Linking } from 'react-native';
import * as HC from 'expo-health-connect';

// Normaliza enums por si cambian de nombre en la lib
export const SdkAvailabilityStatus = HC.SdkAvailabilityStatus || {
  SDK_AVAILABLE: 0,
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 1,
  SDK_UNAVAILABLE_PROVIDER_DISABLED: 2,
  SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED: 3,
  SDK_UNAVAILABLE: 4,
};

// Helpers seguros (evitan "undefined is not a function")
async function getSdkStatusSafe() {
  if (Platform.OS !== 'android') return SdkAvailabilityStatus.SDK_UNAVAILABLE;
  if (typeof HC.getSdkStatus === 'function') {
    return HC.getSdkStatus();
  }
  if (typeof HC.isAvailable === 'function') {
    // fallback muy básico
    const ok = await HC.isAvailable();
    return ok ? SdkAvailabilityStatus.SDK_AVAILABLE : SdkAvailabilityStatus.SDK_UNAVAILABLE;
  }
  return SdkAvailabilityStatus.SDK_UNAVAILABLE;
}

export async function hcGetStatusDebug() {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    const s = await getSdkStatusSafe();
    const labelMap = {
      [SdkAvailabilityStatus.SDK_AVAILABLE]: 'SDK_AVAILABLE',
      [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED]: 'PROVIDER_UPDATE_REQUIRED',
      [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED]: 'PROVIDER_DISABLED',
      [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED]: 'PROVIDER_NOT_INSTALLED',
      [SdkAvailabilityStatus.SDK_UNAVAILABLE]: 'SDK_UNAVAILABLE',
    };
    return { status: s, label: labelMap[s] ?? String(s) };
  } catch {
    return { status: -2, label: 'STATUS_ERROR' };
  }
}

export async function hcOpenSettings() {
  if (Platform.OS !== 'android') return false;
  // 1) Ajustes nativos
  try {
    if (typeof HC.openHealthConnectSettings === 'function') {
      await HC.openHealthConnectSettings();
      return true;
    }
  } catch {}
  // 2) Gestión de datos (fallback)
  try {
    if (typeof HC.openHealthConnectDataManagement === 'function') {
      await HC.openHealthConnectDataManagement();
      return true;
    }
  } catch {}
  // 3) Play Store
  const pkg = 'com.google.android.apps.healthdata';
  try { await Linking.openURL(`market://details?id=${pkg}`); return true; } catch {}
  try { await Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`); return true; } catch {}
  return false;
}

// ---- Permisos y lectura ----

function todayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0,0,0,0);
  return { startTime: start.toISOString(), endTime: now.toISOString() };
}

function hcRecordType(name) {
  // intenta usar constantes si existen
  if (HC.RecordType?.[name]) return HC.RecordType[name];
  return name; // string fallback
}

async function requestReadPermissions() {
  if (Platform.OS !== 'android') return false;
  const perms = [
    { accessType: 'read', recordType: hcRecordType('Steps') },
    { accessType: 'read', recordType: hcRecordType('HeartRate') },
  ];
  // checkPermissions si existe
  try {
    if (typeof HC.checkPermissions === 'function') {
      const res = await HC.checkPermissions(perms);
      if (res?.every?.(p => p?.granted)) return true;
    }
  } catch {}

  try {
    if (typeof HC.requestPermissions === 'function') {
      const res = await HC.requestPermissions(perms);
      return Array.isArray(res) ? res.every(p => p?.granted) : !!res;
    }
  } catch (e) {
    // algunos devices devuelven error si el provider no está listo
    return false;
  }
  return false;
}

export async function quickSetup() {
  if (Platform.OS !== 'android') return false;
  const s = await getSdkStatusSafe();
  // si no está disponible aún, abre ajustes para que el usuario lo active/instale
  if (s !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    await hcOpenSettings();
    return false;
  }
  return requestReadPermissions();
}

export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0 };
  if (typeof HC.readRecords !== 'function') return { steps: 0 };
  const { startTime, endTime } = todayRange();
  try {
    const recs = await HC.readRecords({
      recordType: hcRecordType('Steps'),
      timeRangeFilter: { startTime, endTime },
    });
    const list = Array.isArray(recs?.records) ? recs.records : Array.isArray(recs) ? recs : [];
    const total = list.reduce((sum, r) => sum + (r?.count ?? r?.count?.toString?.() ? Number(r.count) : 0), 0);
    return { steps: Number.isFinite(total) ? total : 0 };
  } catch (e) {
    return { steps: 0 };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };
  if (typeof HC.readRecords !== 'function') return { bpm: null, at: null };
  try {
    // rango amplio (últimos 7 días) para asegurar datos
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
    const recs = await HC.readRecords({
      recordType: hcRecordType('HeartRate'),
      timeRangeFilter: { startTime: start.toISOString(), endTime: end.toISOString() },
      // si la lib soporta paginación/orden, usamos fallback igualmente
    });
    const list = Array.isArray(recs?.records) ? recs.records : Array.isArray(recs) ? recs : [];
    if (!list.length) return { bpm: null, at: null };
    // tomar el más reciente por time o endTime
    const sorted = list
      .map(r => {
        const t = r?.time ?? r?.endTime ?? r?.startTime;
        return { r, ts: t ? new Date(t).getTime() : 0 };
      })
      .sort((a,b) => b.ts - a.ts);
    const latest = sorted[0]?.r;
    // en HeartRate, algunas libs devuelven samples; si hay samples, tomar la última
    if (latest?.samples?.length) {
      const lastS = latest.samples[latest.samples.length - 1];
      const bpm = Number(lastS?.beatsPerMinute ?? lastS?.bpm ?? lastS?.value ?? latest?.bpm ?? latest?.beatsPerMinute);
      const at  = lastS?.time ?? latest?.time ?? latest?.endTime ?? latest?.startTime ?? null;
      return { bpm: Number.isFinite(bpm) ? bpm : null, at };
    }
    const bpm = Number(latest?.beatsPerMinute ?? latest?.bpm ?? latest?.value);
    const at  = latest?.time ?? latest?.endTime ?? latest?.startTime ?? null;
    return { bpm: Number.isFinite(bpm) ? bpm : null, at };
  } catch {
    return { bpm: null, at: null };
  }
}
