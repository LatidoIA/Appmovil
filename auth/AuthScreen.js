import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../CustomText';
import theme from '../theme';
import { useAuth } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { signInWithGoogleResult } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    (async () => {
      if (response?.type !== 'success') return;
      const accessToken = response.authentication?.accessToken;
      if (!accessToken) return;

      // Perfil básico de Google
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const info = await res.json();
      await signInWithGoogleResult({ idToken: null, info });
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, color: theme?.colors?.text ?? '#111' }
});
