// CuidadorScreen.js
// Versión compatible: si no recibe metrics, muestra placeholders. Si recibe, renderiza con fallbacks.
// Mantén tus acciones (onCongratulate) y estética básica con theme.

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import CustomText from './CustomText';
import { Ionicons } from '@expo/vector-icons';
import theme from './theme';

function fmt(val, unit = '') {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  return unit ? `${val} ${unit}` : String(val);
}

export default function CuidadorScreen({ metrics = {}, onCongratulate }) {
  const {
    heart_rate = null,
    steps = null,
    spo2 = null,
    bp_sys = null,
    bp_dia = null,
    sleep = null,
  } = metrics || {};

  const tiles = [
    { label: 'FC', value: fmt(heart_rate, 'bpm') },
    { label: 'PA', value: (bp_sys != null && bp_dia != null) ? `${bp_sys}/${bp_dia} mmHg` : '—' },
    { label: 'SpO₂', value: fmt(spo2, '%') },
    { label: 'Sueño', value: (sleep != null ? `${sleep} h` : '—') },
    { label: 'Pasos', value: fmt(steps) },
    // Puedes añadir más si te interesa (HRV, VO₂, etc.)
  ];

  return (
    <View style={styles.wrapper}>
      <CustomText style={styles.title}>Cuidador</CustomText>
      <CustomText style={styles.subtitle}>Paciente</CustomText>

      <View style={styles.grid}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.card}>
            <CustomText style={styles.value}>{t.value}</CustomText>
            <CustomText style={styles.caption}>{t.label}</CustomText>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onCongratulate}
        style={styles.cta}
        activeOpacity={0.8}
      >
        <Ionicons name="send" size={16} color={theme.colors.onPrimary} />
        <CustomText style={styles.ctaText}>Felicitación</CustomText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },
  title: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, marginBottom: 4, fontFamily: theme.typography.body.fontFamily },
  subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontFamily: theme.typography.body.fontFamily },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  value: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontWeight: '700', fontFamily: theme.typography.subtitle.fontFamily },
  caption: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 2, fontFamily: theme.typography.body.fontFamily },

  cta: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  ctaText: { color: theme.colors.onPrimary, fontSize: theme.fontSizes.sm, fontFamily: theme.typography.body.fontFamily }
});
