import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

// Evitamos que el splash se oculte solo
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
  });
  const [navReady, setNavReady] = useState(false);

  const onNavReady = useCallback(() => {
    setNavReady(true);
  }, []);

  useEffect(() => {
    // Ocultamos el splash UNA sola vez cuando: fuentes cargadas + navegación lista
    if (fontsLoaded && navReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, navReady]);

  return (
    <AuthProvider>
      <NavigationContainer onReady={onNavReady}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
