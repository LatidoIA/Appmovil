// SaludScreen.js (RAÍZ)
// UI original + Health Connect + auto-refresh 15s.
// ✅ Se elimina quickSetup() silencioso para evitar doble flujo.
// ✅ Muestra “— / Sin datos” y recencia “hace X min” en cada tarjeta.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  Text as RNText
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LatidoPower } from './LatidoPower';
import CustomText from './CustomText';
import CuidadorScreen from './CuidadorScreen';
import theme from './theme';

// Health Connect (lectores)
import {
  readTodaySteps,
  readLatestHeartRate,
  readLatestSpO2,
  readSleepLast24h,
} from './health';

const PROFILE_KEY = '@latido_profile';
const MEDS_KEY = '@latido_meds';

// ---------- Helpers Vital ----------
function computeVital(metrics = {}, mood) {
  const vals = [];
  if (metrics.heart_rate != null) vals.push(Math.min((metrics.heart_rate / 180) * 100, 100));
  if (metrics.steps      != null) vals.push(Math.min((metrics.steps / 10000) * 100, 100));
  if (metrics.sleep      != null) vals.push(Math.min((metrics.sleep / 8) * 100, 100));
  if (metrics.spo2       != null) vals.push(metrics.spo2);
  if (mood === '😊') vals.push(100);
  else if (mood === '😐') vals.push(50);
  else if (mood === '😔') vals.push(0);

  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const color = avg > 75 ? theme.colors.accent : avg > 50 ? '#FDB827' : theme.colors.error;
  return { score: avg, color };
}

// ---------- Helpers Farmacia (tiempos) ----------
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

