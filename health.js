// health.js (RAÍZ)
// Lecturas desde Health Connect: Steps, HeartRate, SpO2, SleepSession, BloodPressure
// Permisos dinámicos + initialize() único + funciones robustas con fallbacks.

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
  if (_inited) return;
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
export
