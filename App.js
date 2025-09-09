// App.js
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_700Bold
} from '@expo-google-fonts/montserrat';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import CustomText from './CustomText';
import theme from './theme';
import CrashCatcher from './CrashCatcher';

// 🔒 Auth (opcional, pero no bloquea render)
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthScreen from './auth/AuthScreen';

// ✅ Importes ESTÁTICOS (no lazy)
import SaludScreen from './SaludScreen';
import LatidoScreen from './LatidoScreen';
import HistoryScreen from './HistoryScreen';
import CuidadoPersonalScreen from './CuidadoPersonalScreen';
import ProfileScreen from './ProfileScreen';
import StreakScreen from './StreakScreen';
import SettingsScreen from './SettingsScreen';
import MedicationsScreen from './MedicationsScreen';

import { useEmergency } from './useEmergency';

// NO llamar preventAutoHideAsync

const SETTINGS_KEY = '@latido_settings';
const STREAK_CNT  = '@streak_count';
const STREAK_LAST = '@streak_last_open';
const STREAK_BEST = '@streak_best';

function dateOnlyStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function daysBetweenUTC(aStr, bStr) {
  const [ay, am, ad] = aStr.split('-').map(n => parseInt(n, 10));
  const [by, bm, bd] = bStr.split('-').map(n => parseInt(n, 10));
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / (24 * 3600 * 1000));
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

async function setupNotificationsDeferred() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false
      })
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarms', {
        name: 'Alarmas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C'
      });
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') console.debug('Notifs iOS no concedido');
    }
  } catch (e) {
    console.debug('setupNotifications error:', e?.message || e);
  }
}

function MainTabs() {
  const navigation = useNavigation();
  const [profile, setProfile] = React.useState({ emergencyContact: null, emergencyName: '' });
  const [streakCount, setStreakCount] = React.useState(0);
  const [settings, setSettings] = React.useState({ emergencyTestMode: false });

  useEffect(() => {
    AsyncStorage.getItem('@latido_profile')
      .then(raw => { if (raw) setProfile(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const loadStreak = React.useCallback(async () => {
    try {
      const cnt = await AsyncStorage.getItem(STREAK_CNT);
      setStreakCount(parseInt(cnt || '0', 10) || 0);
    } catch (e) { console.debug('Load streak badge error:', e?.message || e); }
  }, []);

  const loadSettings = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const cfg = raw ? JSON.parse(raw) : {};
      setSettings({ emergencyTestMode: !!cfg.emergencyTestMode });
    } catch (e) {
      console.debug('Load settings error:', e?.message || e);
      setSettings({ emergencyTestMode: false });
    }
  }, []);

  useEffect(() => {
    loadStreak();
    loadSettings();
    const unsub = navigation.addListener?.('focus', () => {
      loadStreak();
      loadSettings();
    });
    return unsub;
  }, [navigation, loadStreak, loadSettings]);

  const { triggerEmergency } = useEmergency({
    phoneNumber: profile.emergencyContact,
    whatsappNumber: profile.emergencyContact,
    whatsappText: `${profile.emergencyName}, necesito ayuda.`,
    alertSound: require('./alert.wav'),
    tickSound: require('./tick.wav'),
    testMode: settings.emergencyTestMode
  });

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerTitle: '',
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: theme.spacing.md }}>
            <TouchableOpacity onPress={() => navigation.navigate('Streak')} style={{ marginHorizontal: theme.spacing.sm }}>
              <Ionicons name="flame" size={24} color={theme.colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={triggerEmergency} style={{ marginHorizontal: theme.spacing.sm }}>
              <Ionicons name="warning" size={24} color={theme.colors.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginHorizontal: theme.spacing.sm }}>
              <Ionicons name="person-circle" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginHorizontal: theme.spacing.sm }}>
              <Ionicons name="settings" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ),
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Salud':     iconName = 'heart-circle';    break;
            case 'Examen':    iconName = 'heart-outline';   break;
            case 'Historial': iconName = 'time-outline';    break;
            case 'Cuidado':   iconName = 'bandage-outline'; break;
            default:          iconName = 'ellipse';         break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          marginBottom: 4,
        },
        tabBarStyle: { backgroundColor: theme.colors.surface },
      })}
      lazy={false} // 👈 sin lazy para evitar pantallas en blanco
    >
      <Tab.Screen name="Salud"     component={SaludScreen}           options={{ tabBarLabel: 'Salud' }} />
      <Tab.Screen name="Examen"    component={LatidoScreen}          options={{ tabBarLabel: 'Examen' }} />
      <Tab.Screen name="Historial" component={HistoryScreen}         options={{ tabBarLabel: 'Historial' }} />
      <Tab.Screen name="Cuidado"   component={CuidadoPersonalScreen} options={{ tabBarLabel: 'Cuidado' }} />
    </Tab.Navigator>
  );
}

