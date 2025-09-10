import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { AuthProvider, useAuth } from './src/auth/AuthContext';

// Mantener splash visible hasta que ocultemos manualmente
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();

function LoaderScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

/**
 * Componente que representa tu app “real”.
 * Intentamos importar tu navegador principal si existe.
 * - ./src/MainApp
 * - ./src/navigation/AppNavigator
 * Si ninguno existe, mostramos un placeholder (pero no bloquea).
 */
function MainAppShim() {
  // @ts-ignore
  let Impl: React.ComponentType<any> | null = null;
  try {
    // @ts-ignore
    Impl = require('./src/MainApp').default || null;
  } catch {}
  if (!Impl) {
    try {
      // @ts-ignore
      Impl = require('./src/navigation/AppNavigator').default || null;
    } catch {}
  }
  if (Impl) return <Impl />;

  // Placeholder visible para no dejar la pantalla en blanco
  return <LoaderScreen />;
}

function RootNavigator() {
  const { user, guest, isLoading } = useAuth();

  if (isLoading) return <LoaderScreen />;

  // Si hay usuario o invitado, vamos directo a la app.
  const isInApp = !!user || guest;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isInApp ? (
        <Stack.Screen name="Main" component={MainAppShim} />
      ) : (
        <Stack.Screen
          name="Auth"
          // @ts-ignore
          getComponent={() => require('./src/auth/AuthScreen').default}
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  // Carga de fuentes (lo más común que retrasa UI)
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
  });

  // Marcador de “app lista” (fonts, cualquier bootstrap)
  const appIsReady = useMemo(() => fontsLoaded, [fontsLoaded]);

  const onNavReady = useCallback(async () => {
    // Ocultamos splash en el momento más seguro: cuando la navegación está lista
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [appIsReady]);

  // Si aún no está lista, no renderizamos navegación (queda el splash)
  if (!appIsReady) {
    return null; // splash sigue visible
  }

  return (
    <AuthProvider>
      <NavigationContainer
        onReady={onNavReady}
        linking={{
          prefixes: ['latido://'],
          config: { screens: { Auth: 'auth', Main: 'main' } },
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
