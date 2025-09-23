import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import CustomText from '../CustomText';
import { useAuth } from '../auth/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AccountScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Tu cuenta</CustomText>
      <CustomText style={styles.subtitle}>{user?.email}</CustomText>
      <TouchableOpacity style={styles.btnSecondary} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} />
        <CustomText style={styles.btnText}>Cerrar sesión</CustomText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 6 },
  subtitle: { fontSize: 16, marginBottom: 20 },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  btnText: { fontSize: 16 },
});
