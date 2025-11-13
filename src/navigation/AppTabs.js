// src/navigation/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

// Screens que ya existen en tu repo (rutas relativas a src/...)
import SaludScreen from '../screens/SaludScreen';
import LatidoScreen from '../screens/LatidoScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Salud"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let name = 'ellipse';
          if (route.name === 'Salud') name = 'heart-outline';
          else if (route.name === 'Latido') name = 'pulse-outline';
          else if (route.name === 'Historial') name = 'time-outline';
          else if (route.name === 'Perfil') name = 'person-outline';
          return <Ionicons name={name} size={size ?? 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Salud" component={SaludScreen} />
      <Tab.Screen name="Latido" component={LatidoScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
