// CuidadorScreen.js
// Mantén tu flujo original (el botón “+” lo maneja tu navegación). Aquí no forzamos cabecera ni CTA nuevos.
// Placeholder hasta conectar suscripción remota.

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import CustomText from './CustomText';
import theme from './theme';

export default function CuidadorScreen({ onCongratulate }) {
  return (
    <View style={styles.wrapper}>
      <CustomText style={styles.title}>Cuidador</CustomText>
      <CustomText style={styles.subtitle}>Paciente</CustomText>

      <View style={styles.emptyBox}>
        <CustomText style={styles.emptyText}>Sin vínculo</CustomText>
        <CustomText style={styles.emptySub}>Vincula un paciente para ver sus métricas en tiempo real.</CustomText>
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
  title: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, marginBottom: 4, fontFamily: theme.typography.body.fontFamily },
  subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontFamily: theme.typography.body.fontFamily },

  emptyBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96
  },
  emptyText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  emptySub: { marginTop: 4, fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, textAlign: 'center', fontFamily: theme.typography.body.fontFamily },
});
