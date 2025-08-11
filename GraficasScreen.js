import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart, Grid } from 'react-native-svg-charts';
import { Text as SvgText } from 'react-native-svg';
import CustomText from './CustomText';
import theme from './theme';

const HISTORY_KEY = '@latido_history';

export default function GraficasScreen() {
  const [history, setHistory] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then(raw => raw && setHistory(JSON.parse(raw)))
      .catch(console.error);
  }, []);

  const lastSeven = history.slice(0, 7).reverse();
  const screenWidth = Dimensions.get('window').width - theme.spacing.md * 2;

  const labels = lastSeven.length === 7
    ? lastSeven.map(r => {
        const d = new Date(r.timestamp);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      })
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return `${d.getDate()}/${d.getMonth() + 1}`;
      });

  const allMetrics = [
    { key: 'bpm',     label: 'BPM',     data: lastSeven.map(r => r.bpm || 0),      color: theme.colors.accent },
    { key: 'glucosa', label: 'Glucosa', data: lastSeven.map(r => parseFloat(r.glucose) || 0), color: theme.colors.primary },
    { key: 'pasos',   label: 'Pasos',   data: lastSeven.map(r => r.steps || 0),     color: theme.colors.secondary },
    { key: 'sueño',   label: 'Sueño',   data: lastSeven.map(r => r.sleep || 0),     color: theme.colors.tertiary },
    { key: 'spo2',    label: 'SpO₂',    data: lastSeven.map(r => r.spo2 || 0),      color: theme.colors.error }
  ];

  const primaryMetrics = allMetrics.slice(0, 2);
  const secondaryMetrics = allMetrics.slice(2);

  const Decorator = ({ x, y, bandwidth, data }) => (
    data.map((value, index) => (
      <SvgText
        key={index}
        x={x(index) + bandwidth / 2}
        y={y(value) - 10}
        fontSize={12}
        fill={theme.colors.textPrimary}
        alignmentBaseline="middle"
        textAnchor="middle"
      >{value}</SvgText>
    ))
  );

  const renderChart = ({ key, label, data, color }) => (
    <View key={key} style={styles.chartWrapper}>
      <CustomText style={styles.chartTitle}>{label}</CustomText>
      <BarChart
        style={{ height: 200, width: screenWidth }}
        data={data}
        svg={{ fill: color }}
        contentInset={{ top: 20, bottom: 20 }}
      >
        <Grid />
        <Decorator />
      </BarChart>
      <View style={styles.labelsContainer}>
        {labels.map((l, i) => (
          <CustomText key={i} style={styles.label}>{l}</CustomText>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {primaryMetrics.map(renderChart)}

      {primaryMetrics.map(renderChart)}

      {showAll && secondaryMetrics.map(renderChart)}

      {secondaryMetrics.length > 0 && (
        <TouchableOpacity onPress={() => setShowAll(!showAll)} style={styles.moreButton}>
          <CustomText style={styles.moreText}>{showAll ? 'Ver menos métricas' : 'Ver más métricas'}</CustomText>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center'
  },
  chartWrapper: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center'
  },
  chartTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.subtitle.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  label: {
    fontSize: theme.fontSizes.xs || 10,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textSecondary
  },
  moreButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing.lg
  },
  moreText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.body.fontFamily
  }
});

