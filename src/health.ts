// src/health.js
import { Platform, Linking } from 'react-native';
import * as RNHC from 'react-native-health-connect';

// -----------------------------
// Init
// -----------------------------
let _initOncePromise = null;
async function ensureInit() {
  if (Platform.OS !== 'android') return false;
  if (!_initOncePromise) {
    _initOncePromise = (async () => {
      try {
        if (typeof RNHC.initialize === 'function') {
          await RNHC.initialize();
        }
        return true;
      } catch (e) {
        console.log('[HC] initialize error:', e?.message || e);
        return false;
      }
    })();
  }
  return _initOncePromise;
}

function statusToLabel(code) {
  const S = RNHC?.SdkAvailabilityStatus || {};
  for (const [k, v] of Object.entries(S)) if (v === code) return k;
  if (code === 0) return 'SDK_AVAILABLE';
  return 'SDK_UNAVAILABLE';
}

// -----------------------------
// API
// -----------------------------
export async function hcGetStatusDebug() {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    await ensureInit();
    if (typeof RNHC.getSdkStatus !== 'function') {
      return { status: -3, label: 'MODULE_NOT_LINKED' };
    }
    const s = await RNHC.getSdkStatus();
    return { status: s, label: statusToLabel(s) };
  } catch (e) {
    console.log('[HC] getSdkStatus error:', e?.message || e);
    return { status: -2, label: 'STATUS_ERROR' };
  }
}

export async function hcOpenSettings() {
  if (Platform.OS !== 'android') return false;
  try {
    if (typeof RNHC.openHealthConnectSettings === 'function') {
      await RNHC.openHealthConnectSettings();
      return true;
    }
  } catch (e) {
    console.log('[HC] openHealthConnectSettings error:', e?.message || e);
  }
  try {
    if (typeof RNHC.openHealthConnectDataManagement === 'function') {
      await RNHC.openHealthConnectDataManagement();
      return true;
    }
  } catch (e) {
    console.log('[HC] openHealthConnectDataManagement error:', e?.message || e);
  }
  const pkg = 'com.google.android.apps.healthdata';
  try { await Linking.openURL(`market://details?id=${pkg}`); return true; } catch {}
  try { await Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`); return true; } catch {}
  return false;
}

export async function requestReadPermissions() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInit();
    if (typeof RNHC.requestPermission !== 'function') {
      console.log('[HC] requestPermission no disponible');
      return false;
    }
    const permissions = [
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'HeartRate' },
    ];
    const res = await RNHC.requestPermission(permissions);
    const grantedList = Array.isArray(res) ? res : res?.granted || [];
    const ok =
      Array.isArray(grantedList) &&
      permissions.every((p) =>
        grantedList.some(
          (g) =>
            (g.recordType || g.type) === p.recordType &&
            (g.accessType || g.access) === p.accessType
        )
      );
    return !!ok;
  } catch (e) {
    console.log('[HC] requestReadPermissions error:', e?.message || e);
    return false;
  }
}

export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0 };
  try {
    await ensureInit();
    if (typeof RNHC.readRecords !== 'function') {
      throw new Error('readRecords no disponible');
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const res = await RNHC.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: now.toISOString(),
      },
      ascending: true,
    });
    const list = res?.records || res || [];
    let total = 0;
    for (const r of list) {
      const n = Number(r?.count ?? 0);
      if (!Number.isNaN(n)) total += n;
    }
    return { steps: total };
  } catch (e) {
    console.log('[HC] readTodaySteps error:', e?.message || e);
    return { steps: 0 };
  }
}

export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };
  try {
    await ensureInit();
    if (typeof RNHC.readRecords !== 'function') {
      throw new Error('readRecords no disponible');
    }
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const res = await RNHC.readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: now.toISOString(),
      },
      ascending: false,
      pageSize: 50,
    });
    const list = res?.records || res || [];
    let latest = null;
    for (const rec of list) {
      if (Array.isArray(rec?.samples) && rec.samples.length) {
        for (const s of rec.samples) {
          const t = new Date(s?.time || s?.startTime || rec?.endTime || rec?.startTime || 0).getTime();
          if (!Number.isFinite(t)) continue;
          const bpm = Number(s?.beatsPerMinute ?? s?.bpm ?? rec?.bpm ?? null);
          if (!Number.isFinite(bpm)) continue;
          if (!latest || t > latest.t) latest = { bpm, at: new Date(t).toISOString(), t };
        }
      } else {
        const t = new Date(rec?.endTime || rec?.startTime || 0).getTime();
        const bpm = Number(rec?.bpm ?? null);
        if (Number.isFinite(t) && Number.isFinite(bpm)) {
          if (!latest || t > latest.t) latest = { bpm, at: new Date(t).toISOString(), t };
        }
      }
    }
    return latest ? { bpm: latest.bpm, at: latest.at } : { bpm: null, at: null };
  } catch (e) {
    console.log('[HC] readLatestHeartRate error:', e?.message || e);
    return { bpm: null, at: null };
  }
}

export async function quickSetup() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInit();
    // No bloqueamos por el estado; simplemente intentamos pedir permisos.
    const ok = await requestReadPermissions();
    return !!ok;
  } catch (e) {
    console.log('[HC] quickSetup error:', e?.message || e);
    return false;
  }
}
