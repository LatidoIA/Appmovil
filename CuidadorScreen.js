// CuidadorScreen.js
// Botón “+” en el header (si existe) y también dentro del card.
// No muestra métricas locales hasta que haya vínculo real.

import React, { useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomText from './CustomText';
import theme from './theme';

export default function CuidadorScreen({ onLink }) {
  const navigation = useNavigation();

  const doLink = () => {
    if (typeof onLink === 'function') { try { onLink(); return; } catch {} }
    const tries = [
      () => navigation.navigate('CuidadorVincular'),
      () => navigation.navigate('Vincular'),
      () => navigation.navigate('Vinculo'),
      () => navigation.navigate('LinkPaciente'),
      () => navigation.navigate('VincularPaciente'),
      () => navigation.navigate('Cuidado', { screen: 'Vincular' }),
    ];
    for (const t of tries) { try { t(); return; } catch {} }
  };

  // plus en header (si el stack muestra header)
  useLayoutEffect(() => {
    try {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={doLink} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )
      });
    } catch {}
  }, [navigation]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <CustomText style={styles.title}>Cuidador</CustomText>
        <TouchableOpacity onPress={doLink} style={styles.iconBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

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
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 4 },
  title: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 4, marginBottom: theme.spacing.sm, fontFamily: theme.typography.body.fontFamily },

  emptyBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96
  },
  emptyText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  emptySub: { marginTop: 4, fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, textAlign: 'center', fontFamily: theme.typography.body.fontFamily }
});
