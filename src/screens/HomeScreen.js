import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomText from '../CustomText';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Latido</CustomText>
      <CustomText>Bienvenido. Esta es tu app, sin bloqueos ni onboarding.</CustomText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});