/** Pantalla de entrada: login Google o saltar */
function EntryScreen({ navigation }) {
  const { signInWithGoogleResult } = useAuth();

  return (
    <View style={{ flex:1, backgroundColor: theme.colors.background, alignItems:'center', justifyContent:'center', padding:24 }}>
      <CustomText style={{ color: theme.colors.textPrimary, fontSize: 22, marginBottom: 16 }}>
        Bienvenido a Latido
      </CustomText>

      {/* Botón Google (usa tu AuthScreen existente) */}
      <View style={{ width:'100%', maxWidth:320, marginBottom: 10 }}>
        <AuthScreen onSignedIn={(auth) => {
          // si quieres, aquí podrías pedir perfil a Google y llamar signInWithGoogleResult
          signInWithGoogleResult({ idToken: auth?.idToken, info: {} }).catch(()=>{});
          navigation.replace('Main');
        }} />
      </View>

      {/* Saltar login */}
      <TouchableOpacity
        onPress={() => navigation.replace('Main')}
        style={{ marginTop: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.colors.surface }}
      >
        <CustomText style={{ color: theme.colors.textPrimary }}>Continuar sin cuenta</CustomText>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold
  });

  // Oculta el splash sí o sí a los 3s
  useEffect(() => {
    const t = setTimeout(() => { SplashScreen.hideAsync().catch(() => {}); }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Si las fuentes cargan, ocúltalo al tiro
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Notificaciones diferidas
  useEffect(() => {
    const t = setTimeout(() => { setupNotificationsDeferred(); }, 1200);
    return () => clearTimeout(t);
  }, []);

  // Streak
  useEffect(() => {
    (async () => {
      const today = dateOnlyStr(new Date());
      try {
        const [cr, lr, br] = await Promise.all([
          AsyncStorage.getItem(STREAK_CNT),
          AsyncStorage.getItem(STREAK_LAST),
          AsyncStorage.getItem(STREAK_BEST)
        ]);

        let cnt  = parseInt(cr || '0', 10) || 0;
        let best = parseInt(br || '0', 10) || 0;
        const last = lr || null;

        if (!last) cnt = 1;
        else {
          const diff = daysBetweenUTC(last, today);
          if (diff === 1) cnt += 1;
          else if (diff > 1) cnt = 1;
        }
        if (cnt > best) best = cnt;

        await AsyncStorage.multiSet([
          [STREAK_CNT,  String(cnt)],
          [STREAK_LAST, today],
          [STREAK_BEST, String(best)]
        ]);
      } catch (e) {
        console.debug('Streak auto-update error:', e?.message || e);
      }
    })();
  }, []);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.outline
    }
  };

  return (
    <AuthProvider>
      <CrashCatcher>
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* 👇 Arranca en entrada (login / saltar) */}
            <Stack.Screen name="Entry"       component={EntryScreen} />
            <Stack.Screen name="Main"        component={MainTabs} />
            <Stack.Screen name="Profile"     component={ProfileScreen} />
            <Stack.Screen name="Streak"      component={StreakScreen} />
            <Stack.Screen name="Settings"    component={SettingsScreen} />
            <Stack.Screen name="Medications" component={MedicationsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </CrashCatcher>
    </AuthProvider>
  );
}
