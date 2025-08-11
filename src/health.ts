import {
  initialize,
  isHealthConnectAvailable,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';

const PERMS = [
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'Steps' as const },
];

export async function hcEnsureAvailable() {
  return await isHealthConnectAvailable(); // false: instalar/activar Health Connect
}

export async function hcInitAndRequest() {
  await initialize();
  return await requestPermission(PERMS); // abre el diálogo del sistema
}

export async function hcReadLatestHeartRate() {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const res = await readRecords('HeartRate', {
    timeRangeFilter: { operator: 'between', startTime: start, endTime: now.toISOString() },
    ascending: false,
    pageSize: 1,
  });
  return res.records?.[0] || null; // incluye samples y timestamps
}

export async function hcReadStepsToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const res = await readRecords('Steps', {
    timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: new Date().toISOString() },
  });
  const total = (res.records || []).reduce((sum: number, r: any) => sum + (r.count || 0), 0);
  return { total, count: res.records?.length || 0 };
}
