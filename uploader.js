// uploader.js
// Subidor opcional de métricas del paciente al backend (solo si cambian).
// Seguro: si el endpoint no existe o falla, NO rompe la app (silencioso).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import {
  readLatestHeartRate,
  readTodaySteps,
  readSleepLast24h,
  readLatestSpO2,
  readLatestBloodPressure,
  readLatestStress,
} from './health';

const BACKEND_URL = 'https://orca-app-njfej.ondigitalocean.app';
// Ajusta el endpoint si corresponde:
const ENDPOINT = `${BACKEND_URL}/metrics/patient/self`; // POST

const PROFILE_KEY = '@latido_profile';
const LAST_HASH_KEY = '@latido_uploader_last_hash';

let timer = null;
let appStateSub = null;

function hash(obj) {
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

async function gatherPayload() {
  const profileRaw = await AsyncStorage.getItem(PROFILE_KEY).catch(() => null);
  const profile = profileRaw ? JSON.parse(profileRaw) : {};
  const [hr, st, sl, sp, bp, stress] = await Promise.all([
    readLatestHeartRate(),
    readTodaySteps(),
    readSleepLast24h(),
    readLatestSpO2(),
    readLatestBloodPressure(),
    readLatestStress(),
  ]);
  return {
    ts: new Date().toISOString(),
    patient: { id: profile?.id ?? null, email: profile?.email ?? null, name: profile?.name ?? null },
    metrics: {
      heart_rate: hr?.bpm ?? null,
      steps: st?.steps ?? null,
      sleep_hours: sl?.hours ?? null,
      spo2: sp?.spo2 ?? null,
      blood_pressure: (bp?.sys != null && bp?.dia != null) ? { sys: bp.sys, dia: bp.dia } : null,
      stress_value: stress?.value ?? null,
      stress_label: stress?.label ?? null,
    },
  };
}

async function postIfChanged() {
  try {
    const payload = await gatherPayload();
    const curHash = hash(payload);
    const prevHash = await AsyncStorage.getItem(LAST_HASH_KEY).catch(() => null);
    if (prevHash === curHash) return; // sin cambios

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // no asumimos contrato; si falla, seguimos silencioso
    await AsyncStorage.setItem(LAST_HASH_KEY, curHash).catch(() => {});
    await res.text().catch(() => {}); // drena
  } catch {
    // silencio
  }
}

export function start(intervalMs = 60000) {
  stop();
  // solo cuando la app está activa
  const run = () => { if (!timer) timer = setInterval(() => { postIfChanged().catch(() => {}); }, intervalMs); };
  const halt = () => { if (timer) { clearInterval(timer); timer = null; } };

  appStateSub = AppState.addEventListener('change', (s) => {
    if (s === 'active') run(); else halt();
  });

  run(); // arranca si ya está en active
}

export function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  if (appStateSub) { appStateSub.remove(); appStateSub = null; }
}
