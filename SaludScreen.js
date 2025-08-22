// SaludScreen.js (refresh eficiente + pull-to-refresh + panel debug oculto)

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  AppState,
  Text as RNText
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
} from './health';

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

  // Próximo ítem de Farmacia
  const [nextInfo, setNextInfo] = useState(null);

  // Refresh y debug
  const [refreshing, setRefreshing] = useState(false);
  const [debug, setDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ status: null, granted: [], origins: {} });

  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Cargar perfil
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then(raw => raw && setPatient(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  // Cargar meds y calcular “próximo”
  const recomputeNext = async () => {
    try {
      const raw = await AsyncStorage.getItem(MEDS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.length) { setNextInfo(null); return; }

      const ensureSchedule = (x) => x.schedule
        ? x
        : { ...x, schedule: { mode: 'hora', time: x.time || defaultTime(), everyHours: null, startTime: null } };

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
    } catch { setNextInfo(null); }
  };

  useEffect(() => {
    recomputeNext();
    const unsub = navigation.addListener('focus', recomputeNext);
    return unsub;
  }, [navigation]);

  // Permisos Android básicos
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BODY_SENSORS).catch(() => {});
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION).catch(() => {});
    }
    quickSetup().catch(() => {});
  }, []);

  // ---- Fetch de métricas ----
  const fetchMetrics = async () => {
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

      // debug: orígenes por tipo
      setDebugInfo(prev => ({
        ...prev,
        origins: {
          steps: st?.origins || [],
          hr: hr?.origin ? [hr.origin] : [],
          spo2: sp?.origin ? [sp.origin] : [],
          sleep: sl?.origins || [],
          bp: bp?.origin ? [bp.origin] : [],
        }
      }));
    } catch {}
  };

  const refreshDebug = async () => {
    try {
      const [status, granted] = await Promise.all([hcGetStatusDebug(), getGrantedList()]);
      setDebugInfo(prev => ({ ...prev, status, granted }));
    } catch {}
  };

  // Intervalo eficiente: solo con pantalla enfocada y app activa
  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const start = () => {
        if (intervalRef.current) return;
        fetchMetrics(); refreshDebug();
        intervalRef.current = setInterval(() => { fetchMetrics(); }, REFRESH_MS);
      };
      const stop = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      };

      // AppState listener
      const sub = AppState.addEventListener('change', (next) => {
        appState.current = next;
        if (!active) return;
        if (next === 'active') start(); else stop();
      });

      // arranque
      if (appState.current === 'active') start();

      return () => {
        active = false;
        sub.remove();
        stop();
      };
    }, [mood])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMetrics(), refreshDebug()]);
    setRefreshing(false);
  };

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

  // --------- UI Próximo medicamento/suplemento ----------
  const renderNextPharma = () => {
    const goFarmacia = () => {
      try { navigation.navigate('Cuidado', { initialTab: 'Farmacia' }); } catch {}
    };
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
                    : `Cada ${nextInfo.item.schedule?.everyHours} h`}{' '}
                  • {/* ETA aproximada */}
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

  // Panel debug oculto (long press en "Actualizado")
  const DebugPanel = () => {
    if (!debug) return null;
    return (
      <View style={styles.debugBox}>
        <CustomText style={styles.debugLine}>
          SDK: {debugInfo.status?.label || '—'}
        </CustomText>
        <CustomText style={styles.debugLine}>
          Permisos: {Array.isArray(debugInfo.granted) ? debugInfo.granted.join(', ') : '—'}
        </CustomText>
        <CustomText style={styles.debugLine}>
          Orígenes → HR:{(debugInfo.origins?.hr||[]).join(' | ') || '—'} · Steps:{(debugInfo.origins?.steps||[]).join(' | ') || '—'}
        </CustomText>
        <CustomText style={styles.debugLine}>
          SpO₂:{(debugInfo.origins?.spo2||[]).join(' | ') || '—'} · Sueño:{(debugInfo.origins?.sleep||[]).join(' | ') || '—'} · PA:{(debugInfo.origins?.bp||[]).join(' | ') || '—'}
        </CustomText>
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

      <TouchableOpacity onLongPress={() => setDebug(v => !v)} activeOpacity={0.7}>
        <CustomText style={styles.updatedAt}>
          Actualizado: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
        </CustomText>
      </TouchableOpacity>

      <DebugPanel />

      {renderNextPharma()}

      {/* Cuidador: modal “+” y 0s hasta vincular */}
      <CuidadorScreen onCongratulate={() => Alert.alert('¡Enviado!', 'Felicitación enviada.')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.sm },
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 }
    })
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 }
    })
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
  debugLine: { color: theme.colors.textSecondary, fontSize: theme.fontSizes.sm, marginBottom: 4, fontFamily: theme.typography.body.fontFamily },
});
