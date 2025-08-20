// SaludScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, ActivityIndicator, AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  readTodaySteps,
  readLatestHeartRate,
  hcGetStatusDebug, // solo para logs/depurar estado
} from './health';

export default function SaludScreen() {
  const isFocused = useIsFocused();
  const appState = useRef(AppState.currentState);

  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState({ steps: 0, bpm: null, at: null });
  const [statusText, setStatus] = useState(''); // opcional: para depurar

  async function fetchData() {
    setLoading(true);
    try {
      // Log de estado (no bloquea)
      try {
        const s = await hcGetStatusDebug();
        setStatus(`${s.label} (${s.status})`);
      } catch {
        setStatus('STATUS_ERROR');
      }

      // Lecturas en paralelo; si no hay permisos, capturamos y mostramos valores vacíos
      const [stepsRes, hrRes] = await Promise.allSettled([
        readTodaySteps(),
        readLatestHeartRate(),
      ]);

      const steps =
        stepsRes.status === 'fulfilled' && stepsRes.value
          ? stepsRes.value.steps ?? 0
          : 0;

      const hr =
        hrRes.status === 'fulfilled' && hrRes.value
          ? { bpm: hrRes.value.bpm ?? null, at: hrRes.value.at ?? null }
          : { bpm: null, at: null };

      setData({ steps, bpm: hr.bpm, at: hr.at });
    } catch (e) {
      console.log('[SALUD] fetchData error:', e?.message || e);
      setData({ steps: 0, bpm: null, at: null });
    } finally {
      setLoading(false);
    }
  }

  // Al montar y cada vez que la pestaña gana foco, refrescamos
  useEffect(() => {
    if (isFocused) fetchData();
  }, [isFocused]);

  // Si la app regresa del background (p.ej., desde Health Connect), refrescamos
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        if (isFocused) fetchData();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [isFocused]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      {loading ? (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12 }}>Leyendo tus métricas…</Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            Lecturas recientes
          </Text>

          {/* Estado (opcional para debug) */}
          {!!statusText && (
            <Text style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
              Estado: {statusText}
            </Text>
          )}

          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            Último pulso: {data?.bpm != null ? `${data.bpm} bpm` : '—'}
          </Text>

          <Text style={{ fontSize: 16, marginBottom: 16 }}>
            Pasos (hoy): {data?.steps ?? 0}
          </Text>

          <Button title="Actualizar datos" onPress={fetchData} />
        </View>
      )}
    </View>
  );
}
