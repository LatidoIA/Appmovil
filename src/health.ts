// src/health.ts
// Adaptado para expo-health-connect (SDK 53 / RN 0.79)

import {
  isAvailableAsync as isHealthConnectAvailable,
  requestPermissionsAsync,
  readRecordsAsync,
} from 'expo-health-connect';

const PERMS = [
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'Steps' as const },
];

export async function hcEnsureAvailable() {
  // false ⇒ el usuario debe instalar/activar Health Connect
  return await isHealthConnectAvailable();
}

export async function hcInitAndRequest() {
  // En expo-health-connect no se requiere initialize()
  // Solicita permisos mediante el diálogo del sistema
  return await requestPermissionsAsync(PERMS);
}

export async function hcReadLatestHeartRate() {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const res: any = await readRecordsAsync({
    recordType: 'HeartRate',
    timeRangeFilter: { startTime: start, endTime: now }, // sin "operator"
    ascending: false,
    pageSize: 1,
  });

  return res?.records?.[0] ?? null; // incluye samples y timestamps
}

export async function hcReadStepsToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const res: any = await readRecordsAsync({
    recordType: 'Steps',
    timeRangeFilter: { startTime: start, endTime: new Date() },
  });

  const records = res?.records ?? [];
  const total = records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);

  return { total, count: records.length };
}
