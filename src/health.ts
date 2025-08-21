// src/health.js
import { Platform, Linking } from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

let _inited = false;

async function ensureInitialized() {
  if (Platform.OS !== 'android') return false;
  if (_inited) return true;
  try {
    const ok = await initialize();
    _inited = !!ok;
    return _inited;
  } catch {
    return false;
  }
}

const STATUS_LABEL = {
  [SdkAvailabilityStatus.SDK_AVAILABLE]: 'SDK_AVAILABLE',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED]: 'PROVIDER_UPDATE_REQUIRED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED]: 'PROVIDER_DISABLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED]: 'PROVIDER_NOT_INSTALLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE]: 'SDK_UNAVAILABLE',
};

const READ_PERMS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];

export async function hcGetStatusDebug() {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    await ensureInitialized();
    const s = await getSdkStatus();
    return { status: s, label: STATUS_LABEL[s] ?? String(s) };
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

export async function isPermissionGranted() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInitialized();
    const granted = await getGrantedPermissions();
    return READ_PERMS.every((p) =>
      granted.some((g) => g.recordType === p.recordType && g.accessType === 'read')
    );
  } catch {
    return false;
  }
}

export async function ensurePermissions() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInitialized();
    const sdk = await getSdkStatus();
    if (sdk !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
    await requestPermission(READ_PERMS);
    return await isPermissionGranted();
  } catch (e) {
    console.debug('[HC] ensurePermissions error:', e?.message || e);
    return false;
  }
}

export async function quickSetup() {
  const ok = await ensurePermissions();
  return !!ok;
}

export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0 };
  try {
    await ensureInitialized();
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const res = await readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: now.toISOString() },
    });
    const total = (res?.records || []).reduce(
      (sum, r) => sum + (Number(r.count) || Number(r.steps) || 0),
      0
    ) || 0;
    return { steps: total };
  } catch (e) {
    console.debug('[HC] readTodaySteps error:', e?.message || e);
    return { steps: 0 };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };
  try {
    await ensureInitialized();
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 2);
    const res = await readRecords('HeartRate', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    });

    let latest = null;
    for (const rec of res?.records || []) {
      if (rec?.samples?.length) {
        for (const s of rec.samples) {
          const t = s.time ? new Date(s.time) : (rec.endTime ? new Date(rec.endTime) : null);
          const bpm = s.beatsPerMinute ?? s.bpm ?? null;
          if (bpm != null && t && (!latest || t > latest.at)) latest = { bpm: Number(bpm), at: t };
        }
      } else {
        const t = rec.endTime ? new Date(rec.endTime) : (rec.startTime ? new Date(rec.startTime) : null);
        const bpm = rec.beatsPerMinute ?? rec.bpm ?? null;
        if (bpm != null && t && (!latest || t > latest.at)) latest = { bpm: Number(bpm), at: t };
      }
    }
    return latest || { bpm: null, at: null };
  } catch (e) {
    console.debug('[HC] readLatestHeartRate error:', e?.message || e);
    return { bpm: null, at: null };
  }
}
