// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from './src/auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';

type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

type Props = { onReady?: () => void };

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home</Text>
    </View>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={Home} />
    </Tab.Navigator>
  );
}

export default function RootNavigator({ onReady }: Props) {
  const { user, loading } = useAuth();

  // Mientras restauramos sesión desde Firebase (persistencia), muestra loader
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer
      onReady={onReady}
      theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'white' } }}
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
