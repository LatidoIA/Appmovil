import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';

type RootStackParamList = {
  Home: undefined;
  Details?: { id?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Pantallas placeholder (reemplázalas por las reales cuando quieras)
const HomeScreen = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Text>Home</Text>
  </View>
);
const DetailsScreen = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Text>Details</Text>
  </View>
);

// Tema con fondo blanco para evitar parpadeos/negro al arrancar
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#ffffff' },
};

type Props = { onReady?: () => void };

export default function RootNavigator({ onReady }: Props) {
  return (
    <NavigationContainer theme={theme} onReady={onReady}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Latido' }} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
