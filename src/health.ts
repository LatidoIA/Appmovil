// src/health.ts
// LATIDO — Health Connect (Android)
// Expo SDK 53 / RN 0.79.5
// Usa: expo-health-connect (plugin) + react-native-health-connect (API)

import { Platform } from 'react-native';
import {
  initialize,
  getSdkStatus,
  SdkAvailabilityStatus,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
  readRecords,
  type Permission,
  type ReadRecordsOptions,
} from 'react-native-health-connect';

// ---------- Config ----------
const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];

const DEFAULT_HR_WINDOW_MIN = 60;
const DEFAULT_POLL_MS = 30_000;

let _initialized = false;

// ---------- Utils ----------
const toIso = (d: Date) => d.toISOString();
const startOfLocalDay = (d = new Date()) => {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
};

// Mapa legible de estados del SDK
const statusLabel: Record<number, string> = {
  [SdkAvailabilityStatus.SDK_AVAILABLE]: 'SDK_AVAILABLE',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED]:
    'PROVIDER_UPDATE_REQUIRED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED]:
    'PROVIDER_DISABLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED]:
    'PROVIDER_NOT_INSTALLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE]: 'SDK_UNAVAILABLE',
};

// ---------- API pública ----------
/** Diagnóstico del estado de Health Connect */
export async function hcGetStatusDebug(): Promise<{ status: number; label: string }> {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  const s = await getSdkStatus();
  return { status: s, label: statusLabel[s] ?? String(s) };
}

/** Disponibilidad “estricta” (histórico) */
export async function hcEnsureAvailable(): Promise<{ available: boolean; status: number }> {
  if (Platform.OS !== 'android') return { available: false, status: -1 };
  const status = await getSdkStatus();
  return { available: status === SdkAvailabilityStatus.SDK_AVAILABLE, status };
}

/** Inicializa el cliente HC (no bloquea por estados intermedios) */
export async function hcInitialize(): Promise<boolean> {
  if (_initialized) return true;
  if (Platform.OS !== 'android') return false;
  try {
    _initialized = await initialize();
  } catch {
    _initialized = false;
  }
  return _initialized;
}

/** Pide permisos (Steps + HeartRate). No bloquea si el proveedor requiere update/enable. */
export async function hcRequestPermissions(): Promise<{
  granted: Permission[];
  hasAll: boolean;
  status?: number;
  label?: string;
}> {
  await hcInitialize(); // intenta inicializar; si falla no detiene el flujo

  // Intento de solicitud de permisos (puede fallar si proveedor deshabilitado)
  try {
    await requestPermission(REQUIRED_PERMISSIONS);
  } catch {
    // noop: seguimos para consultar qué hay concedido y devolver estado
  }

  let granted: Permission[] = [];
  try {
    granted = await getGrantedPermissions();
  } catch {
    granted = [];
  }

  const hasAll = REQUIRED_PERMISSIONS.every((need) =>
    granted.some(
      (g) => g.recordType === need.recordType && g.accessType === need.accessType,
    ),
  );

  const s = await getSdkStatus();
  return { granted, hasAll, status: s, label: statusLabel[s] ?? String(s) };
}

/** Abre ajustes de Health Connect (y fallback a gestión de datos) */
export async function hcOpenSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await openHealthConnectSettings();
  } catch {
    try {
      await openHealthConnectDataManagement();
    } catch {
      // silencioso
    }
  }
}

/** Pasos del día (suma todos los registros desde las 00:00 locales) */
export async function readTodaySteps(): Promise<{ steps: number; from: string; to: string }> {
  const ok = await hcInitialize();
  if (!ok) return { steps: 0, from: '', to: '' };

  const now = new Date();
  const fromDate = startOfLocalDay(now);
  const options: ReadRecordsOptions<'Steps'> = {
    timeRangeFilter: {
      operator: 'between',
      startTime: toIso(fromDate),
      endTime: toIso(now),
    },
  };

  const { records } = await readRecords('Steps', options);
  const steps = (records as any[]).reduce((sum, r) => sum + (r.count ?? 0), 0);
  return { steps, from: toIso(fromDate), to: toIso(now) };
}

/** Última muestra de FC en una ventana reciente (por defecto 60 min) */
export async function readLatestHeartRate(
  windowMinutes: number = DEFAULT_HR_WINDOW_MIN,
): Promise<{ bpm: number | null; at: string | null }> {
  const ok = await hcInitialize();
  if (!ok) return { bpm: null, at: null };

  const end = new Date();
  const start = new Date(end.getTime() - windowMinutes * 60_000);

  const { records } = await readRecords('HeartRate', {
    timeRangeFilter: {
      operator: 'between',
      startTime: toIso(start),
      endTime: toIso(end),
    },
  });

  type Sample = { beatsPerMinute: number; time: string };
  const samples: Sample[] = [];
  for (const rec of records as any[]) {
    if (Array.isArray(rec.samples)) {
      for (const s of rec.samples) {
        if (typeof s?.beatsPerMinute === 'number' && typeof s?.time === 'string') {
          samples.push({ beatsPerMinute: s.beatsPerMinute, time: s.time });
        }
      }
    }
  }
  if (samples.length === 0) return { bpm: null, at: null };

  samples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const latest = samples[0];
  return { bpm: latest.beatsPerMinute, at: latest.time };
}

/** Polling simple para UI; devuelve función para detener */
export function startHealthPolling(
  onTick: (snapshot: { steps: number; hrBpm: number | null; hrAt: string | null }) => void,
  everyMs: number = DEFAULT_POLL_MS,
): () => void {
  let stopped = false;

  const tick = async () => {
    const { hasAll } = await hcRequestPermissions();
    if (!hasAll) {
      if (!stopped) setTimeout(tick, everyMs);
      return;
    }

    const [stepsRes, hrRes] = await Promise.all([readTodaySteps(), readLatestHeartRate()]);

    onTick({ steps: stepsRes.steps, hrBpm: hrRes.bpm, hrAt: hrRes.at });

    if (!stopped) setTimeout(tick, everyMs);
  };

  tick();
  return () => {
    stopped = true;
  };
}

/** Onboarding rápido: intenta pedir permisos; si faltan, abre ajustes HC. */
export async function quickSetup(): Promise<boolean> {
  const { hasAll, status } = await hcRequestPermissions();
  if (hasAll) return true;

  // En cualquier estado no-OK, llevamos al usuario a ajustes de HC.
  if (
    status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED ||
    status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ||
    status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED ||
    status === SdkAvailabilityStatus.SDK_UNAVAILABLE
  ) {
    await hcOpenSettings();
  } else {
    await hcOpenSettings();
  }
  return false;
}
