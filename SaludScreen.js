// SaludScreen.js (RAÍZ)
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, ActivityIndicator, AppState } from 'react-native';
import {
  hcGetStatusDebug,
  hcOpenSettings,
  readTodaySteps,
  readLatestHeartRate,
  quickSetup,
  hasAllPermissions,
} from './health'; // <-- IMPORTA DESDE LA RAÍZ

import { useFocusEffect } from '@react-navigation/native';

export default function SaludScreen() {
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState('');
  const [granted, setGranted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [data, setData] = useState(null); // { steps, bpm, at }

  const refreshStatus = useCallback(async () => {
    try {
      const s = await hcGetStatusDebug();
      console.log('[SALUD] status:', s);
      setStatusLabel(`${s.label} (${s.status})`);
      // robustez: acepta label o status === 0 (SDK_AVAILABLE)
      setAvailable(s.label === 'SDK_AVAILABLE' || s.status === 0);
    } catch (e) {
      console.log('[SALUD] status error:', e);
      setStatusLabel('STATUS_ERROR');
      setAvailable(false);
    }
  }, []);

  const refreshPermissionsAndData = useCallback(async () => {
    await refreshStatus();
    let g = false;
    try { g = await hasAllPermissions(); } catch {}
    setGranted(!!g);
    if (g) {
      try {
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

        console.log('[SALUD] data:', { steps, hr });
        setData({ steps, bpm: hr.bpm, at: hr.at });
      } catch (e) {
        console.log('[SALUD] fetchData error:', e);
        setData(null);
      }
    } else {
      setData(null);
    }
  }, [refreshStatus]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        setLoading(true);
        try { await refreshPermissionsAndData(); } finally { setLoading(false); }
      })();
      return () => { active = false; };
    }, [refreshPermissionsAndData])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        refreshPermissionsAndData().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [refreshPermissionsAndData]);

  async function handleRequest() {
    console.log('[SALUD] pedir permisos');
    setLoading(true);
    try {
      const ok = await quickSetup();
      console.log('[SALUD] quickSetup =>', ok);
      await refreshPermissionsAndData();
    } catch (e) {
      console.log('[SALUD] handleRequest error:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      {loading ? (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12 }}>Preparando Health Connect…</Text>
        </View>
      ) : (
        <>
          {!available && (
            <>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>
                Health Connect no está disponible (estado: {statusLabel}).
              </Text>
              <Text style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
                Instala/actualiza y habilita Health Connect, luego vuelve aquí.
              </Text>

              <Button
                title="Abrir Health Connect"
                onPress={async () => {
                  console.log('[SALUD] abrir ajustes HC');
                  setLoading(true);
                  try { await hcOpenSettings(); } finally { setLoading(false); }
                }}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log('[SALUD] revisar de nuevo');
                  setLoading(true);
                  try { await refreshPermissionsAndData(); } finally { setLoading(false); }
                }}
              />
            </>
          )}

          {available && !granted && (
            <>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>
                Otorga permisos de lectura de Pasos y Frecuencia Cardíaca.
              </Text>

              <Button title="Solicitar permisos ahora" onPress={handleRequest} />

              <View style={{ height: 12 }} />
              <Button
                title="Abrir Health Connect"
                onPress={async () => {
                  console.log('[SALUD] abrir HC (desde granted=false)');
                  setLoading(true);
                  try { await hcOpenSettings(); } finally { setLoading(false); }
                }}
              />

              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log('[SALUD] revisar de nuevo (granted=false)');
                  setLoading(true);
                  try { await refreshPermissionsAndData(); } finally { setLoading(false); }
                }}
              />
            </>
          )}

          {available && granted && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                Lecturas recientes
              </Text>
              <Text style={{ fontSize: 16, marginBottom: 4 }}>
                Último pulso: {data?.bpm != null ? `${data.bpm} bpm` : '—'}
              </Text>
              <Text style={{ fontSize: 16, marginBottom: 16 }}>
                Pasos (hoy): {data?.steps ?? 0}
              </Text>

              <Button
                title="Actualizar datos"
                onPress={async () => {
                  console.log('[SALUD] actualizar datos');
                  setLoading(true);
                  try { await refreshPermissionsAndData(); } finally { setLoading(false); }
                }}
              />

              <View style={{ height: 12 }} />
              <Button
                title="Abrir Health Connect"
                onPress={async () => {
                  try { await hcOpenSettings(); } catch (e) {
                    console.log('[SALUD] abrir HC (granted) error:', e);
                  }
                }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
