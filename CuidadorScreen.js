// CuidadorScreen.js
// Sin datos locales: muestra "Sin vínculo" y opciones mínimas.
// Cuando integremos el servicio de vínculo, aquí haremos subscribe a las métricas remotas.

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import CustomText from './CustomText';
import { Ionicons } from '@expo/vector-icons';
import theme from './theme';

export default function CuidadorScreen({ onCongratulate, onLink }) {
  return (
    <View style={styles.wrapper}>
      <CustomText style={styles.title}>Cuidador</CustomText>
      <CustomText style={styles.subtitle}>Paciente</CustomText>

      <View style={styles.emptyBox}>
        <CustomText style={styles.emptyText}>Sin vínculo</CustomText>
        <CustomText style={styles.emptySub}>Vincula un paciente para ver sus métricas en tiempo real.</CustomText>
        <TouchableOpacity
          onPress={onLink}
          style={styles.cta}
          activeOpacity={0.8}
        >
          <Ionicons name="link-outline" size={16} color={theme.colors.onPrimary} />
          <CustomText style={styles.ctaText}>Vincular</CustomText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onCongratulate}
        style={[styles.cta, { marginTop: theme.spacing.sm }]}
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

  cta: {
    marginTop: theme.spacing.xs,
    alignSelf: 'center',
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
