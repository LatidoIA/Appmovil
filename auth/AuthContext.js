import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type BasicUser = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
} | null;

type AuthState = {
  user: BasicUser;
  guest: boolean;
  isLoading: boolean;
  signInWithGoogleResult: (data: { idToken: string | null; info?: any }) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null,
  guest: false,
  isLoading: true,
  signInWithGoogleResult: async () => {},
  continueAsGuest: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<BasicUser>(null);
  const [guest, setGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [u, g] = await Promise.all([
          AsyncStorage.getItem('@auth_user'),
          AsyncStorage.getItem('@auth_guest'),
        ]);
        if (u) setUser(JSON.parse(u));
        if (g === '1') setGuest(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signInWithGoogleResult = useCallback(async ({ idToken, info }) => {
    // Si más adelante necesitas enviar idToken a tu backend, aquí lo tienes.
    const mapped: BasicUser = info
      ? { id: info.id, email: info.email, name: info.name, picture: info.picture }
      : null;

    setUser(mapped);
    setGuest(false);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(mapped));
    await AsyncStorage.removeItem('@auth_guest');
  }, []);

  const continueAsGuest = useCallback(async () => {
    setGuest(true);
    setUser(null);
    await AsyncStorage.setItem('@auth_guest', '1');
    await AsyncStorage.removeItem('@auth_user');
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setGuest(false);
    await AsyncStorage.multiRemove(['@auth_user', '@auth_guest']);
  }, []);

  const value = useMemo(
    () => ({ user, guest, isLoading, signInWithGoogleResult, continueAsGuest, signOut }),
    [user, guest, isLoading, signInWithGoogleResult, continueAsGuest, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
