import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText'; // ajusta el path si cambia
import theme from '../theme';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation }) {
  const goHome = () => navigation.replace('Home'); // o la screen principal

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Latido</CustomText>

      <TouchableOpacity style={styles.primaryBtn} onPress={goHome}>
        <Ionicons name="log-in-outline" size={18} color="#fff" />
        <CustomText style={styles.primaryText}>Continuar</CustomText>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.googleBtn, { opacity: 0.4 }]} disabled>
        <Ionicons name="logo-google" size={18} color="#000" />
        <CustomText style={styles.googleText}>Google (próximamente)</CustomText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, marginBottom: 32, color: '#111', fontFamily: theme?.typography?.subtitle?.fontFamily },
  primaryBtn: { flexDirection: 'row', gap: 8, backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginBottom: 12 },
  primaryText: { color: '#fff', fontWeight: '600' },
  googleBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  googleText: { color: '#111', fontWeight: '600' }
});
