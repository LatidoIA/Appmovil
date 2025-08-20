// src/SaludScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, AppState } from 'react-native';
import {
  ensureInitialized,
  hcGetStatusDebug,
  readTodaySteps,
  readLatestHeartRate,
} from './health';

export default function SaludScreen() {
  const [statusLabel, setStatusLabel] = useState('');
  const [data, setData] = useState({ steps: 0, bpm: null, at: null });

  async function refreshStatus() {
    try {
      await ensureInitialized();
      const s = await hcGetStatusDebug();
      setStatusLabel(`${s.label} (${s.status})`);
    } catch {
      setStatusLabel('STATUS_ERROR');
    }
  }

  async function fetchData() {
    await ensureInitialized();
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
  }

  // Refrescar al volver de Health Connect (con pequeña espera)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st === 'active') {
        // da tiempo a que App.js termine quickSetup
        await new Promise((r) => setTimeout(r, 400));
        await refreshStatus();
        await fetchData();
      }
    });
    return () => sub.remove();
  }, []);

  // Carga inicial
  useEffect(() => {
    (async () => {
      await refreshStatus();
      await fetchData();
    })();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Bloque compacto (no bloquea tu UI de métricas) */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Lecturas recientes
        </Text>
        <Text style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>
          Estado: {statusLabel || '—'}
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>
          Último pulso: {data?.bpm != null ? `${data.bpm} bpm` : '—'}
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 16 }}>
          Pasos (hoy): {data?.steps ?? 0}
        </Text>
        <Button title="Actualizar datos" onPress={fetchData} />
      </View>

      {/* Aquí mantén todas tus otras métricas/accesorios de siempre */}
      {/* ... */}
    </View>
  );
}
