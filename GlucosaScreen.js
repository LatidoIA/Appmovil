// GlucosaScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  Alert,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Polyline, Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import CustomText from './CustomText';
import theme from './theme';

const HISTORY_KEY = '@glucose_history';
const EVENTS_KEY  = '@latido_events';

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

// -------- Helpers para la serie de 14 días --------
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function labelDM(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
function lastNDays(n) {
  const days = [];
  const today = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}
function build14dSeries(list) {
  // Agrupa por día y promedia si hay múltiples valores
  const byDay = new Map();
  list.forEach((e) => {
    const d = startOfDay(new Date(e.notedAt || e.when || Date.now())).getTime();
    const arr = byDay.get(d) || [];
    if (typeof e.value === 'number') arr.push(e.value);
    byDay.set(d, arr);
  });

  const days = lastNDays(14);
  const series = days.map((d) => {
    const key = d.getTime();
    const vals = byDay.get(key) || [];
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    return { x: d, label: labelDM(d), value: avg };
  });
  return series;
}

export default function GlucosaScreen() {
  const [value, setValue] = useState('');
  const [context, setContext] = useState('ayunas'); // ayunas | postprandial | otro
  const [note, setNote] = useState('');
  const [list, setList] = useState([]);

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        setList(Array.isArray(arr) ? arr : []);
      } catch (e) {
        setList([]);
      }
    })();
  }, []);

  // Guardar
  const saveEntry = async () => {
    const num = parseInt(String(value).replace(/\D/g, ''), 10);
    if (Number.isNaN(num)) {
      Alert.alert('Dato faltante', 'Ingresa un valor de glucosa.');
      return;
    }
    if (num < 40 || num > 600) {
      Alert.alert('Valor fuera de rango', 'Usa un valor entre 40 y 600 mg/dL.');
      return;
    }

    const entry = {
      id: `${Date.now()}`,
      value: num,
      context, // ayunas / postprandial / otro
      note: note.trim() || null,
      notedAt: new Date().toISOString()
    };

    try {
      const updated = [entry, ...list].slice(0, 200);
      setList(updated);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

      // Medalla: primer registro de glucosa
      try {
        const eraw = await AsyncStorage.getItem(EVENTS_KEY);
        const events = eraw ? JSON.parse(eraw) : {};
        if (!events.firstGlucoseAt) {
          events.firstGlucoseAt = entry.notedAt;
          await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        }
      } catch (e) {
        console.debug('GlucosaScreen: no se pudo registrar la medalla de primer registro', e?.message || e);
      }

      setValue('');
      setNote('');
      setContext('ayunas');
      Alert.alert('Guardado', `Glucosa registrada: ${num} mg/dL`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el registro.');
    }
  };

  // Eliminar
  const removeEntry = (id) => {
    Alert.alert('Eliminar registro', '¿Deseas eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = list.filter(x => x.id !== id);
            setList(updated);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar.');
          }
        }
      }
    ]);
  };

  // Serie 14 días
  const series14 = useMemo(() => build14dSeries(list), [list]);

  // Rango visible (auto con margen); por defecto 60-200 si no hay datos
  const [minY, maxY] = useMemo(() => {
    const vals = series14.map(p => p.value).filter(v => typeof v === 'number');
    if (!vals.length) return [60, 200];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(10, Math.round((max - min) * 0.15));
    return [Math.max(40, min - pad), Math.min(400, max + pad)];
  }, [series14]);

  // Banda de referencia según contexto seleccionado en el formulario
  const refBand = useMemo(() => {
    if (context === 'ayunas') return { lo: 70, hi: 99, label: 'Ref. ayunas' };
    if (context === 'postprandial') return { lo: 70, hi: 140, label: 'Ref. post' };
    return null;
  }, [context]);

  // --------- Chart component (inline) ---------
  const Chart = ({ data }) => {
    const w = Math.min(Dimensions.get('window').width - 32, 560); // margen visual
    const h = 160;
    const padL = 28, padR = 10, padT = 12, padB = 24;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const xFor = (i) => {
      if (data.length <= 1) return padL;
      const t = i / (data.length - 1);
      return padL + t * innerW;
    };
    const yFor = (val) => {
      const clamped = Math.max(minY, Math.min(maxY, val));
      const t = (clamped - minY) / (maxY - minY || 1); // 0..1
      return padT + innerH * (1 - t);
    };

    const points = data
      .map((p, i) => (typeof p.value === 'number' ? `${xFor(i)},${yFor(p.value)}` : null))
      .filter(Boolean)
      .join(' ');

    // Grid y labels X cada ~3 días
    const gridY = [0, 0.25, 0.5, 0.75, 1].map(t => ({
      y: padT + innerH * t,
      v: Math.round(minY + (1 - t) * (maxY - minY))
    }));

    return (
      <Svg width={w} height={h}>
        {/* Fondo */}
        <Rect x={0} y={0} width={w} height={h} fill="transparent" />

        {/* Banda de referencia */}
        {refBand && (
          <Rect
            x={padL}
            y={yFor(refBand.hi)}
            width={innerW}
            height={Math.max(2, yFor(refBand.lo) - yFor(refBand.hi))}
            fill={theme.colors.primary}
            opacity={0.12}
            rx={4}
          />
        )}

        {/* Grid horizontal */}
        {gridY.map((g, idx) => (
          <Line
            key={`gy-${idx}`}
            x1={padL} x2={w - padR}
            y1={g.y} y2={g.y}
            stroke={theme.colors.outline}
            strokeWidth={1}
            opacity={0.6}
          />
        ))}

        {/* Eje Y labels */}
        {gridY.map((g, idx) => (
          <SvgText
            key={`gyl-${idx}`}
            x={padL - 6}
            y={g.y + 4}
            fontSize="10"
            textAnchor="end"
            fill={theme.colors.textSecondary}
          >
            {g.v}
          </SvgText>
        ))}

        {/* Curva */}
        {points.length > 0 && (
          <Polyline
            points={points}
            fill="none"
            stroke={theme.colors.accent}
            strokeWidth={2}
          />
        )}

        {/* Puntos */}
        {data.map((p, i) =>
          typeof p.value === 'number' ? (
            <Circle key={`pt-${i}`} cx={xFor(i)} cy={yFor(p.value)} r={3} fill={theme.colors.accent} />
          ) : null
        )}

        {/* Labels X (cada 3 días aprox) */}
        {data.map((p, i) =>
          (i % 3 === 0 || i === data.length - 1) ? (
            <SvgText
              key={`xl-${i}`}
              x={xFor(i)}
              y={h - 6}
              fontSize="10"
              textAnchor="middle"
              fill={theme.colors.textSecondary}
            >
              {p.label}
            </SvgText>
          ) : null
        )}

        {/* Etiqueta banda */}
        {refBand && (
          <SvgText
            x={w - padR}
            y={yFor(refBand.hi) - 4}
            fontSize="10"
            textAnchor="end"
            fill={theme.colors.textSecondary}
          >
            {refBand.label}
          </SvgText>
        )}
      </Svg>
    );
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <CustomText style={styles.itemTitle}>{item.value} mg/dL</CustomText>
          <CustomText style={styles.itemSubtitle}>
            {item.context === 'ayunas' ? 'Ayunas' : item.context === 'postprandial' ? 'Post comida' : 'Otro'} • {fmtDate(item.notedAt)}
          </CustomText>
          {!!item.note && <CustomText style={styles.itemNote}>“{item.note}”</CustomText>}
        </View>
        <TouchableOpacity onPress={() => removeEntry(item.id)} style={[styles.iconBtn, { backgroundColor: theme.colors.error }]}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Registro de Glucosa</CustomText>
      <CustomText style={styles.subtitle}>Guarda tus valores en mg/dL para ver tu progreso.</CustomText>

      {/* Formulario */}
      <View style={styles.card}>
        <CustomText style={styles.label}>Valor (mg/dL)</CustomText>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Ej: 95"
          keyboardType="number-pad"
          style={styles.input}
          maxLength={3}
        />

        <CustomText style={[styles.label, { marginTop: 4 }]}>Contexto</CustomText>
        <View style={styles.typeRow}>
          <Chip label="Ayunas" active={context === 'ayunas'} onPress={() => setContext('ayunas')} />
          <Chip label="Post comida" active={context === 'postprandial'} onPress={() => setContext('postprandial')} />
          <Chip label="Otro" active={context === 'otro'} onPress={() => setContext('otro')} />
        </View>

        <CustomText style={[styles.label, { marginTop: 4 }]}>Nota (opcional)</CustomText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Ej: después de caminar"
          style={styles.input}
        />

        <View style={styles.actions}>
          <TouchableOpacity onPress={saveEntry} style={styles.primaryBtn}>
            <CustomText style={styles.btnText}>Guardar</CustomText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setValue(''); setNote(''); setContext('ayunas'); }} style={styles.secondaryBtn}>
            <CustomText style={styles.btnTextAlt}>Cancelar</CustomText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tendencia 14 días */}
      <View style={styles.summaryCard}>
        <CustomText style={styles.summaryTitle}>Tendencia 14 días</CustomText>
        {series14.some(p => typeof p.value === 'number') ? (
          <Chart data={series14} />
        ) : (
          <CustomText style={styles.summaryText}>Sin datos en los últimos 14 días</CustomText>
        )}
      </View>

      {/* Historial */}
      <CustomText style={[styles.sectionTitle, { marginTop: theme.spacing.md }]}>Historial</CustomText>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<CustomText style={styles.empty}>Sin registro</CustomText>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <CustomText style={[styles.chipText, active && styles.chipTextActive]}>{label}</CustomText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md, backgroundColor: theme.colors.background, flex: 1 },
  title: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily
  },
  subtitle: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily
  },

  card: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },

  label: { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    color: theme.colors.textPrimary
  },

  typeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  chip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.shape.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  chipTextActive: { color: '#fff' },

  actions: { marginTop: theme.spacing.xs, flexDirection: 'row', gap: theme.spacing.sm },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  btnText: { color: '#fff', fontFamily: theme.typography.body.fontFamily },
  btnTextAlt: { color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },

  summaryCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },
  summaryTitle: { color: theme.colors.textPrimary, fontFamily: theme.typography.subtitle.fontFamily, marginBottom: 6 },
  summaryText: { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily },

  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily
  },
  empty: { marginTop: theme.spacing.sm, color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm
  },
  itemTitle: { color: theme.colors.textPrimary, fontFamily: theme.typography.subtitle.fontFamily },
  itemSubtitle: { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily, marginTop: 2 },
  itemNote: { color: theme.colors.textSecondary, fontStyle: 'italic', fontFamily: theme.typography.body.fontFamily, marginTop: 2 },

  iconBtn: {
    backgroundColor: theme.colors.accent,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center'
  }
});
