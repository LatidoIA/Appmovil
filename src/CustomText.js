import React from 'react';
import { Text } from 'react-native';
import theme from './theme';

export default function CustomText({ style, children, ...rest }) {
  return (
    <Text style={[{ color: theme?.colors?.text ?? '#111' }, style]} {...rest}>
      {children}
    </Text>
  );
}
