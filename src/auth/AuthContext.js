import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Si todavía no tienes Firebase listo, esto no rompe:
let firebaseAuth: any = null;
try {
  // Quita si ya lo inicializas en otro archivo central (p.ej. src/firebase.ts)
  // y aquí solo importas ese auth.
  const { initializeApp } = require('firebase/app');
  const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } = require('firebase/auth');

  // TODO: rellena tu config real (o léela de Constants / process.env)
  const firebaseConfig = {
    apiKey: 'TODO',
    authDomain: 'TODO',
    projectId: 'TODO',
    appId: 'TODO',
  };

  const app = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(app);
} catch (e) {
  // En release sin config, evitamos crashear
  console.warn('Firebase auth no inicializado aún:', e?.message ?? e);
}

type User = { uid: string; email: string | null } | null;

type AuthValue = {
  user: User;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }
    const unsub = require('firebase/auth').onAuthStateChanged(firebaseAuth, (u: any) => {
      setUser(u ? { uid: u.uid, email: u.email } : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    signIn: async (email, password) => {
      if (!firebaseAuth) throw new Error('Auth no configurado');
      await require('firebase/auth').signInWithEmailAndPassword(firebaseAuth, email, password);
    },
    signUp: async (email, password) => {
      if (!firebaseAuth) throw new Error('Auth no configurado');
      await require('firebase/auth').createUserWithEmailAndPassword(firebaseAuth, email, password);
    },
    signOut: async () => {
      if (!firebaseAuth) throw new Error('Auth no configurado');
      await require('firebase/auth').signOut(firebaseAuth);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
