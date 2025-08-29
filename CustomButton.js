// CustomButton.js
import React from 'react';
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomText from './CustomText';
import theme from './theme';

/**
 * Props:
 * - title?: string
 * - children?: React.Node
 * - onPress?: () => void
 * - disabled?: boolean
 * - loading?: boolean
 * - style?: ViewStyle
 * - textStyle?: TextStyle
 * - useGradient?: boolean (default true)
 * - gradientColors?: [string, string] (default [theme.colors.primary, theme.colors.accent])
 * - start?: { x: number, y: number } (default {x:0, y:0})
 * - end?: { x: number, y: number } (default {x:1, y:1})
 */
export default function CustomButton({
  title,
  children,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  useGradient = true,
  gradientColors = [theme.colors.primary, theme.colors.accent],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 }
}) {
  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : title ? (
        <CustomText style={[styles.text, textStyle]}>{title}</CustomText>
      ) : (
        children
      )}
    </>
  );

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.touch, isDisabled && styles.touchDisabled, style]}
    >
      {useGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={start}
          end={end}
          style={[styles.inner, isDisabled && styles.innerDisabled]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.inner, styles.solid, isDisabled && styles.innerDisabled]}>
          {content}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: {
    borderRadius: 14,
    overflow: 'hidden'
  },
  touchDisabled: {
    opacity: 0.6
  },
  inner: {
    minHeight: 48,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14
  },
  innerDisabled: {
    // el gradiente ya baja opacidad via touchDisabled; aquí solo mantenemos contraste
  },
  solid: {
    backgroundColor: theme.colors.primary
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontFamily: theme.typography.button?.fontFamily || theme.typography.body.fontFamily
  }
});
