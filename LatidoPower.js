// LatidoPower.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Circle, G, Svg } from 'react-native-svg';
import CustomText from './CustomText';
import theme from './theme';

export function LatidoPower({ score = 0, color }) {
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size/2}, ${size/2}`}>
          <Circle
            cx={size/2}
            cy={size/2}
            r={radius}
            stroke={theme.colors.outline}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size/2}
            cy={size/2}
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
        <CustomText style={styles.score}>{score}</CustomText>
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
    top: 0, left: 0, right: 0, bottom: 0,
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

