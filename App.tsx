// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import AppTabs from './src/navigation/AppTabs';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppTabs />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
