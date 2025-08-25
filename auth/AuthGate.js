// auth/AuthGate.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './AuthContext';
import AuthScreen from './AuthScreen';
import theme from '../theme';

export default function AuthGate({ children }) {
  const { initializing, user } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  return children;
}
