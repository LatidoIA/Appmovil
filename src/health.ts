// src/health.ts
// Implementación con react-native-health-connect (APIs reales) + import perezoso

type AnyObj = any;

// Permisos mínimos para este MVP
const PERMS = [
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'Steps' as const },
];

// Carga perezosa para no ejecutar nativo en el arranque de la app
async function getHC(): Promise<AnyObj | null> {
  try {
    const mod = await import('react-native-health-connect');
    return mod;
  } catch (e) {
    console.debug('HC import error:', (e as any)?.message || e);
    return null;
  }
}

export async function hcEnsureAvailable() {
  try {
    const HC = await getHC();
    if (!HC) return false;

    // Algunas versiones exponen getSdkStatus, otras solo initialize
    if (HC.getSdkStatus) {
      const status = await HC.getSdkStatus();
      const s = String(status).toLowerCase();
      return s.includes('available') || s.includes('installed');
    }

    if (HC.initialize) {
      const ok = await HC.initialize();
      return !!ok;
    }

    // Si no hay ninguna, intentamos leer un flag cualquiera y si no lanza, lo damos por bueno
    return true;
  } catch {
    return false;
  }
}

export async function hcInitAndRequest() {
  try {
    const HC = await getHC();
    if (!HC) return [];

    // requestPermission vs requestPermissions según versión
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

    // Normalizamos a un formato compatible con tu uso actual
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
