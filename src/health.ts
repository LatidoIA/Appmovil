// src/health.ts
// LATIDO — módulo Health Connect (Android)
// Pide permisos, verifica disponibilidad y lee pasos + FC (pulso) con polling opcional.
// Stack: Expo SDK 53 / RN 0.79.5 / expo-health-connect (plugin) + react-native-health-connect (API)

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

// -------- Config básica --------

/** Permisos mínimos para LATIDO (lectura de pasos y frecuencia cardíaca) */
const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];

/** Ventana de lectura para HR (en minutos) */
const DEFAULT_HR_WINDOW_MIN = 60;

/** Intervalo de polling por defecto (ms) */
const DEFAULT_POLL_MS = 30_000;

let _initialized = false;

// -------- Utilidades de tiempo --------

const toIso = (d: Date) => d.toISOString();

const startOfLocalDay = (d = new Date()) => {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
};

// -------- API pública --------

/**
 * Comprueba disponibilidad de Health Connect en el dispositivo.
 * Devuelve el status numérico de HC y si está disponible (SDK_AVAILABLE).
 */
export async function hcEnsureAvailable(): Promise<{
  available: boolean;
  status: number;
}> {
  if (Platform.OS !== 'android') return { available: false, status: -1 };
  const status = await getSdkStatus();
  return {
    available: status === SdkAvailabilityStatus.SDK_AVAILABLE,
    status,
  };
}

/**
 * Inicializa el cliente de Health Connect (idempotente).
 */
export async function hcInitialize(): Promise<boolean> {
  if (_initialized) return true;
  if (Platform.OS !== 'android') return false;

  const { available } = await hcEnsureAvailable();
  if (!available) return false;

  _initialized = await initialize();
  return _initialized;
}

/**
 * Solicita permisos mínimos necesarios (Steps + HeartRate) y devuelve
 * el set final concedido junto con un flag "hasAll".
 */
export async function hcRequestPermissions(): Promise<{
  granted: Permission[];
  hasAll: boolean;
}> {
  const ok = await hcInitialize();
  if (!ok) return { granted: [], hasAll: false };

  await requestPermission(REQUIRED_PERMISSIONS);
  const granted = await getGrantedPermissions();
  const hasAll = REQUIRED_PERMISSIONS.every((need) =>
    granted.some(
      (g) => g.recordType === need.recordType && g.accessType === need.accessType,
    ),
  );
  return { granted, hasAll };
}

/**
 * Abre la pantalla de ajustes de Health Connect (útil si el usuario
 * necesita revisar permisos o fuentes de datos).
 */
export async function hcOpenSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await openHealthConnectSettings();
  } catch {
    // Fallback a la gestión de datos si la pantalla principal falla
    try {
      await openHealthConnectDataManagement();
    } catch {
      // Silencioso
    }
  }
}

/**
 * Lee el total de pasos "hoy" (zona horaria local), sumando todos los registros del día
 * hasta ahora. Se usa readRecords para evitar supuestos de campos de agregación.
 */
export async function readTodaySteps(): Promise<{
  steps: number;
  from: string;
  to: string;
}> {
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

  // Cada registro de Steps debe incluir "count" (número de pasos en el tramo)
  // Sumamos todos los "count" en la ventana solicitada.
  const steps = records.reduce((sum, r: any) => sum + (r.count ?? 0), 0);

  return { steps, from: toIso(fromDate), to: toIso(now) };
}

/**
 * Devuelve la última muestra de frecuencia cardíaca (bpm) dentro de una
 * ventana reciente (por defecto 60min). Aplana las series y toma la más reciente.
 */
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

  // HeartRate es una serie: cada record trae samples[{beatsPerMinute, time}]
  // Aplanamos todas las muestras y elegimos la más reciente.
  type Sample = { beatsPerMinute: number; time: string };
  const allSamples: Sample[] = [];
  for (const rec of records as any[]) {
    if (Array.isArray(rec.samples)) {
      for (const s of rec.samples) {
        if (
          typeof s?.beatsPerMinute === 'number' &&
          typeof s?.time === 'string'
        ) {
          allSamples.push({ beatsPerMinute: s.beatsPerMinute, time: s.time });
        }
      }
    }
  }

  if (allSamples.length === 0) return { bpm: null, at: null };

  allSamples.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  const latest = allSamples[0];
  return { bpm: latest.beatsPerMinute, at: latest.time };
}

/**
 * Polling sencillo para UI: obtiene pasos de hoy + último pulso cada N ms
 * y llama a tu callback. Devuelve función para parar el polling.
 */
export function startHealthPolling(
  onTick: (snapshot: {
    steps: number;
    hrBpm: number | null;
    hrAt: string | null;
  }) => void,
  everyMs: number = DEFAULT_POLL_MS,
): () => void {
  let stopped = false;

  const tick = async () => {
    const { hasAll } = await hcRequestPermissions();
    if (!hasAll) {
      // Si faltan permisos, no spameamos: esperamos al siguiente tick
      if (!stopped) setTimeout(tick, everyMs);
      return;
    }

    const [stepsRes, hrRes] = await Promise.all([
      readTodaySteps(),
      readLatestHeartRate(),
    ]);

    onTick({
      steps: stepsRes.steps,
      hrBpm: hrRes.bpm,
      hrAt: hrRes.at,
    });

    if (!stopped) setTimeout(tick, everyMs);
  };

  // Arranca sin bloquear
  tick();

  return () => {
    stopped = true;
  };
}

// -------- Helpers para UI (opcional) --------

/**
 * Flujo de onboarding "rápido":
 * 1) Comprueba disponibilidad
 * 2) Solicita permisos
 * 3) Abre ajustes de HC si faltan permisos
 * Devuelve true si todo quedó listo para leer datos.
 */
export async function quickSetup(): Promise<boolean> {
  const { available } = await hcEnsureAvailable();
  if (!available) return false;

  const { hasAll } = await hcRequestPermissions();
  if (hasAll) return true;

  // Si aún faltan scopes (p. ej. fueron denegados), abrimos ajustes para que el usuario lo habilite.
  await hcOpenSettings();
  // El caller puede reintentar hcRequestPermissions() tras volver a la app.
  return false;
}
