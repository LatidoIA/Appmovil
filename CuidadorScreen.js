// CuidadorScreen.js
// — Versión “original”: botón + SOLO dentro de la tarjeta.
// — No toca el header global.
// — Si no hay vínculo, muestra métricas en 0 para evitar "undefined".

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomText from './CustomText';
import theme from './theme';

// Props opcionales:
// - linked: boolean (hay vínculo?)
// - metrics: { hr, bp_sys, bp_dia, mood, spo2, steps, sleep } (si linked=true)
// Si linked=false o metrics ausentes -> se pintan ceros.
export default function CuidadorScreen({ linked = false, metrics = null }) {
  const navigation = useNavigation();

  const goLink = () => {
    try { navigation.navigate('Vincular'); } catch (e) { /* ruta no existe, el stack la definirá */ }
  };

  const safe = linked && metrics ? metrics : {
    hr: 0, bp_sys: 0, bp_dia: 0, mood: null, spo2: 0, steps: 0, sleep: 0
  };

  const items = [
    { label: 'FC',   value: `${safe.hr ?? 0} bpm` },
    { label: 'PA',   value: `${safe.bp_sys ?? 0}/${safe.bp_dia ?? 0} mmHg` },
    { label: 'Ánimo',value: safe.mood ?? '—' },
    { label: 'SpO₂', value: `${safe.spo2 ?? 0} %` },
    { label: 'Pasos',value: `${safe.steps ?? 0}` },
    { label: 'Sueño',value: `${safe.sleep ?? 0} h` },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <CustomText style={styles.title}>Cuidador</CustomText>
        <TouchableOpacity onPress={goLink} style={styles.iconBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <CustomText style={styles.subtitle}>Paciente</CustomText>

      <View style={styles.grid}>
        {items.map((it) => (
          <View key={it.label} style={styles.tile}>
            <CustomText style={styles.tileValue}>{it.value}</CustomText>
            <CustomText style={styles.tileLabel}>{it.label}</CustomText>
          </View>
        ))}
      </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 4 },
  title: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 4, marginBottom: theme.spacing.sm, fontFamily: theme.typography.body.fontFamily },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '32%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.shape.borderRadius,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tileValue: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontWeight: '700', fontFamily: theme.typography.subtitle.fontFamily, textAlign: 'center' },
  tileLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 4, fontFamily: theme.typography.body.fontFamily, textAlign: 'center' }
});
