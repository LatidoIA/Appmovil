// auth/AuthScreen.js
import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import CustomText from '../CustomText';
import theme from '../theme';
import { useAuth } from './AuthContext';

function parseJwt(idToken) {
  try {
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      (typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary'))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function AuthScreen() {
  const { signInWithGoogleResult } = useAuth();

  const redirectUri = makeRedirectUri({ scheme: 'latido' });

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
    redirectUri,
    usePKCE: true,
  });

  useEffect(() => {
    (async () => {
      if (response?.type === 'success') {
        const idToken = response.authentication?.idToken;
        const info = parseJwt(idToken) || {};
        await signInWithGoogleResult({ idToken, info });
      }
    })();
  }, [response, signInWithGoogleResult]);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={{ width: 84, height: 84, marginBottom: 16 }} />
      <CustomText style={styles.title}>Bienvenido a Latido</CustomText>
      <CustomText style={styles.subtitle}>Inicia sesión para continuar</CustomText>

      <TouchableOpacity disabled={!request} onPress={() => promptAsync()} style={styles.googleBtn}>
        <CustomText style={styles.googleText}>Continuar con Google</CustomText>
      </TouchableOpacity>

      <CustomText style={styles.hint}>
        Al continuar aceptas nuestros Términos y Política de Privacidad.
      </CustomText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, alignItems:'center', justifyContent:'center', padding:16, backgroundColor: theme.colors.background },
  title: { fontSize: 22, color: theme.colors.textPrimary, marginBottom: 4, fontFamily: theme.typography.heading.fontFamily },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16, fontFamily: theme.typography.body.fontFamily },
  googleBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.outline,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, width: '80%', alignItems:'center',
  },
  googleText: { color: theme.colors.textPrimary, fontSize: 16, fontFamily: theme.typography.subtitle.fontFamily },
  hint: { marginTop: 16, color: theme.colors.textSecondary, fontSize: 12, textAlign:'center', width:'80%', fontFamily: theme.typography.body.fontFamily },
});
