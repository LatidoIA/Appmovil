// src/health.ts
import {
  initialize,
  isHealthConnectAvailable,
  openHealthConnectSettings,
  getGrantedPermissions,
  requestPermission,
  readRecords,
  Permission,
} from "react-native-health-connect";

const PERMS: Permission[] = [
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "Steps" },
];

export async function ensureHealthConnect(): Promise<{
  available: boolean;
  granted: boolean;
}> {
  const available = await isHealthConnectAvailable();
  if (!available) return { available: false, granted: false };

  await initialize();

  const grantedNow = await getGrantedPermissions();
  const needed = new Set(PERMS.map((p) => `${p.accessType}:${p.recordType}`));
  const have = new Set(grantedNow.map((p) => `${p.accessType}:${p.recordType}`));
  const missing = [...needed].filter((k) => !have.has(k));

  if (missing.length > 0) {
    await requestPermission(PERMS);
  }

  const grantedAfter = await getGrantedPermissions();
  const haveAll = PERMS.every(
    (p) => grantedAfter.find((g) => g.accessType === p.accessType && g.recordType === p.recordType) != null
  );

  return { available: true, granted: haveAll };
}

export async function goToHealthConnectSettings() {
  await openHealthConnectSettings();
}

export async function readLatestSamples() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  // Heart rate
  const hr = await readRecords("HeartRate", {
    timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() },
    ascendingOrder: false,
    pageSize: 100,
  });

  // Steps
  const steps = await readRecords("Steps", {
    timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() },
    ascendingOrder: false,
    pageSize: 100,
  });

  return {
    heartRateCount: hr.records?.length ?? 0,
    stepsTotal: (steps.records ?? []).reduce((sum: number, r: any) => sum + (r.count ?? 0), 0),
  };
}
