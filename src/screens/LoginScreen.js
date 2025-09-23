import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function LoginScreen() {
  const { signInWithEmail, registerWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const ensureValid = () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Ingresa un correo válido.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    return true;
  };

  const login = async () => {
    if (!ensureValid()) return;
    try {
      setBusy(true);
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    if (!ensureValid()) return;
    try {
      setBusy(true);
      await registerWithEmail(email.trim(), password);
      Alert.alert('Listo', 'Cuenta creada, ya estás dentro.');
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.cnt}>
      <Text style={styles.title}>Iniciar sesión</Text>

      <TextInput
        placeholder="Correo"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity style={styles.btn} onPress={login} disabled={busy}>
        {busy ? <ActivityIndicator /> : <Text style={styles.btnTxt}>Entrar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={register} disabled={busy} style={styles.linkBtn}>
        <Text style={styles.linkTxt}>Crear cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cnt: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  btn: { backgroundColor: '#111', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: '#fff', fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: 8 },
  linkTxt: { color: '#111' },
});
