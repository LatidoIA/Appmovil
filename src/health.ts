// src/health.ts
// Health Connect via react-native-health-connect (SDK status fix)

type AnyObj = any;

const PERMS = [
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'Steps' as const },
];

// SDK status constants from AndroidX Health Connect
const SDK_UNAVAILABLE = 0;
const SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 1;
const SDK_AVAILABLE = 2;

async function getHC(): Promise<AnyObj | null> {
  try {
    const mod = await import('react-native-health-connect');
    return mod;
  } catch (e) {
    console.debug('HC import error:', (e as any)?.message || e);
    return null;
  }
}

/** Devuelve true si el SDK está disponible o requiere update del proveedor. */
export async function hcEnsureAvailable(): Promise<boolean> {
  try {
    const HC = await getHC();
    if (!HC) return false;

    if (HC.getSdkStatus) {
      const status = await HC.getSdkStatus();
      if (typeof status === 'number') {
        // Lo consideramos “disponible” si está AVAILABLE (2) o requiere update (1)
        // En (1) igual podremos abrir el intent de permisos, y el sistema pedirá actualizar.
        return (
          status === SDK_AVAILABLE ||
          status === SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
        );
      }
      const s = String(status).toLowerCase();
      return s.includes('available') || s.includes('update'); // por compatibilidad
    }

    // Fallback: si no expone getSdkStatus, intentamos initialize()
    if (HC.initialize) {
      await HC.initialize();
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/** Pide permisos en el diálogo nativo de Health Connect. */
export async function hcInitAndRequest() {
  try {
    const HC = await getHC();
    if (!HC) return [];

    // Algunas versiones requieren initialize() antes de pedir permisos
    if (HC.initialize) {
      try {
        await HC.initialize();
      } catch {}
    }

    if (HC.requestPermission) {
      return await HC.requestPermission(PERMS);
    }
    if (HC.requestPermissions) {
      return await HC.requestPermissions(PERMS);
    }
    return [];
  } catch {
    return [];
  }
}

export async function hcReadLatestHeartRate() {
  try {
    const HC = await getHC();
    if (!HC?.readRecords) return null;

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
    const HC = await getHC();
    if (!HC?.readRecords) return { total: 0, count: 0 };

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
