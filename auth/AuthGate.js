import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './src/auth/AuthContext';
import AuthScreen from './AuthScreen';

export default function AuthGate({ children }) {
  const { loading, isSignedIn } = useAuth();

  if (loading) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isSignedIn) return <AuthScreen />;
  return children;
}
