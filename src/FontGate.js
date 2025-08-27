// src/FontGate.js
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';

// Evita que el splash desaparezca antes de que carguen las fuentes
try {
  SplashScreen.preventAutoHideAsync();
} catch (_) {
  // noop (por si se llama dos veces en dev)
}

export default function FontGate({ children }) {
  const [loaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null; // mantiene el splash

  return children;
}
