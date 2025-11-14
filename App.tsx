// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';

import AppTabs from './src/navigation/AppTabs';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {/* Mantenemos el contexto de auth para que useAuth no reviente */}
        <AuthProvider>
          <AppTabs />
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
