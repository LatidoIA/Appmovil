// HistoryScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CustomText from './CustomText';
import theme from './theme';

const EXAMS_KEY = '@latido_exam_history';
const GLUC_KEY  = '@glucose_history';

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
function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}
function daysAgoTs(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function HistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState('todos'); // todos | examen | glucosa
  const [rangeFilter, setRangeFilter] = useState('7d');   // hoy | 7d | 30d

  const loadAll = useCallback(async () => {
    try {
      const [exRaw, glRaw] = await Promise.all([
        AsyncStorage.getItem(EXAMS_KEY),
        AsyncStorage.getItem(GLUC_KEY)
      ]);
      const exams = exRaw ? JSON.parse(exRaw) : [];
      const glucs = glRaw ? JSON.parse(glRaw) : [];

      const mappedExams = (Array.isArray(exams) ? exams : []).map((e, i) => ({
        id: `exam-${e.takenAt || i}`,
        type: 'examen',
        when: e.takenAt || new Date().toISOString(),
        title: `${e.bpm ?? '—'} bpm`,
        subtitle: 'Examen de latido'
      }));

      const mappedGlucose = (Array.isArray(glucs) ? glucs : []).map(g => ({
        id: `gluc-${g.id || g.notedAt}`,
        type: 'glucosa',
        when: g.notedAt || new Date().toISOString(),
        title: `${g.value ?? '—'} mg/dL`,
        subtitle:
          `${g.context === 'ayunas' ? 'Ayunas' : g.context === 'postprandial' ? 'Post comida' : 'Otro'}`
          + (g.note ? ` • “${g.note}”` : '')
      }));

      const all = [...mappedExams, ...mappedGlucose]
        .filter(x => !!x.when)
        .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

      setItems(all);
    } catch (e) {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const unsub = navigation?.addListener?.('focus', loadAll);
    return unsub;
  }, [navigation, loadAll]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      rangeFilter === 'hoy' ? startOfToday()
      : rangeFilter === '7d' ? daysAgoTs(7)
      : rangeFilter === '30d' ? daysAgoTs(30)
      : 0;

    return items.filter(it => {
      const ts = new Date(it.when).getTime();
      const byRange = ts >= cutoff;
      const byType =
        typeFilter === 'todos' ? true :
        typeFilter === 'examen' ? it.type === 'examen' :
        it.type === 'glucosa';
      return byRange && byType;
    });
  }, [items, rangeFilter, typeFilter]);

  const renderItem = ({ item }) => {
    const isExam = item.type === 'examen';
    return (
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={isExam ? 'pulse-outline' : 'water-outline'}
            size={20}
            color={isExam ? theme.colors.accent : theme.colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CustomText style={styles.title}>{item.title}</CustomText>
          <CustomText style={styles.subtitle}>{item.subtitle} • {fmtDate(item.when)}</CustomText>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomText style={styles.screenTitle}>Historial</CustomText>

      {/* Filtros */}
      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <FilterChip
            label="Todos"
            active={typeFilter === 'todos'}
            onPress={() => setTypeFilter('todos')}
          />
          <FilterChip
            label="Examen"
            active={typeFilter === 'examen'}
            onPress={() => setTypeFilter('examen')}
          />
          <FilterChip
            label="Glucosa"
            active={typeFilter === 'glucosa'}
            onPress={() => setTypeFilter('glucosa')}
          />
        </View>

        <View style={styles.filterGroup}>
          <FilterChip
            label="Hoy"
            active={rangeFilter === 'hoy'}
            onPress={() => setRangeFilter('hoy')}
          />
          <FilterChip
            label="7d"
            active={rangeFilter === '7d'}
            onPress={() => setRangeFilter('7d')}
          />
          <FilterChip
            label="30d"
            active={rangeFilter === '30d'}
            onPress={() => setRangeFilter('30d')}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <CustomText style={styles.empty}>Sin registro</CustomText>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <CustomText style={[styles.chipText, active && styles.chipTextActive]}>{label}</CustomText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  screenTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily
  },

  filters: { marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },

  chip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  chipTextActive: { color: '#fff' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 1 }
    }),
    gap: 10
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.outline
  },
  title: { color: theme.colors.textPrimary, fontFamily: theme.typography.subtitle.fontFamily },
  subtitle: { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily, marginTop: 2 },

  empty: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontFamily: theme.typography.body.fontFamily
  }
});
