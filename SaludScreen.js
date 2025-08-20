// src/SaludScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  hcGetStatusDebug,
  isPermissionGranted,
  readTodaySteps,
  readLatestHeartRate,
} from './health';

export default function SaludScreen() {
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState('—');
  const [hasPerms, setHasPerms] = useState(false);
  const [steps, setSteps] = useState(0);
  const [bpm, setBpm] = useState(null);

  const refreshAll = useCallback(async () => {
    setBusy(true);
    try {
      const s = await hcGetStatusDebug();
      setStatusLabel(s.label || String(s.status));

      // Revisa permisos cada vez que la pestaña gana foco
      const granted = await isPermissionGranted();
      setHasPerms(!!granted);

      if (granted) {
        const [st, hr] = await Promise.all([
          readTodaySteps(),
          readLatestHeartRate(),
        ]);
        setSteps(st?.steps ?? 0);
        setBpm(hr?.bpm ?? null);
      }
    } catch (e) {
      console.debug('[SALUD] refreshAll error:', e?.message || e);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Al entrar a la pestaña, refresca estatus y datos
      refreshAll();
    }, [refreshAll])
  );

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      {busy ? (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12 }}>Actualizando Salud…</Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
            Lecturas recientes
          </Text>
          <Text style={{ opacity: 0.6, marginBottom: 16 }}>
            Estado: {statusLabel}
            {!hasPerms ? ' (sin permisos de lectura)' : ''}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 6 }}>
            Último pulso: {bpm != null ? `${bpm} bpm` : '—'}
          </Text>
          <Text style={{ fontSize: 16, marginBottom: 16 }}>
            Pasos (hoy): {steps ?? 0}
          </Text>

          <Button
            title="ACTUALIZAR DATOS"
            onPress={refreshAll}
          />
        </View>
      )}
    </View>
  );
}
