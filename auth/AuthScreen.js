import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';

// Si usas un <Text/> personalizado cámbialo aquí:
import CustomText from '../CustomText';
import theme from '../theme';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ onSignedIn }) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // Opcional: redirectUri: makeRedirectUri({ scheme: 'latido' }),
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      // Aquí puedes llamar tu backend o fetch de Google profile
      onSignedIn?.(response.authentication);
    }
  }, [response, onSignedIn]);

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
    elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, color: theme?.colors?.text ?? '#111' }
});
