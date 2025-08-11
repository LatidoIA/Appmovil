// AlarmasScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Switch, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const REMINDERS_KEY = '@latido_reminders';
const MEDS_KEY      = '@latido_meds';

export default function AlarmasScreen() {
  const [hydrationEnabled, setHydrationEnabled] = useState(false);
  const [movementEnabled, setMovementEnabled]   = useState(false);
  const [medsReminderEnabled, setMedsReminderEnabled] = useState(false);
  const [meds, setMeds]                         = useState([]);

  // 1. Carga inicial de ajustes y lista de medicamentos
  useEffect(() => {
    (async () => {
      const rawR = await AsyncStorage.getItem(REMINDERS_KEY);
      if (rawR) {
        const { hydration, movement, meds: medsReminder } = JSON.parse(rawR);
        setHydrationEnabled(hydration);
        setMovementEnabled(movement);
        setMedsReminderEnabled(medsReminder);
      }
      const rawM = await AsyncStorage.getItem(MEDS_KEY);
      if (rawM) setMeds(JSON.parse(rawM));
    })();
  }, []);

  // 2. Guarda ajustes generales
  const saveSettings = useCallback(async () => {
    await AsyncStorage.setItem(
      REMINDERS_KEY,
      JSON.stringify({
        hydration: hydrationEnabled,
        movement: movementEnabled,
        meds: medsReminderEnabled
      })
    );
  }, [hydrationEnabled, movementEnabled, medsReminderEnabled]);

  // 3. Helper para programar/cancelar recordatorios
  const scheduleReminder = useCallback(async (key, enabled, { content, trigger }) => {
    // Cancela previos con ese prefijo
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (let n of all) {
      if (n.identifier.startsWith(key)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    if (!enabled) return;
    try {
      await Notifications.scheduleNotificationAsync({ content, trigger });
    } catch {
      Alert.alert('Error', 'No se pudo programar la alarma');
    }
  }, []);

  // 4. Hidratación cada hora
  useEffect(() => {
    scheduleReminder(
      'hydration',
      hydrationEnabled,
      {
        content: { title: '🌊 Hidratación', body: 'Toma un vaso de agua.' },
        trigger: { hour: new Date().getHours() + 1, minute: 0, repeats: true }
      }
    );
    saveSettings();
  }, [hydrationEnabled, scheduleReminder, saveSettings]);

  // 5. Movimiento cada 2 horas
  useEffect(() => {
    scheduleReminder(
      'movement',
      movementEnabled,
      {
        content: { title: '🚶 Movimiento', body: 'Muévete un poco.' },
        trigger: { hour: new Date().getHours() + 2, minute: 0, repeats: true }
      }
    );
    saveSettings();
  }, [movementEnabled, scheduleReminder, saveSettings]);

  // 6. Recordatorio de Medicamentos a las 9 AM
  useEffect(() => {
    meds.forEach(m => {
      scheduleReminder(
        `meds-${m.id}`,
        medsReminderEnabled,
        {
          content: {
            title: '💊 Medicamento',
            body: `Es hora de tomar ${m.medName} — ${m.dosage}`
          },
          trigger: { hour: 9, minute: 0, repeats: true }
        }
      );
    });
    saveSettings();
  }, [meds, medsReminderEnabled, scheduleReminder, saveSettings]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Alarmas Inteligentes</Text>

      <View style={styles.item}>
        <Text style={styles.label}>Recordatorio de hidratación</Text>
        <Switch value={hydrationEnabled} onValueChange={setHydrationEnabled} />
      </View>

      <View style={styles.item}>
        <Text style={styles.label}>Recordatorio de movimiento</Text>
        <Switch value={movementEnabled} onValueChange={setMovementEnabled} />
      </View>

      <View style={styles.item}>
        <Text style={styles.label}>Recordatorio de medicamentos</Text>
        <Switch value={medsReminderEnabled} onValueChange={setMedsReminderEnabled} />
      </View>

      <Text style={[styles.subheader, { marginTop: 20 }]}>
        Medicamentos registrados ({meds.length})
      </Text>
      {meds.length === 0 ? (
        <Text style={styles.note}>No hay medicamentos registrados.</Text>
      ) : (
        meds.map(m => (
          <View key={m.id} style={styles.medRow}>
            <Text style={styles.medText}>{m.medName} — {m.dosage}</Text>
          </View>
        ))
      )}

      <Text style={styles.note}>
        Hidratación: cada hora ↻  
        Movimiento: cada 2 horas ↻  
        Medicamentos: 9 AM diaria ↻
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fafafa' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 16, color: '#333' },
  subheader: { fontSize: 18, fontWeight: '600' },
  medRow: { paddingVertical: 6 },
  medText: { fontSize: 14, color: '#555' },
  note: { fontSize: 12, color: '#666', marginTop: 12 }
});
