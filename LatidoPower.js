// LatidoPower.js

import React from 'react';
import { View, StyleSheet, UIManager, Platform } from 'react-native';
import CustomText from './CustomText';
import theme from './theme';

let SvgLib = null;
try {
  // Carga dinámica: si no existe react-native-svg, no rompe el bundle
  SvgLib = require('react-native-svg');
} catch (e) {
  SvgLib = null;
}

// Chequeo defensivo: ¿el nativo realmente tiene RNSVGCircle?
let HAS_SVG = false;
if (SvgLib) {
  try {
    const hasConfig =
      typeof UIManager.getViewManagerConfig === 'function'
        ? !!UIManager.getViewManagerConfig('RNSVGCircle')
        : !!UIManager['RNSVGCircle'];

    HAS_SVG = !!hasConfig;
  } catch (e) {
    HAS_SVG = false;
  }
}

export function LatidoPower({ score = 0, color }) {
  const safeScore = Math.min(Math.max(score, 0), 100);

  // 🔸 Si NO hay soporte nativo para SVG, no usamos Circle ni Svg.
  if (!HAS_SVG) {
    return (
      <View style={fallbackStyles.container}>
        <View style={fallbackStyles.badge}>
          <CustomText style={fallbackStyles.label}>Latido</CustomText>
          <CustomText style={fallbackStyles.score}>{safeScore}</CustomText>
        </View>
        <CustomText style={fallbackStyles.helper}>
          Vista simplificada (sin SVG nativo)
        </CustomText>
      </View>
    );
  }

  // 🔸 Si SÍ está disponible, usamos el gráfico circular como antes.
  const { Svg, G, Circle } = SvgLib;

  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = safeScore;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.outline}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color || theme.colors.primary}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </G>
      </Svg>
      <View style={styles.labelContainer}>
        <CustomText style={styles.label}>Latido</CustomText>
        <CustomText style={styles.score}>{safeScore}</CustomText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: theme.typography.body.fontSize,
  },
  score: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily,
    fontSize: theme.typography.heading.fontSize,
  },
});

const fallbackStyles = StyleSheet.create({
  container: {
    width: 140,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  badge: {
    width: 120,
    height: 80,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  label: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: theme.typography.body.fontSize,
  },
  score: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily,
    fontSize: theme.typography.heading.fontSize,
  },
  helper: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily,
  },
});
