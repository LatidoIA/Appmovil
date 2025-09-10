import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomText from '../CustomText';
import theme from '../theme';
import { useAuth } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation }) {
  const { signInWithGoogleResult } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // scopes mínimas
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    (async () => {
      if (response?.type !== 'success') return;
      const accessToken = response.authentication?.accessToken;
      if (!accessToken) return;

      try {
        const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const info = await res.json();
        await signInWithGoogleResult({ idToken: null, info });
        // volver a la cuenta
        navigation.goBack();
      } catch (e) {
        // si falla el perfil, al menos cerrar el modal
        navigation.goBack();
      }
    })();
  }, [response]);

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Accede con Google</CustomText>

      <TouchableOpacity
        disabled={!request}
        style={[styles.btn, !request && styles.btnDisabled]}
        onPress={() => promptAsync({ useProxy: false, showInRecents: true })}
      >
        <Ionicons name="logo-google" size={20} />
        <CustomText style={styles.btnText}>Continuar con Google</CustomText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
        <CustomText style={{ textDecorationLine: 'underline' }}>Seguir sin registrarme</CustomText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 18, marginBottom: 16, color: theme?.colors?.text ?? '#111' },
  btn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, color: theme?.colors?.text ?? '#111' },
  link: { marginTop: 16 },
});