// ---------- Recencia ----------
function timeAgo(iso) {
  if (!iso) return null;
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (!t) return null;
  const diff = Math.max(0, Math.floor((now - t) / 1000));
  if (diff < 60) return `hace ${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export default function SaludScreen() {
  const navigation = useNavigation();
  const [patient, setPatient] = useState({ id: null });
  const [metrics, setMetrics] = useState({});
  const [mood, setMood] = useState(null);
  const [power, setPower] = useState({ score: 0, color: theme.colors.primary });

  // Timestamps/orígenes para recencia
  const [meta, setMeta] = useState({
    hrAt: null, hrOrigin: null,
    stepsAt: null, stepsSource: null,
    spo2At: null, spo2Origin: null,
    sleepEnd: null
  });

  // Próximo ítem de Farmacia
  const [nextInfo, setNextInfo] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const etaTimerRef = useRef(null);
  const intervalRef = useRef(null);

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
    } catch {
      setNextInfo(null);
    }
  };

  useEffect(() => {
    recomputeNext();
    const unsub = navigation.addListener('focus', recomputeNext);
    return unsub;
  }, [navigation]);

  // Timer de cuenta regresiva (1s)
  useEffect(() => {
    etaTimerRef.current && clearInterval(etaTimerRef.current);
    etaTimerRef.current = setInterval(() => setNowTick(Date.now()), 1000);
    return () => { etaTimerRef.current && clearInterval(etaTimerRef.current); };
  }, []);

  // Recalcular cuando pase la hora objetivo
  useEffect(() => {
    if (!nextInfo?.nextAt) return;
    if (Date.now() - nextInfo.nextAt.getTime() >= 0) {
      recomputeNext();
    }
  }, [nowTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Permisos Android básicos
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BODY_SENSORS).catch(() => {});
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION).catch(() => {});
    }
  }, []);

  // ❌ Eliminado quickSetup() silencioso para no duplicar flujo de permisos
  // useEffect(() => { quickSetup().catch(() => {}); }, []);

  // Fetch métricas cada 15s (Health Connect)
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [hr, st, sp, sl] = await Promise.all([
          readLatestHeartRate(),   // { bpm, at, origin }
          readTodaySteps(),        // { steps, asOf, source, origins }
          readLatestSpO2(),        // { spo2, at, origin }
          readSleepLast24h(),      // { hours, rangeEnd }
        ]);

        const newMetrics = {
          heart_rate: hr?.bpm ?? null,
          steps: st?.steps ?? null,
          sleep: sl?.hours ?? null,
          spo2: sp?.spo2 ?? null,
        };
        setMetrics(newMetrics);

        setMeta({
          hrAt: hr?.at || null,
          hrOrigin: hr?.origin || null,
          stepsAt: st?.asOf || null,
          stepsSource: st?.source || null,
          spo2At: sp?.at || null,
          spo2Origin: sp?.origin || null,
          sleepEnd: sl?.rangeEnd || null
        });

        const { score, color } = computeVital(newMetrics, mood);
        setPower({ score, color });
      } catch {
        // métrica previa se mantiene
      }
    }

    // primera carga + intervalo
    fetchMetrics();
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchMetrics, 15000);
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
    };
  }, [mood]);

  const submitMood = choice => {
    setMood(choice);
    Alert.alert('¡Gracias!', `Estado de ánimo: ${choice}`);
    const { score, color } = computeVital(metrics, choice);
    setPower({ score, color });
  };

  // Umbrales de “reciente”
  const FRESH_HR_SPO2_MIN = 15;   // min
  const FRESH_STEPS_MIN   = 30;   // min

  function recencyBadge(tsIso, type) {
    if (!tsIso) return <View style={styles.badge}><CustomText style={styles.badgeText}>Sin datos</CustomText></View>;
    const diffMin = Math.floor((Date.now() - new Date(tsIso).getTime()) / 60000);
    const isFresh = type === 'steps'
      ? diffMin <= FRESH_STEPS_MIN
      : diffMin <= FRESH_HR_SPO2_MIN;
    return (
      <CustomText style={[styles.recency, { color: isFresh ? theme.colors.textSecondary : theme.colors.error }]}>
        {timeAgo(tsIso)}
      </CustomText>
    );
  }

  const metricsList = [
    {
      label: 'Frecuencia cardíaca',
      value: metrics.heart_rate != null ? `${metrics.heart_rate} bpm` : '—',
      meta: recencyBadge(meta.hrAt, 'hr')
    },
    {
      label: 'Pasos',
      value: metrics.steps != null ? metrics.steps : '—',
      meta: recencyBadge(meta.stepsAt, 'steps')
    },
    {
      label: 'Sueño',
      value: metrics.sleep != null ? `${metrics.sleep} h` : '—',
      meta: metrics.sleep != null
        ? <CustomText style={styles.recency}>últimas 24 h</CustomText>
        : <View style={styles.badge}><CustomText style={styles.badgeText}>Sin datos</CustomText></View>
    },
    {
      label: 'SpO₂',
      value: metrics.spo2 != null ? `${metrics.spo2} %` : '—',
      meta: recencyBadge(meta.spo2At, 'spo2')
    }
  ];

  // --------- UI Próximo medicamento/suplemento ----------
  const renderNextPharma = () => {
    const goFarmacia = () => navigation.navigate('Cuidado', { initialTab: 'Farmacia' });

    return (
      <TouchableOpacity style={styles.nextMedContainer} onPress={goFarmacia} activeOpacity={0.8}>
        <Ionicons
          name="medkit-outline"
          size={24}
          color={theme.colors.textPrimary}
        />
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
                  • {formatEta(Math.max(0, nextInfo.nextAt.getTime() - nowTick))}
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

  return (
    <ScrollView contentContainerStyle={styles.container} style={{ backgroundColor: theme.colors.background }}>
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
        {metricsList.map((row) => (
          <View style={styles.card} key={row.label}>
            <CustomText style={styles.metricLabel}>{row.label}</CustomText>
            <CustomText style={styles.metricValue}>{row.value}</CustomText>
            <View style={{ marginTop: 2 }}>{row.meta}</View>
          </View>
        ))}
      </View>

      {renderNextPharma()}

      {/* Cuidador: conserva integración existente */}
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

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: theme.spacing.md },
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

  recency: { fontSize: 12, fontFamily: theme.typography.body.fontFamily },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  badgeText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.typography.body.fontFamily },

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
  pausedChipText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.typTypography?.body?.fontFamily || theme.typography.body.fontFamily }
});
