// auth/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_KEY = '@auth_user_v1';
const PROFILE_KEY   = '@latido_profile';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // {sub, name, email, picture}
  const [loading, setLoading] = useState(true);
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);

  const computeCompleted = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) { setIsProfileCompleted(false); return; }
      const p = JSON.parse(raw);
      // Regla de completitud: flag o campos esenciales
      const ok = !!(p?.profileCompleted || (p?.name && p?.email));
      setIsProfileCompleted(!!ok);
    } catch {
      setIsProfileCompleted(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {}
      await computeCompleted();
      setLoading(false);
    })();
  }, [computeCompleted]);

  const signInWithGoogleResult = useCallback(async ({ idToken, info }) => {
    // Guardamos SOLO perfil (no almacenamos el idToken para simplificar y evitar dependencias)
    const profile = {
      sub: info?.sub || null,
      name: info?.name || info?.given_name || '',
      email: info?.email || '',
      picture: info?.picture || null,
    };
    setUser(profile);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));

    // Prefill de @latido_profile si faltan name/email
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      const merged = {
        ...prev,
        name: prev?.name || profile.name,
        email: prev?.email || profile.email,
        avatar: prev?.avatar || profile.picture || null,
      };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    } catch {}

    await computeCompleted();
  }, [computeCompleted]);

  const signOut = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    // No borramos @latido_profile para preservar datos del usuario
    await computeCompleted();
  }, [computeCompleted]);

  const refreshProfileStatus = useCallback(async () => {
    await computeCompleted();
  }, [computeCompleted]);

  return (
    <AuthCtx.Provider value={{
      user,
      isSignedIn: !!user,
      isProfileCompleted,
      loading,
      signInWithGoogleResult,
      signOut,
      refreshProfileStatus,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
