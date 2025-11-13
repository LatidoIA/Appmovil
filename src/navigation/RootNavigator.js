// src/navigation/RootNavigator.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppTabs from './AppTabs'; // asumes que existe src/navigation/AppTabs.js
import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen'; // si lo usas en algun flujo
import { useAuth } from '../auth/AuthContext';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  // Evita flicker: muestra loader mientras auth inicializa
  if (loading) {
    console.log('[LATIDO_DEBUG] RootNavigator: auth loading...');
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando…</Text>
      </View>
    );
  }

  // Si hay user -> directo a la app (AppTabs)
  if (user) {
    console.log('[LATIDO_DEBUG] RootNavigator: user present -> navigating to AppTabs', user?.email);
    return (
      <NavigationContainer>
        <AppTabs />
      </NavigationContainer>
    );
  }

  // Sin user -> pila pública (login / register / etc.)
  console.log('[LATIDO_DEBUG] RootNavigator: no user -> showing Auth stack');
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* Si tenés pantallas de registro o setup, agrégalas acá */}
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
});
