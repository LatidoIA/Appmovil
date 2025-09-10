import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import CustomText from '../CustomText';
import { useAuth } from '../auth/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AccountScreen({ navigation }) {
  const { user, signOut } = useAuth();

  if (user) {
    return (
      <View style={styles.container}>
        <CustomText style={styles.title}>Tu cuenta</CustomText>
        <CustomText style={styles.subtitle}>{user?.name ?? user?.email}</CustomText>
        <TouchableOpacity style={styles.btnSecondary} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} />
          <CustomText style={styles.btnText}>Cerrar sesión</CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Acceso</CustomText>
      <CustomText style={{ marginBottom: 16 }}>
        Puedes usar la app sin registrarte. Si quieres, inicia sesión:
      </CustomText>
      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={() => navigation.navigate('Auth')}
      >
        <Ionicons name="logo-google" size={18} />
        <CustomText style={styles.btnText}>Iniciar sesión con Google</CustomText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 6 },
  subtitle: { fontSize: 16, marginBottom: 20 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, elevation: 3, alignSelf: 'flex-start',
  },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  btnText: { fontSize: 16 },
});
