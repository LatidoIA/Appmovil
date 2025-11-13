// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth as firebaseAuth } from '../lib/firebase'; // ajusta si la ruta real es otra

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

  const handleSendReset = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Ingresa un correo válido para enviar el restablecimiento.');
      return;
    }
    try {
      setBusy(true);
      console.log('[LATIDO_DEBUG] sendPasswordResetEmail ->', email.trim());
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      Alert.alert('Enviado', 'Revisa tu correo para restablecer la contraseña.');
    } catch (err) {
      console.error('[LATIDO_DEBUG] sendPasswordResetEmail error', err);
      const msg = err?.message || 'No se pudo enviar el correo de restablecimiento.';
      Alert.alert('Error', msg);
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    if (!ensureValid()) return;
    try {
      if (!signInWithEmail || typeof signInWithEmail !== 'function') {
        Alert.alert('Error', 'Servicio de autenticación no disponible.');
        console.error('[LATIDO_DEBUG] signInWithEmail not available', signInWithEmail);
        return;
      }
      setBusy(true);
      console.log('[LATIDO_DEBUG] attempting signIn', email.trim());
      await signInWithEmail(email.trim(), password);
      console.log('[LATIDO_DEBUG] signIn success for', email.trim());
    } catch (err) {
      console.error('[LATIDO_DEBUG] login error', err);
      const code = (err?.code || err?.message || '').toString();

      if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('invalid-password')) {
        Alert.alert('Error', 'Contraseña incorrecta. ¿Olvidaste tu contraseña?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Enviar reset', onPress: () => handleSendReset() },
        ]);
        return;
      }

      // Si el error indica que el usuario no existe, sugerimos registrar
      if (code.includes('user-not-found')) {
        Alert.alert('Usuario no encontrado', 'No existe una cuenta con ese correo. ¿Deseas crear una?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Crear cuenta', onPress: () => register() },
        ]);
        return;
      }

      Alert.alert('Error', err?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    if (!ensureValid()) return;
    try {
      if (!registerWithEmail || typeof registerWithEmail !== 'function') {
        Alert.alert('Error', 'Servicio de registro no disponible.');
        console.error('[LATIDO_DEBUG] registerWithEmail not available', registerWithEmail);
        return;
      }
      setBusy(true);
      console.log('[LATIDO_DEBUG] attempting register', email.trim());
      await registerWithEmail(email.trim(), password);
      console.log('[LATIDO_DEBUG] register success for', email.trim());
      Alert.alert('Listo', 'Cuenta creada, ya estás dentro.');
    } catch (err) {
      console.error('[LATIDO_DEBUG] register error', err);
      const code = (err?.code || err?.message || '').toString();

      if (code.includes('email-already-in-use')) {
        Alert.alert('Error', 'El correo ya está en uso. ¿Deseas restablecer la contraseña o iniciar sesión?', [
          { text: 'Iniciar sesión', onPress: () => login() },
          { text: 'Enviar reset', onPress: () => handleSendReset() },
          { text: 'Cancelar', style: 'cancel' },
        ]);
        return;
      }

      Alert.alert('Error', err?.message ?? 'No se pudo crear la cuenta');
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
        editable={!busy}
      />
      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        editable={!busy}
      />

      <TouchableOpacity style={styles.btn} onPress={login} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Entrar</Text>}
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity onPress={register} disabled={busy} style={styles.linkBtn}>
          <Text style={styles.linkTxt}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSendReset} disabled={busy} style={styles.linkBtn}>
          <Text style={[styles.linkTxt, { textDecorationLine: 'underline' }]}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cnt: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  btn: { backgroundColor: '#111', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: '#fff', fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: 8 },
  linkTxt: { color: '#111' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }
});
