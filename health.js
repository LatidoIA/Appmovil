// health.js (colócalo en la raíz del repo)
import { Platform, Linking } from "react-native";
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  openHealthConnectSettings,
} from "react-native-health-connect";

// Pide SOLO lo que declaraste en app config/AndroidManifest.
// Ya pusiste READ_STEPS y READ_HEART_RATE, así que nos ceñimos a eso.
const REQUIRED_PERMISSIONS = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "HeartRate" },
];

// 1) Garantiza que Health Connect esté inicializado y solicita permisos si faltan.
//    Importante: la PRIMERA vez que llames a esto, debe disparar el diálogo del sistema.
//    Si el usuario acepta, la app aparecerá en la lista de “Apps con acceso” de Health Connect.
export async function ensureHealthConnect() {
  if (Platform.OS !== "android") {
    return { ok: false, reason: "not-android" };
  }

  // Inicializa el cliente (no muestra UI; prepara el bridge nativo)
  await initialize();

  // ¿Qué permisos ya están otorgados?
  const granted = await getGrantedPermissions();
  const missing = REQUIRED_PERMISSIONS.filter(
    (p) =>
      !granted.find(
        (g) => g.recordType === p.recordType && g.accessType === p.accessType
      )
  );

  // Si faltan, dispara la UI nativa de permisos de Health Connect
  if (missing.length) {
    await requestPermission(missing);
  }

  return { ok: true };
}

// 2) Abre la pantalla de permisos de Health Connect de tu app.
//    Útil si el usuario negó permisos y quiere reconfigurarlos manualmente.
export async function goToHealthConnectSettings() {
  try {
    await openHealthConnectSettings();
    return true;
  } catch {
    // Fallback: abre la ficha de Health Connect en Play Store (por si no está instalado)
    await Linking.openURL(
      "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"
    );
    return false;
  }
}

// 3) Lee muestras simples de las últimas 24h (pasos y frecuencia cardiaca).
//    Devuelve arrays crudos tal como los entrega la librería para que tu UI decida cómo mostrarlos.
export async function readLatestSamples() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  // Steps: devuelve segmentos por intervalo
  const stepsRes = await readRecords("Steps", {
    timeRangeFilter: {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });

  // HeartRate: cada record suele incluir samples [{ beatsPerMinute, time }]
  const hrRes = await readRecords("HeartRate", {
    timeRangeFilter: {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
    ascending: false,
  });

  return {
    steps: stepsRes?.records ?? [],
    heartRate: hrRes?.records ?? [],
  };
}
