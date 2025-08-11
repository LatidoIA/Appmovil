import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from './theme';

const tabs = ['Tareas', 'Insignias', 'Artículos', 'Consejos'];

export default function CareScreen() {
  const [activeTab, setActiveTab] = useState('Tareas');

  const renderContent = () => {
    switch (activeTab) {
      case 'Tareas':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tareas Diarias</Text>
            <Text style={styles.sectionText}>Registra tus métricas y cumple objetivos.</Text>
          </View>
        );
      case 'Insignias':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insignias</Text>
            <Text style={styles.sectionText}>Desbloquea logros por salud y constancia.</Text>
          </View>
        );
      case 'Artículos':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Artículos</Text>
            <Text style={styles.sectionText}>Lee sobre salud, bienestar y ciencia.</Text>
          </View>
        );
      case 'Consejos':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consejos</Text>
            <Text style={styles.sectionText}>Tips prácticos para sentirte mejor.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabSelector}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.chip, activeTab === tab && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeTab === tab && styles.chipTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  tabSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    marginHorizontal: 4,
    marginVertical: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: theme.fontSizes.sm,
  },
  chipTextActive: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  section: {
    alignItems: 'center',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

