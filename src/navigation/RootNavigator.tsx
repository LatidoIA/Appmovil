// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

type RootStackParamList = { App: undefined; Auth: undefined };

const Stack = createStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18 }}>Inicio</Text>
    </View>
  );
}

function ProfileScreen() {
  const { user, signOut } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 16 }}>{user?.name ?? 'Sin usuario'}</Text>
      <Button title="Cerrar sesión" onPress={signOut} />
    </View>
  );
}

function AppTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />
        }}
      />
    </Tabs.Navigator>
  );
}

function LoginScreen() {
  // Botón “mock” para probar el flujo; reemplaza con tu Google Sign-In cuando quieras
  const { signInWithGoogleResult } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button
        title="Entrar (demo)"
        onPress={() =>
          signInWithGoogleResult({
            info: { id: 'demo', email: 'demo@latido.app', name: 'Demo' }
          })
        }
      />
    </View>
  );
}

export default function RootNavigator() {
  const { user } = useAuth();
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: 'white' }
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="App" component={AppTabs} />
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
