import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import CustomText from '../CustomText';
import theme from '../theme';
import { useAuth } from './src/auth/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { signInWithGoogleResult, continueAsGuest } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // si no tienes iOS está ok undefined
    scopes: ['profile', 'email'],
    redirectUri: makeRedirectUri({ scheme: 'latido' }),
    useProxy: false,
  });

  useEffect(() => {
    (async () => {
      if (!response) return;
      if (response.type === 'dismiss' || response.type === 'cancel') return;

      if (response.type !== 'success') {
        Alert.alert('Google', 'No se pudo completar el inicio de sesión.');
        return;
      }

      const accessToken = response.authentication?.accessToken;
      if (!accessToken) {
        Alert.alert('Google', 'No se recibió accessToken.');
        return;
      }

      try {
        const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const info = await res.json();
        await signInWithGoogleResult({ idToken: null, info });
      } catch (e) {
        Alert.alert('Google', 'Error obteniendo tu perfil.');
      }
    })();
  }, [response, signInWithGoogleResult]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        disabled={!request}
        style={[styles.btn, !request && styles.btnDisabled]}
        onPress={() => promptAsync()}
      >
        <Ionicons name="logo-google" size={20} />
        <CustomText style={styles.btnText}>Continuar con Google</CustomText>
      </TouchableOpacity>

      <View style={{ height: 12 }} />

      <TouchableOpacity
        style={[styles.btn, styles.altBtn]}
        onPress={continueAsGuest}
      >
        <Ionicons name="arrow-forward-circle" size={20} />
        <CustomText style={styles.btnText}>Entrar sin cuenta</CustomText>
      </TouchableOpacity>

      {!request && (
        <>
          <View style={{ height: 16 }} />
          <ActivityIndicator />
          <CustomText style={{ marginTop: 8, opacity: 0.6 }}>
            Preparando autenticación…
          </CustomText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  btn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 3
  },
  altBtn: {
    backgroundColor: '#f5f5f5',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, color: theme?.colors?.text ?? '#111' }
});
