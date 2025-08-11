// src/screens/DashboardScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Platform } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { LineChart } from 'react-native-svg-charts';
import { Ionicons } from '@expo/vector-icons';
import theme from './theme';

// MetricCard component with icon and interactivity
function MetricCard({ title, value, iconName, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={iconName} size={28} color={theme.colors.primary} style={styles.cardIcon} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const [metric, setMetric] = useState('pulso');
  const [modalVisible, setModalVisible] = useState(false);
  const value = 80;
  const status = 'Normal';

  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = value / 200;
  const dashOffset = circumference * (1 - progress);

  const metrics = [
    { title: 'Presión arterial', value: '120/80 mmHg', icon: 'speedometer-outline' },
    { title: 'Oxígeno en sangre', value: '98 %', icon: 'water-outline' },
    { title: 'Pasos (30d)', value: '120k', icon: 'walk-outline' },
    { title: 'Sueño (30d)', value: '7h avg', icon: 'moon-outline' }
  ];

  const trendData = [60, 62, 59, 65, 63, 66, 64];

  const handleCardPress = title => {
    Alert.alert(title, `Detalles de ${title}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header with settings */}
      <View style={styles.header}>
        <Text style={styles.title}>Mi Salud</Text>
        <View style={styles.headerIcons}>
          <View style={styles.badgePro}>
            <Text style={styles.badgeText}>PRO</Text>
          </View>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for settings */}
      <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Ajustes</Text>
          {/* Add settings options here */}
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Metric selector */}
      <View style={styles.selectorRow}>
        {['pulso', 'puntuacion'].map(key => (
          <TouchableOpacity
            key={key}
            onPress={() => setMetric(key)}
            style={[styles.tab, metric === key && styles.tabActive]}
          >
            <Text style={metric === key ? styles.tabTextActive : styles.tabText}>
              {key === 'pulso' ? 'Pulso' : 'Puntuación'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Circular Chart */}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <Circle stroke={theme.colors.onSurfaceVariant} cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
          <Circle
            stroke={theme.colors.accent}
            cx={size/2}
            cy={size/2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size/2}, ${size/2}`}
          />
        </Svg>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.unit}>{metric === 'pulso' ? 'bpm' : 'pts'}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>

      {/* Mini trend graph */}
      <View style={styles.miniGraphContainer}>
        <LineChart
          style={styles.miniGraph}
          data={trendData}
          svg={{ stroke: theme.colors.primary, strokeWidth: 2 }}
          contentInset={{ top: theme.spacing.sm, bottom: theme.spacing.sm }}
        />
      </View>

      {/* Cards section using MetricCard */}
      <View style={styles.cardsContainer}>
        {metrics.map((item, idx) => (
          <MetricCard
            key={idx}
            title={item.title}
            value={item.value}
            iconName={item.icon}
            onPress={() => handleCardPress(item.title)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: theme.fontSizes.xl, color: theme.colors.onSurface, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: theme.spacing.sm },
  badgePro: { backgroundColor: theme.colors.accent, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.shape.borderRadius },
  badgeText: { color: theme.colors.surface, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
  modalTitle: { fontSize: theme.fontSizes.lg, fontWeight: 'bold', marginBottom: theme.spacing.md, color: theme.colors.onSurface },
  closeButton: { marginTop: theme.spacing.lg, padding: theme.spacing.sm, backgroundColor: theme.colors.primary, borderRadius: theme.shape.borderRadius },
  closeButtonText: { color: theme.colors.surface, fontWeight: 'bold' },
  selectorRow: { flexDirection: 'row', marginTop: theme.spacing.lg, alignSelf: 'center' },
  tab: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.shape.borderRadius, backgroundColor: theme.colors.surface },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: theme.fontSizes.md, color: theme.colors.onSurfaceVariant },
  tabTextActive: { fontSize: theme.fontSizes.md, color: theme.colors.surface },
  chartContainer: { marginTop: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' },
  valueContainer: { position: 'absolute', alignItems: 'center' },
  value: { fontSize: theme.fontSizes.xl * 1.5, fontWeight: 'bold', color: theme.colors.onSurface },
  unit: { fontSize: theme.fontSizes.md, color: theme.colors.onSurfaceVariant },
  status: { fontSize: theme.fontSizes.sm, color: theme.colors.accent, marginTop: theme.spacing.xs },
  miniGraphContainer: { height: 100, marginVertical: theme.spacing.lg },
  miniGraph: { flex: 1 },
  cardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.shape.borderRadius,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 }
    })
  },
  cardIcon: { marginBottom: theme.spacing.xs, alignSelf: 'center' },
  cardTitle: { fontSize: theme.fontSizes.md, color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.xs, textAlign: 'center' },
  cardValue: { fontSize: theme.fontSizes.lg, color: theme.colors.onSurface, fontWeight: 'bold', textAlign: 'center' }
});

