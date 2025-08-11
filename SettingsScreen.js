// SettingsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput, Platform, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import CustomText from './CustomText';
import theme from './theme';
import { useEmergency } from './hooks/useEmergency';

const SETTINGS_KEY = '@latido_settings';

export default function SettingsScreen() {
  const [alarmWebhook, setAlarmWebhook] = useState('');
  const [emergencyTestMode, setEmergencyTestMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hook de emergencia SOLO para pruebas simuladas desde esta pantalla
  const { testEmergencyFlow } = useEmergency({
    phoneNumber: null,
    whatsappNumber: null,
    whatsappText: 'Prueba de emergencia desde Configuración',
    alertSound: require('./assets/sounds/alert.wav'),
    tickSound: require('./assets/sounds/tick.wav'),
    testMode: true // fuerza modo simulado en este botón
  });

  // Cargar settings
  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const cfg = raw ? JSON.parse(raw) : {};
      setAlarmWebhook(cfg.alarmWebhook || '');
      setEmergencyTestMode(!!cfg.emergencyTestMode);
    } catch (e) {
      console.debug('Settings load error:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (next) => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      const cfg = { ...prev, ...next };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
      setAlarmWebhook(cfg.alarmWebhook || '');
      setEmergencyTestMode(!!cfg.emergencyTestMode);
      Alert.alert('Listo', 'Preferencias guardadas.');
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    }
  };

  const onToggleTestMode = async () => {
    const nextVal = !emergencyTestMode;
    await save({ emergencyTestMode: nextVal });
  };

  // Probar notificación local
  const testNotification = async () => {
    try {
      if (Platform.OS === 'ios') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Habilita notificaciones para poder probar.');
          return;
        }
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Prueba de notificación',
          body: 'Esta es una notificación de prueba.',
          data: { type: 'alarm', payload: { test: true } }
        },
        trigger: { seconds: 3, channelId: Platform.OS === 'android' ? 'alarms' : undefined }
      });
      Alert.alert('Programado', 'Enviaremos una notificación en 3 segundos.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo programar la notificación.');
    }
  };

  // Probar webhook remoto
  const testWebhook = async () => {
    const url = (alarmWebhook || '').trim();
    if (!url) {
      Alert.alert('Falta URL', 'Ingresa una URL para probar.');
      return;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          sentAt: new Date().toISOString(),
          note: 'Prueba manual desde SettingsScreen'
        })
      });
      if (res.ok) {
        Alert.alert('OK', 'Webhook respondió correctamente.');
      } else {
        Alert.alert('Atención', `Respuesta HTTP ${res.status}. Revisa la URL o el servidor.`);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo contactar el webhook.');
    }
  };

  // Guardar cambios
  const onSave = async () => {
    await save({ alarmWebhook: alarmWebhook.trim(), emergencyTestMode });
  };

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Configuración</CustomText>

      <View style={styles.card}>
        <CustomText style={styles.sectionTitle}>Emergencia</CustomText>

        <View style={styles.row}>
          <CustomText style={styles.label}>Modo prueba de emergencia</CustomText>
          <Switch value={!!emergencyTestMode} onValueChange={onToggleTestMode} />
        </View>
        <CustomText style={styles.help}>
          Si está activo, al presionar el botón de emergencia no se realiza llamada ni WhatsApp: solo se simula con una alerta.
        </CustomText>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={testEmergencyFlow} style={styles.secondaryBtn}>
            <Ionicons name="megaphone-outline" size={18} color={theme.colors.textPrimary} />
            <CustomText style={styles.btnTextAlt}>Probar emergencia (simulada)</CustomText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <CustomText style={styles.sectionTitle}>Alarmas</CustomText>

        <CustomText style={styles.label}>Webhook al abrir una alarma</CustomText>
        <TextInput
          value={alarmWebhook}
          onChangeText={setAlarmWebhook}
          placeholder="https://tu-servidor.com/webhook"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <CustomText style={styles.help}>
          Cuando tocas una notificación de alarma, la app enviará un POST a esta URL con detalles del evento.
        </CustomText>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={testNotification} style={styles.secondaryBtn}>
            <Ionicons name="notifications-outline" size={18} color={theme.colors.textPrimary} />
            <CustomText style={styles.btnTextAlt}>Probar notificación</CustomText>
          </TouchableOpacity>

          <TouchableOpacity onPress={testWebhook} style={styles.secondaryBtn}>
            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.textPrimary} />
            <CustomText style={styles.btnTextAlt}>Probar webhook</CustomText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionsMain}>
        <TouchableOpacity onPress={onSave} style={styles.primaryBtn} disabled={loading}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <CustomText style={styles.btnText}>Guardar</CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  title: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily
  },

  card: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },

  sectionTitle: { color: theme.colors.textPrimary, fontFamily: theme.typography.subtitle.fontFamily, marginBottom: 6 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  label: { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily, marginBottom: 4 },

  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    color: theme.colors.textPrimary
  },

  help: { marginTop: 4, color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily },

  actionsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm, flexWrap: 'wrap' },

  actionsMain: { marginTop: theme.spacing.lg, flexDirection: 'row', gap: theme.spacing.sm },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: theme.shape.borderRadius,
    borderWidth: 1, borderColor: theme.colors.outline
  },
  btnText: { color: '#fff', fontFamily: theme.typography.body.fontFamily },
  btnTextAlt: { color: theme.colors.textPrimary, fontFamily: theme.typTypography?.body?.fontFamily || theme.typography.body.fontFamily }
});

