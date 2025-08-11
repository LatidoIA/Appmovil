// components/CustomText.js
import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import theme from './theme';

export default function CustomText({ style, ...props }) {
  return <RNText style={[styles.text, style]} {...props} />;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textPrimary,
  },
});
