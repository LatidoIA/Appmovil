// SaludScreen.js
// Ahora muestra tarjeta de permisos: redirige a Health Connect y revalida estado.
// Mantiene auto-refresh 15s, panel debug, uploader y resto de UI.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LatidoPower } from './LatidoPower';
import CustomText from './CustomText';
import CuidadorScreen from './CuidadorScreen';
import theme from './theme';

import {
  quickSetup,
  readTodaySteps,
  readLatestHeartRate,
  readLatestSpO2,
  readSleepLast24h,
  readLatestBloodPressure,
  readLatestStress,
  hcGetStatusDebug,
  getGrantedList,
  hcOpenSettings,
  hasAllPermissions,
} from './health';

import * as uploader from './uploader';

const PROFILE_KEY = '@latido_profile';
const MEDS_KEY = '@latido_meds';
const REFRESH_MS = 15000;

// ---------- Helpers Vital ----------
function computeVital(metrics = {}, mood) {
  const vals = [];
  if (metrics.heart_rate != null) vals.push(Math.min((metrics.heart_rate / 180) * 100, 100));
  if (metrics.steps      != null) vals.push(Math.min((metrics.steps / 10000) * 100, 100));
  if (metrics.sleep      != null) vals.push(Math.min((metrics.sleep / 8) * 100, 100));
  if (metrics.spo2       != null) vals.push(metrics.spo2);
  if (metrics.stress     != null) vals.push(Math.max(0, 100 - metrics.stress));
  if (mood === '😊') vals.push(100);
  else if (mood === '😐') vals.push(50);
  else if (mood === '😔') vals.push(0);

  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const color = avg > 75 ? theme.colors.accent : avg > 50 ? '#FDB827' : theme.colors.error;
  return { score: avg, color };
}

