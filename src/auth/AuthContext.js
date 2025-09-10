import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signInWithGoogleResult = async ({ idToken = null, info = null }) => {
    // Guarda lo esencial del perfil básico de Google (si vino)
    if (info) {
      setUser({
        id: info.id,
        email: info.email,
        name: info.name,
        picture: info.picture,
      });
      return;
    }
    // fallback mínimo si no vino info
    setUser({ id: 'local', email: null, name: 'Usuario' });
  };

  const signOut = () => setUser(null);

  const value = useMemo(() => ({ user, signInWithGoogleResult, signOut }), [user]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
