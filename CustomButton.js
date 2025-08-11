// components/CustomButton.js

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomText from './CustomText';
import theme from './theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
};

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}: Props) {
  const isPrimary = variant === 'primary';

  const content = (
    <CustomText
      style={[
        styles.text,
        isPrimary ? styles.textPrimary : styles.textOutline,
        textStyle,
      ]}
    >
      {title}
    </CustomText>
  );

  if (isPrimary) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[styles.button, disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={['#009E8A', '#00C2A7']}
          start={[0, 0]}
          end={[1, 0]}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
      style={[styles.button, styles.outline, disabled && styles.disabled, style]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.shape.borderRadius,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    width: '100%',
    borderRadius: theme.shape.borderRadius,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.typography.subtitle.fontFamily,
    fontSize: theme.typography.subtitle.fontSize,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: theme.colors.primary,
  },
});