// ---------- Helpers Farmacia ----------
function defaultTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function normalizeToHHMM(input) {
  const digits = String(input || '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return null;
  let hh = '00', mm = '00';
  if (digits.length === 1) { hh = `0${digits}`; mm = '00'; }
  else if (digits.length === 2) { hh = digits; mm = '00'; }
  else if (digits.length === 3) { hh = `0${digits[0]}`; mm = digits.slice(1); }
  else { hh = digits.slice(0, 2); mm = digits.slice(2, 4); }
  const h = Math.max(0, Math.min(23, parseInt(hh, 10)));
  const m = Math.max(0, Math.min(59, parseInt(mm, 10)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function parseHHMMFlexible(s) {
  const norm = s?.includes(':') ? s : normalizeToHHMM(s);
  if (!norm) return null;
  const [hh, mm] = norm.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return { hh, mm };
}
function nextDateForDailyTime(hh, mm) {
  const now = new Date();
  const todayAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  if (now.getTime() <= todayAt.getTime()) return todayAt;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hh, mm, 0, 0);
}
function secondsUntilNextFromStart(startHHMM, intervalHours) {
  const now = new Date();
  const { hh, mm } = startHHMM || { hh: now.getHours(), mm: now.getMinutes() };
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  const stepMs = Math.max(1, parseInt(intervalHours, 10)) * 3600 * 1000;
  if (now.getTime() <= startToday.getTime()) {
    return Math.ceil((startToday.getTime() - now.getTime()) / 1000);
  }
  const passed = now.getTime() - startToday.getTime();
  const k = Math.ceil(passed / stepMs);
  const next = startToday.getTime() + k * stepMs;
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}
function nextOccurrenceForItem(item) {
  const sch = item?.schedule || {};
  if (!sch.mode || sch.mode === 'hora') {
    const parsed = parseHHMMFlexible(sch.time || item?.time || defaultTime());
    if (!parsed) return null;
    return nextDateForDailyTime(parsed.hh, parsed.mm);
  }
  const nHours = Math.max(1, parseInt(sch.everyHours || '8', 10));
  const startParsed = sch.startTime ? parseHHMMFlexible(sch.startTime) : null;
  const sec = secondsUntilNextFromStart(startParsed, nHours);
  return new Date(Date.now() + sec * 1000);
}
function formatEta(ms) {
  if (ms <= 0) return 'ahora';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `en ${h}h ${m}m`;
  if (m > 0) return `en ${m}m ${s}s`;
  return `en ${s}s`;
}

export default function SaludScreen() {
  const navigation = useNavigation();
  const [patient, setPatient] = useState({ id: null });
  const [metrics, setMetrics] = useState({});
  const [mood, setMood] = useState(null);
  const [power, setPower] = useState({ score: 0, color: theme.colors.primary });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Gating permisos/SDK
  const [available, setAvailable] = useState(false);
  const [granted, setGranted] = useState(false);
  const [permLoading, setPermLoading] = useState(false);
  const [statusText, setStatusText] = useState('…');

  // Próximo ítem de Farmacia
  const [nextInfo, setNextInfo] = useState(null);

  // Cargar perfil
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then(raw => raw && setPatient(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  // Cargar meds y calcular “próximo”
  const recomputeNext = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(MEDS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.length) { setNextInfo(null); return; }
      const ensureSchedule = (x) => x.schedule ? x : { ...x, schedule: { mode: 'hora', time: x.time || defaultTime(), everyHours: null, startTime: null } };
      const all = arr.map(ensureSchedule);
      const active = all.filter(x => !!x.reminderOn);
      const candidates = active.length ? active : all;
      const withNext = candidates
        .map(x => ({ x, nextAt: nextOccurrenceForItem(x) }))
        .filter(y => !!y.nextAt)
        .sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime());
      if (!withNext.length) { setNextInfo(null); return; }
      const { x: item, nextAt } = withNext[0];
      setNextInfo({ item, nextAt, isPaused: !item.reminderOn });
    } catch {
      setNextInfo(null);
    }
  }, []);

  useEffect(() => {
    recomputeNext();
    const unsub = navigation.addListener('focus', recomputeNext);
    return unsub;
  }, [navigation, recomputeNext]);

  // Permisos Android básicos
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BODY_SENSORS).catch(() => {});
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION).catch(() => {});
    }
  }, []);

  // Chequeo de estado/permisos
  const checkPerms = useCallback(async () => {
    try {
      const st = await hcGetStatusDebug();
      setStatusText(`${st.label} (${st.status})`);
      const okAvail = st?.label === 'SDK_AVAILABLE';
      setAvailable(okAvail);
      const okPerms = okAvail ? await hasAllPermissions() : false;
      setGranted(!!okPerms);
      return { okAvail, okPerms };
    } catch {
      setAvailable(false);
      setGranted(false);
      setStatusText('STATUS_ERROR');
      return { okAvail: false, okPerms: false };
    }
  }, []);

  // Setup HC (una vez al montar)
  useEffect(() => {
    (async () => {
      await checkPerms();
    })();
  }, [checkPerms]);

  // Acción: solicitar permisos / abrir HC
  const handleRequestPerms = useCallback(async () => {
    setPermLoading(true);
    try {
      const ok = await quickSetup(); // si no hay HC abre ajustes; si hay, lanza dialog de permisos
      // revalida
      const { okPerms } = await checkPerms();
      if (!ok || !okPerms) {
        // Si el usuario canceló o siguen faltando permisos, abrimos Health Connect manualmente
        await hcOpenSettings();
      }
    } catch {
      // último intento: abrir ajustes
      try { await hcOpenSettings(); } catch {}
    } finally {
      setPermLoading(false);
    }
  }, [checkPerms]);

  const handleOpenHC = useCallback(async () => {
    setPermLoading(true);
    try { await hcOpenSettings(); } catch {}
    finally { setPermLoading(false); }
  }, []);

  const handleRecheck = useCallback(async () => {
    setPermLoading(true);
    try { await checkPerms(); } finally { setPermLoading(false); }
  }, [checkPerms]);

  // --------- Métricas ----------
  const fetchMetrics = useCallback(async () => {
    // si no hay permisos, no intentes leer (ahorra batería/errores)
    if (!available || !granted) return;

    try {
      const [hr, st, sp, sl, bp, stress] = await Promise.all([
        readLatestHeartRate(),
        readTodaySteps(),
        readLatestSpO2(),
        readSleepLast24h(),
        readLatestBloodPressure(),
        readLatestStress(),
      ]);

      const newMetrics = {
        heart_rate: hr?.bpm ?? null,
        steps: st?.steps ?? null,
        sleep: sl?.hours ?? null,
        spo2: sp?.spo2 ?? null,
        bp_sys: bp?.sys ?? null,
        bp_dia: bp?.dia ?? null,
        stress: stress?.value ?? null,
        stress_label: stress?.label ?? null,
      };

      setMetrics(newMetrics);
      setLastUpdated(new Date());

      const { score, color } = computeVital(newMetrics, mood);
      setPower({ score, color });

      // Panel debug
      setDebugInfo({
        sdk: await hcGetStatusDebug(),
        granted: await getGrantedList(),
        sources: {
          steps: st?.origins ?? [],
          hr: hr?.origin ?? null,
          spo2: sp?.origin ?? null,
          sleep: sl?.origins ?? [],
          bp: bp?.origin ?? null,
        },
        times: {
          steps: st?.asOf ?? null,
          hr: hr?.at ?? null,
          spo2: sp?.at ?? null,
          sleepEnd: sl?.rangeEnd ?? null,
          bp: bp?.at ?? null,
        },
        hasAll: await hasAllPermissions(),
      });
    } catch {}
  }, [mood, available, granted]);

  // Auto-refresh SOLO en foco + uploader
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        await checkPerms();
        if (!cancelled) await fetchMetrics();
      })();

      const id = setInterval(() => { checkPerms().then(fetchMetrics).catch(() => {}); }, REFRESH_MS);
      uploader.start(60000); // sube cada 60s si hay cambios

      return () => {
        cancelled = true;
        clearInterval(id);
        uploader.stop();
      };
    }, [checkPerms, fetchMetrics])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkPerms();
      await fetchMetrics();
    } finally {
      setRefreshing(false);
    }
  }, [checkPerms, fetchMetrics]);

  const submitMood = choice => {
    setMood(choice);
    Alert.alert('¡Gracias!', `Estado de ánimo: ${choice}`);
    const { score, color } = computeVital(metrics, choice);
    setPower({ score, color });
  };

  const metricsList = [
    ['Frecuencia cardíaca', metrics.heart_rate != null ? `${metrics.heart_rate} bpm` : '—'],
    ['Pasos',               metrics.steps != null ? metrics.steps : '—'],
    ['Sueño (24 h)',        metrics.sleep != null ? `${metrics.sleep} h` : '—'],
    ['SpO₂',                metrics.spo2  != null ? `${metrics.spo2} %` : '—'],
    ['Presión arterial',    metrics.bp_sys != null && metrics.bp_dia != null ? `${metrics.bp_sys}/${metrics.bp_dia} mmHg` : '—'],
    ['Estrés',              metrics.stress_label ?? (metrics.stress != null ? `${metrics.stress}` : '—')],
  ];

  // --------- UI: tarjeta de permisos/SDK ----------
  const PermsCard = () => {
    if (available && granted) return null;

    return (
      <View style={styles.permsCard}>
        <CustomText style={styles.permsTitle}>Health Connect</CustomText>
        {!available && (
          <>
            <CustomText style={styles.permsText}>
              Health Connect no está disponible (estado: {statusText}).
            </CustomText>
            <CustomText style={styles.permsHint}>
              Instala/activa Health Connect y vuelve a la app.
            </CustomText>
          </>
        )}
        {available && !granted && (
          <CustomText style={styles.permsText}>
            Otorga permisos de lectura de Pasos, FC, SpO₂, Sueño y PA.
          </CustomText>
        )}

        <View style={{ height: 8 }} />
        {permLoading ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator />
            <CustomText style={{ marginTop: 8 }}>Abriendo Health Connect…</CustomText>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.permsBtnPrimary} onPress={handleRequestPerms} activeOpacity={0.85}>
              <CustomText style={styles.permsBtnPrimaryText}>Solicitar permisos ahora</CustomText>
            </TouchableOpacity>

            <View style={{ height: 8 }} />

            <TouchableOpacity style={styles.permsBtnOutline} onPress={handleOpenHC} activeOpacity={0.85}>
              <CustomText style={styles.permsBtnOutlineText}>Abrir Health Connect</CustomText>
            </TouchableOpacity>

            <View style={{ height: 8 }} />

            <TouchableOpacity style={styles.permsBtnOutline} onPress={handleRecheck} activeOpacity={0.85}>
              <CustomText style={styles.permsBtnOutlineText}>Revisar de nuevo</CustomText>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  // --------- UI Próximo medicamento/suplemento ----------
  const renderNextPharma = () => {
    const goFarmacia = () => navigation.navigate('Cuidado', { initialTab: 'Farmacia' });
    return (
      <TouchableOpacity style={styles.nextMedContainer} onPress={goFarmacia} activeOpacity={0.8}>
        <Ionicons name="medkit-outline" size={24} color={theme.colors.textPrimary} />
        <View style={styles.nextMedInfo}>
          <CustomText style={styles.nextMedLabel}>Próximo medicamento/suplemento</CustomText>

          {!nextInfo ? (
            <CustomText style={styles.emptyText}>Sin registro</CustomText>
          ) : (
            <>
              <CustomText style={styles.nextMedText}>
                {nextInfo.item.name}{nextInfo.item.dose ? ` — ${nextInfo.item.dose}` : ''}
              </CustomText>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                <CustomText style={styles.nextMeta}>
                  {nextInfo.item.schedule?.mode === 'hora'
                    ? `Diario a las ${nextInfo.item.schedule?.time || defaultTime()}`
                    : `Cada ${nextInfo.item.schedule?.everyHours} h`}
                </CustomText>
                {nextInfo.isPaused && (
                  <View style={styles.pausedChip}>
                    <CustomText style={styles.pausedChipText}>Pausado</CustomText>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // --------- Panel debug oculto (long-press en “Actualizado”) ----------
  const DebugPanel = () => {
    if (!showDebug || !debugInfo) return null;
    const row = (k, v) => (
      <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <CustomText style={{ color: theme.colors.textSecondary }}>{k}</CustomText>
        <CustomText style={{ color: theme.colors.textPrimary, marginLeft: 8 }}>{v}</CustomText>
      </View>
    );
    const srcs = debugInfo.sources || {};
    const tms = debugInfo.times || {};
    return (
      <View style={styles.debugBox}>
        <CustomText style={styles.debugTitle}>Debug Health Connect</CustomText>
        {row('SDK', `${debugInfo.sdk?.label} (${debugInfo.sdk?.status})`)}
        {row('Perms ok', String(!!debugInfo.hasAll))}
        {row('Granted', (debugInfo.granted || []).join(', ') || '—')}
        {row('Origen HR', srcs.hr || '—')}
        {row('Origen SpO2', srcs.spo2 || '—')}
        {row('Origen Steps', (srcs.steps || []).join(', ') || '—')}
        {row('Origen Sleep', (srcs.sleep || []).join(', ') || '—')}
        {row('Origen BP', srcs.bp || '—')}
        {row('t HR', tms.hr || '—')}
        {row('t SpO2', tms.spo2 || '—')}
        {row('t Steps', tms.steps || '—')}
        {row('t SleepEnd', tms.sleepEnd || '—')}
        {row('t BP', tms.bp || '—')}
        <TouchableOpacity onPress={() => hcOpenSettings().catch(() => {})} style={styles.debugBtn}>
          <CustomText style={{ color: theme.colors.background, textAlign: 'center' }}>Abrir Health Connect</CustomText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: theme.colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LatidoPower score={power.score} color={power.color} />

      {/* Tarjeta de permisos / HC */}
      <PermsCard />

      {/* Si no hay permisos, no mostramos el resto de contenido para evitar confusión */}
      {available && granted && (
        <>
          {!mood && (
            <View style={styles.moodContainer}>
              <CustomText style={styles.moodTitle}>¿Cómo te sientes hoy?</CustomText>
              <View style={styles.moodOptions}>
                {['😊','😐','😔'].map(e => (
                  <TouchableOpacity key={e} onPress={() => submitMood(e)} style={styles.moodButton}>
                    <RNText style={styles.moodEmoji}>{e}</RNText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.grid}>
            {metricsList.map(([label, value]) => (
              <View style={styles.card} key={label}>
                <CustomText style={styles.metricLabel}>{label}</CustomText>
                <CustomText style={styles.metricValue}>{value}</CustomText>
              </View>
            ))}
          </View>

          <TouchableOpacity onLongPress={() => setShowDebug(s => !s)} activeOpacity={0.7}>
            <CustomText style={styles.updatedAt}>
              Actualizado: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </CustomText>
          </TouchableOpacity>

          <DebugPanel />

          {renderNextPharma()}

          {/* Cuidador (no interfiere con permisos) */}
          <CuidadorScreen />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.sm },

  // ---- Perms card
  permsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    ...Platform.select({ ios: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:2 }, android: { elevation:1 } }),
  },
  permsTitle: { fontSize: theme.fontSizes.md, fontFamily: theme.typography.subtitle.fontFamily, color: theme.colors.textPrimary, marginBottom: 6 },
  permsText:  { fontSize: theme.fontSizes.sm, color: theme.colors.textPrimary, marginBottom: 4, fontFamily: theme.typography.body.fontFamily },
  permsHint:  { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginBottom: 8, fontFamily: theme.typography.body.fontFamily },
  permsBtnPrimary: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: theme.shape.borderRadius,
  },
  permsBtnPrimaryText: { color: theme.colors.background, textAlign: 'center', fontFamily: theme.typography.subtitle.fontFamily },
  permsBtnOutline: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 10,
    borderRadius: theme.shape.borderRadius,
  },
  permsBtnOutlineText: { color: theme.colors.textPrimary, textAlign: 'center', fontFamily: theme.typography.body.fontFamily },

  moodContainer: { marginBottom: theme.spacing.md, alignItems: 'center' },
  moodTitle: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs, fontFamily: theme.typography.body.fontFamily },
  moodOptions: { flexDirection: 'row' },
  moodButton: { marginHorizontal: theme.spacing.sm },
  moodEmoji: { fontSize: theme.fontSizes.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing.sm,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, android: { elevation: 2 } })
  },
  metricLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs, fontFamily: theme.typography.body.fontFamily },
  metricValue: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontWeight: '700', fontFamily: theme.typography.subtitle.fontFamily },

  updatedAt: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md, textAlign: 'center', fontFamily: theme.typography.body.fontFamily },

  nextMedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing.md,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, android: { elevation: 2 } })
  },
  nextMedInfo: { marginLeft: theme.spacing.sm, flex: 1 },
  nextMedLabel: { fontSize: theme.fontSizes.md, color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily },
  nextMedText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  nextMeta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily },

  pausedChip: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  pausedChipText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.typography.body.fontFamily },

  debugBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  debugTitle: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.subtitle.fontFamily,
  },
  debugBtn: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    paddingVertical: 8,
    borderRadius: theme.shape.borderRadius,
  },
});
