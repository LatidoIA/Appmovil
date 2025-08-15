// src/health.ts
// Health Connect via react-native-health-connect (import estático + fix SDK status)

import * as HC from 'react-native-health-connect';

type AnyObj = any;

const PERMS = [
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'Steps' as const },
];

// Constantes típicas del SDK de Health Connect
const SDK_UNAVAILABLE = 0;
const SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 1;
const SDK_AVAILABLE = 2;

export async function hcEnsureAvailable(): Promise<boolean> {
  try {
    if (typeof HC.getSdkStatus === 'function') {
      const status = await HC.getSdkStatus();
      if (typeof status === 'number') {
        return status === SDK_AVAILABLE || status === SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED;
      }
      const s = String(status).toLowerCase();
      return s.includes('available') || s.includes('update');
    }
    if (typeof HC.initialize === 'function') {
      await HC.initialize();
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

export async function hcInitAndRequest() {
  try {
    if (typeof HC.initialize === 'function') {
      try { await HC.initialize(); } catch {}
    }
    if (typeof (HC as AnyObj).requestPermission === 'function') {
      return await (HC as AnyObj).requestPermission(PERMS);
    }
    if (typeof (HC as AnyObj).requestPermissions === 'function') {
      return await (HC as AnyObj).requestPermissions(PERMS);
    }
    return [];
  } catch {
    return [];
  }
}

export async function hcReadLatestHeartRate() {
  try {
    if (typeof HC.readRecords !== 'function') return null;

    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const res = await HC.readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: now.toISOString(),
      },
      ascending: false,
      pageSize: 1,
    });

    const records = (res?.records ?? []) as AnyObj[];
    return records[0] ?? null;
  } catch {
    return null;
  }
}

export async function hcReadStepsToday() {
  try {
    if (typeof HC.readRecords !== 'function') return { total: 0, count: 0 };

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const res = await HC.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    const records = (res?.records ?? []) as AnyObj[];
    const total = records.reduce((sum, r) => sum + (r.count ?? 0), 0);
    return { total, count: records.length };
  } catch {
    return { total: 0, count: 0 };
  }
}
