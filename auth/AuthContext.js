// auth/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ SecureStore opcional (no rompe el bundler si no está instalado)
let SecureStore = null;
try {
  // Si el proyecto tiene expo-secure-store, lo usamos
  SecureStore = require('expo-secure-store');
} catch { /* sin dependencia, usamos AsyncStorage como fallback */ }

const AUTH_USER_KEY = '@auth_user_v1';
const AUTH_TOKEN_KEY = 'auth_google_id_token_v1';
const PROFILE_KEY = '@latido_profile';
const PROFILE_COMPLETED_KEY = '@profile_completed_v1';

const AuthContext = createContext({
  user: null,
  initializing: true,
  signInWithGoogleResult: async (_payload) => {},
  signOut: async () => {},
  markProfileCompleted: async () => {},
  isProfileCompleted: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);

  // Cargar sesión persistida
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
        const u = raw ? JSON.parse(raw) : null;
        setUser(u);
      } catch {}
      try {
        const flag = await AsyncStorage.getItem(PROFILE_COMPLETED_KEY);
        setIsProfileCompleted(flag === '1');
      } catch {}
      setInitializing(false);
    })();
  }, []);

  const signInWithGoogleResult = useCallback(async ({ idToken, info }) => {
    // info: { sub, email, name, picture }
    const u = {
      id: info?.sub || null,
      email: info?.email || null,
      name: info?.name || null,
      photoURL: info?.picture || null,
      provider: 'google',
    };
    try {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));

      // Guarda el token de forma segura si está SecureStore; si no, en AsyncStorage (MVP)
      if (idToken) {
        if (SecureStore?.setItemAsync) {
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, idToken);
        } else {
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, idToken);
        }
      }

      // Inicializa perfil si no existe
      const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (!rawProfile) {
        const baseProfile = {
          name: u.name || '',
          email: u.email || '',
          emergencyContact: null,
          emergencyName: '',
        };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(baseProfile));
      }
      setUser(u);
    } catch {}
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      if (SecureStore?.deleteItemAsync) {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      } else {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      }
      // No borramos PROFILE_KEY; el usuario puede volver a iniciar sesión y mantener datos locales.
    } catch {}
    setUser(null);
    setIsProfileCompleted(false);
  }, []);

  const markProfileCompleted = useCallback(async () => {
    try { await AsyncStorage.setItem(PROFILE_COMPLETED_KEY, '1'); } catch {}
    setIsProfileCompleted(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, signInWithGoogleResult, signOut, markProfileCompleted, isProfileCompleted }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
