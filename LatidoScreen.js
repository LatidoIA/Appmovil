// LatidoScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CustomText from './CustomText';
import theme from './theme';
import { useNavigation } from '@react-navigation/native';

const EXAMS_KEY = '@latido_exam_history';
const EVENTS_KEY = '@latido_events';

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  } catch {
    return iso || '—';
  }
}

export default function LatidoScreen() {
  const navigation = useNavigation();

  // Último resultado
  const [lastExam, setLastExam] = useState(null); // { bpm, takenAt }

  const loadLast = async () => {
    try {
      const raw = await AsyncStorage.getItem(EXAMS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && arr.length) {
        setLastExam(arr[0]); // ya debería venir ordenado (guardamos al inicio)
      } else {
        setLastExam(null);
      }
    } catch (e) {
      setLastExam(null);
    }
  };

  useEffect(() => {
    loadLast();
    const unsub = navigation.addListener?.('focus', loadLast);
    return unsub;
  }, [navigation]);

  // Examen rápido (demo) — 15s cronómetro que genera un BPM y guarda
  const [measuring, setMeasuring] = useState(false);
  const [elapsed, setElapsed] = useState(0); // 0..15
  const timerRef = useRef(null);

  const finishExam = async () => {
    // Demo: BPM “razonable” 58–105 con ligera variabilidad
    const bpm = Math.max(50, Math.min(120, Math.round(70 + Math.random() * 35)));
    setMeasuring(false);

    const record = { bpm, takenAt: new Date().toISOString() };
    try {
      const raw = await AsyncStorage.getItem(EXAMS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const updated = [record, ...arr].slice(0, 200);
      await AsyncStorage.setItem(EXAMS_KEY, JSON.stringify(updated));
      setLastExam(record);

      // Insignia: primer examen
      try {
        const eraw = await AsyncStorage.getItem(EVENTS_KEY);
        const events = eraw ? JSON.parse(eraw) : {};
        if (!events.firstExamAt) {
          events.firstExamAt = record.takenAt;
          await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        }
      } catch (e) {
        // noop
      }

      Alert.alert('Resultado', `Frecuencia estimada: ${bpm} bpm`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el examen.');
    }
    setElapsed(0);
  };

  const startExam = () => {
    if (measuring) return;
    setElapsed(0);
    setMeasuring(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((s) => {
        if (s >= 15) {
          clearInterval(timerRef.current);
          finishExam();
          return 15;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMeasuring(false);
    setElapsed(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const goHistory = () => navigation.navigate('Historial');

  // UI
  const progress = Math.min(1, elapsed / 15);
  const progressPct = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Examen de Latido</CustomText>

      {/* Último resultado */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="pulse-outline" size={22} color={theme.colors.accent} />
          <CustomText style={[styles.cardTitle, { marginLeft: 6 }]}>
            Último resultado
          </CustomText>
        </View>
        {lastExam ? (
          <>
            <CustomText style={styles.lastValue}>
              {lastExam.bpm} bpm
            </CustomText>
            <CustomText style={styles.lastWhen}>
              {fmtDate(lastExam.takenAt)}
            </CustomText>
          </>
        ) : (
          <CustomText style={styles.helper}>
            Aún no registras un examen.
          </CustomText>
        )}

        <TouchableOpacity onPress={goHistory} style={styles.secondaryBtn}>
          <Ionicons
            name="time-outline"
            size={16}
            color={theme.colors.textPrimary}
          />
          <CustomText style={styles.btnTextAlt}>Ver historial</CustomText>
        </TouchableOpacity>
      </View>

      {/* Medición simple */}
      <View style={styles.card}>
        <CustomText style={styles.cardTitle}>
          Medición rápida (demo)
        </CustomText>
        <CustomText style={styles.helper}>
          Mantén el teléfono quieto y respira normal. El demo dura 15 segundos.
        </CustomText>

        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
        </View>
        <CustomText style={styles.progressLabel}>
          {measuring ? `Midiendo… ${progressPct}%` : 'Listo para medir'}
        </CustomText>

        <View style={styles.actions}>
          {!measuring ? (
            <TouchableOpacity onPress={startExam} style={styles.primaryBtn}>
              <Ionicons name="play-outline" size={18} color="#fff" />
              <CustomText style={styles.btnText}>
                Iniciar examen
              </CustomText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={stopExam}
              style={[
                styles.secondaryBtn,
                { borderColor: theme.colors.error },
              ]}
            >
              <Ionicons
                name="stop-outline"
                size={18}
                color={theme.colors.error}
              />
              <CustomText
                style={[
                  styles.btnTextAlt,
                  { color: theme.colors.error },
                ]}
              >
                Detener
              </CustomText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Nota: si tienes una rutina de medición real, podemos integrarla aquí. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily,
  },

  card: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.subtitle.fontFamily,
    marginBottom: 6,
  },

  lastValue: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.subtitle.fontFamily,
  },
  lastWhen: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily,
    marginTop: 2,
  },
  helper: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily,
  },

  progressWrap: {
    height: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  progressBar: {
    height: 10,
    backgroundColor: theme.colors.primary,
  },
  progressLabel: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily,
  },

  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  btnText: {
    color: '#fff',
    fontFamily: theme.typography.body.fontFamily,
  },
  btnTextAlt: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.body.fontFamily,
  },
});
