// src/navigation/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// 📍 Pantallas reales que SÍ existen en la raíz del proyecto
import SaludScreen from '../../SaludScreen';
import LatidoScreen from '../../LatidoScreen';
import HistoryScreen from '../../HistoryScreen';
import CuidadoPersonalScreen from '../../CuidadoPersonalScreen';
import CuidadorScreen from '../../CuidadorScreen';
import AjustesScreen from '../../AjustesScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Salud" // 👉 Arranca en SaludScreen después del login
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#111',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';

          switch (route.name) {
            case 'Salud':
              iconName = 'heart-outline';
              break;
            case 'Latido':
              iconName = 'pulse-outline';
              break;
            case 'Historial':
              iconName = 'time-outline';
              break;
            case 'Cuidado':
              iconName = 'body-outline';
              break;
            case 'Cuidador':
              iconName = 'people-outline';
              break;
            case 'Ajustes':
              iconName = 'settings-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Salud" component={SaludScreen} />
      <Tab.Screen name="Latido" component={LatidoScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen
        name="Cuidado"
        component={CuidadoPersonalScreen}
        options={{ title: 'Cuidado personal' }}
      />
      <Tab.Screen name="Cuidador" component={CuidadorScreen} />
      <Tab.Screen name="Ajustes" component={AjustesScreen} />
    </Tab.Navigator>
  );
}
