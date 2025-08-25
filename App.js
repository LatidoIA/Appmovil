// App.js
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, LogBox, Platform } from 'react-native';
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

try { const crash = require('./crash'); crash?.install?.(); } catch {}

LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'Cannot read property \'startSpeech\' of null'
]);

try { SplashScreen.preventAutoHideAsync(); } catch {}

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

function lazyScreen(loader) {
  return function Lazy(props) {
    const [C, setC] = React.useState(null);
    useEffect(() => {
      let alive = true;
      loader().then(m => { if (alive) setC(() => m.default || m); })
              .catch(e => console.debug('Lazy load error:', e?.message || e));
      return () => { alive = false; };
    }, []);
    if (!C) return null;
    return <C {...props} />;
  };
}

const SaludScreenLazy           = lazyScreen(() => import('./SaludScreen'));
const LatidoScreenLazy          = lazyScreen(() => import('./LatidoScreen'));
const HistoryScreenLazy         = lazyScreen(() => import('./HistoryScreen'));
const CuidadoPersonalScreenLazy = lazyScreen(() => import('./CuidadoPersonalScreen'));
const ProfileScreenLazy         = lazyScreen(() => import('./ProfileScreen'));
const StreakScreenLazy          = lazyScreen(() => import('./StreakScreen'));
const SettingsScreenLazy        = lazyScreen(() => import('./SettingsScreen'));
const MedicationsScreenLazy     = lazyScreen(() => import('./MedicationsScreen'));

import { useEmergency } from './useEmergency';

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
      if (status !== 'granted') console.debug('Notifs: permiso iOS no concedido');
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
            <View style={{ position: 'relative', marginHorizontal: theme.spacing.sm }}>
              <TouchableOpacity onPress={() => navigation.navigate('Streak')}>
                <Ionicons name="flame" size={24} color={theme.colors.accent} />
              </TouchableOpacity>
              {streakCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4
                  }}
                >
                  <CustomText style={{ color: '#fff', fontSize: 10, fontFamily: theme.typography.body.fontFamily }}>
                    {streakCount}
                  </CustomText>
                </View>
              )}
            </View>

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
      lazy
    >
      <Tab.Screen name="Salud"     component={SaludScreenLazy}           options={{ tabBarLabel: 'Salud' }} />
      <Tab.Screen name="Examen"    component={LatidoScreenLazy}          options={{ tabBarLabel: 'Examen' }} />
      <Tab.Screen name="Historial" component={HistoryScreenLazy}         options={{ tabBarLabel: 'Historial' }} />
      <Tab.Screen name="Cuidado"   component={CuidadoPersonalScreenLazy} options={{ tabBarLabel: 'Cuidado' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Montserrat_400Regular, Montserrat_500Medium, Montserrat_700Bold });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      const t = setTimeout(() => { setupNotificationsDeferred(); }, 1200);
      return () => clearTimeout(t);
    }
  }, [fontsLoaded]);

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

  if (!fontsLoaded) return null;

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
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main"        component={MainTabs} />
        <Stack.Screen name="Profile"     component={ProfileScreenLazy} />
        <Stack.Screen name="Streak"      component={StreakScreenLazy} />
        <Stack.Screen name="Settings"    component={SettingsScreenLazy} />
        <Stack.Screen name="Medications" component={MedicationsScreenLazy} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
