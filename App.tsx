// 👇 Debe ser la primera importación
import 'react-native-gesture-handler';

import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/auth/AuthContext';

// Evitamos que el splash se oculte automáticamente
SplashScreen.preventAutoHideAsync().catch(() => null);

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
  });
  const [navReady, setNavReady] = React.useState(false);

  // Oculta el splash SOLO cuando: fuentes cargadas + navegación lista
  React.useEffect(() => {
    const hide = async () => {
      if (fontsLoaded && navReady) {
        await SplashScreen.hideAsync();
      }
    };
    hide();
  }, [fontsLoaded, navReady]);

  // Mientras no cargan las fuentes, mantenemos el splash en pantalla
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator onReady={() => setNavReady(true)} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
