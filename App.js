import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/auth/AuthContext';
import AppTabs from './src/navigation/AppTabs';

// evitamos que el splash se oculte solo
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Carga de fuentes opcional (si usas @expo-google-fonts u otras)
        // Si no tienes fuentes personalizadas, igual marcamos listo.
        await Font.loadAsync({});
      } catch (_) {
        // no romper por error de fuentes
      } finally {
        setAppReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    // Oculta el splash SOLO cuando app y navegación estén listas
    if (appReady && navReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady, navReady]);

  return (
    <AuthProvider>
      <NavigationContainer onReady={() => setNavReady(true)}>
        <StatusBar barStyle="dark-content" />
        <AppTabs />
      </NavigationContainer>
    </AuthProvider>
  );
}
