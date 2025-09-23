// src/auth/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,   // <- renombrado
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo(() => {
    const _login = (email, password) =>
      signInWithEmailAndPassword(auth, email, password);
    const _register = (email, password) =>
      createUserWithEmailAndPassword(auth, email, password);
    const _logout = () => firebaseSignOut(auth);

    return {
      user,
      loading,
      // nombres “nuevos” que usan tus pantallas
      signInWithEmail: _login,
      registerWithEmail: _register,
      signOut: _logout,
      // y dejamos también los antiguos por compatibilidad
      login: _login,
      register: _register,
      logout: _logout,
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
