// src/navigation/RootNavigator.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppTabs from './AppTabs'; // debe existir en src/navigation/AppTabs.js
import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../auth/AuthContext';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    console.log('[LATIDO_DEBUG] RootNavigator: auth loading...');
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando…</Text>
      </View>
    );
  }

  if (user) {
    console.log('[LATIDO_DEBUG] RootNavigator: user present -> navigating to AppTabs', user?.email);
    return (
      <NavigationContainer>
        <AppTabs />
      </NavigationContainer>
    );
  }

  console.log('[LATIDO_DEBUG] RootNavigator: no user -> showing Auth stack');
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* Si más adelante quieres agregar Register u otras pantallas de auth, añádelas acá */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
});
