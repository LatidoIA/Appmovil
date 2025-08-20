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

// ---- Labels legibles de estado
const STATUS_LABEL = {
  [SdkAvailabilityStatus.SDK_AVAILABLE]: 'SDK_AVAILABLE',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED]:
    'PROVIDER_UPDATE_REQUIRED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_DISABLED]:
    'PROVIDER_DISABLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_NOT_INSTALLED]:
    'PROVIDER_NOT_INSTALLED',
  [SdkAvailabilityStatus.SDK_UNAVAILABLE]: 'SDK_UNAVAILABLE',
};

// ---- Permisos que necesitamos para leer
const READ_PERMS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
];

export async function hcGetStatusDebug() {
  if (Platform.OS !== 'android') return { status: -1, label: 'NOT_ANDROID' };
  try {
    // getSdkStatus no requiere init, pero garantizamos init para el resto del flujo
    await ensureInitialized();
    const s = await getSdkStatus();
    return { status: s, label: STATUS_LABEL[s] ?? String(s) };
  } catch {
    return { status: -2, label: 'STATUS_ERROR' };
  }
}

// Abre ajustes de HC con varios fallbacks (incluye Play Store)
export async function hcOpenSettings() {
  if (Platform.OS !== 'android') return false;

  // 1) Ajustes nativos de Health Connect
  try {
    await openHealthConnectSettings();
    return true;
  } catch {}

  // 2) Pantalla de gestión de datos
  try {
    await openHealthConnectDataManagement();
    return true;
  } catch {}

  // 3) Play Store (algunas ROMs sólo permiten abrir desde la tienda)
  const pkg = 'com.google.android.apps.healthdata';
  try {
    await Linking.openURL(`market://details?id=${pkg}`);
    return true;
  } catch {}
  try {
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`);
    return true;
  } catch {}

  return false;
}

// Comprueba si YA tenemos ambos permisos de lectura
export async function isPermissionGranted() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInitialized();
    const granted = await getGrantedPermissions();
    return READ_PERMS.every((p) =>
      granted.some(
        (g) => g.recordType === p.recordType && g.accessType === 'read'
      )
    );
  } catch {
    return false;
  }
}

// Pide permisos (wizard) y devuelve true/false
export async function ensurePermissions() {
  if (Platform.OS !== 'android') return false;
  try {
    await ensureInitialized();
    const sdk = await getSdkStatus();
    if (sdk !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;

    // Lanza el wizard (idempotente si ya estaban concedidos)
    await requestPermission(READ_PERMS);

    // Revisa lo concedido
    return await isPermissionGranted();
  } catch (e) {
    console.debug('[HC] ensurePermissions error:', e?.message || e);
    return false;
  }
}

// Atajo usado por el modal global (si lo necesitas)
export async function quickSetup() {
  const ok = await ensurePermissions();
  return !!ok;
}

// ---- Lectura de PASOS (suma del día en curso)
export async function readTodaySteps() {
  if (Platform.OS !== 'android') return { steps: 0 };

  try {
    await ensureInitialized();
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const res = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: now.toISOString(),
      },
    });

    const total =
      (res?.records || []).reduce(
        (sum, r) => sum + (Number(r.count) || Number(r.steps) || 0),
        0
      ) || 0;

    return { steps: total };
  } catch (e) {
    console.debug('[HC] readTodaySteps error:', e?.message || e);
    return { steps: 0 };
  }
}

// ---- Lectura de ÚLTIMO PULSO (busca el sample más reciente)
export async function readLatestHeartRate() {
  if (Platform.OS !== 'android') return { bpm: null, at: null };

  try {
    await ensureInitialized();
    const end = new Date();
    const start = new Date(end);
    // Ventana amplia de búsqueda (48h por si el proveedor no escribe continuo)
    start.setDate(start.getDate() - 2);

    const res = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    let latest = null;

    for (const rec of res?.records || []) {
      // Algunas integraciones entregan samples
      if (rec?.samples?.length) {
        for (const s of rec.samples) {
          const t =
            s.time ? new Date(s.time) : (rec.endTime ? new Date(rec.endTime) : null);
          const bpm = s.beatsPerMinute ?? s.bpm ?? null;
          if (bpm != null && t && (!latest || t > latest.at)) {
            latest = { bpm: Number(bpm), at: t };
          }
        }
      } else {
        // Otras pueden tener beatsPerMinute al nivel del record
        const t = rec.endTime ? new Date(rec.endTime) : (rec.startTime ? new Date(rec.startTime) : null);
        const bpm = rec.beatsPerMinute ?? rec.bpm ?? null;
        if (bpm != null && t && (!latest || t > latest.at)) {
          latest = { bpm: Number(bpm), at: t };
        }
      }
    }

    return latest || { bpm: null, at: null };
  } catch (e) {
    console.debug('[HC] readLatestHeartRate error:', e?.message || e);
    return { bpm: null, at: null };
  }
}
