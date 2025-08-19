// src/SaludScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import {
  hcGetStatusDebug,
  hcOpenSettings,
  readTodaySteps,
  readLatestHeartRate,
  quickSetup,
} from './health';
import { useIsFocused } from '@react-navigation/native';

export default function SaludScreen() {
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState('');
  const [available, setAvailable] = useState(false);
  const [granted, setGranted] = useState(false);
  const [data, setData] = useState(null); // { steps, bpm, at }

  const refreshStatus = useCallback(async () => {
    try {
      const s = await hcGetStatusDebug();
      console.log('[SALUD] status:', s);
      setStatusLabel(`${s.label} (${s.status})`);
      setAvailable(s.label === 'SDK_AVAILABLE');
      return s.label === 'SDK_AVAILABLE';
    } catch (e) {
      console.log('[SALUD] status error:', e);
      setStatusLabel('STATUS_ERROR');
      setAvailable(false);
      return false;
    }
  }, []);

  const fetchData = useCallback(async () => {
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

      // Heurística: si las lecturas no fallaron, asumimos permisos concedidos.
      setGranted(true);
      return true;
    } catch (e) {
      console.log('[SALUD] fetchData error:', e);
      setData(null);
      setGranted(false);
      return false;
    }
  }, []);

  const handleRequest = useCallback(async () => {
    console.log('[SALUD] pedir permisos');
    setLoading(true);
    try {
      const isAvail = await refreshStatus();
      if (!isAvail) {
        setGranted(false);
        return;
      }
      const ok = await Promise.race([
        quickSetup(),
        new Promise((r) => setTimeout(() => r(false), 10000)),
      ]);
      console.log('[SALUD] quickSetup =>', ok);
      setGranted(!!ok);
      if (ok) {
        await fetchData();
      } else {
        setData(null);
      }
    } catch (e) {
      console.log('[SALUD] handleRequest error:', e);
      setGranted(false);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchData, refreshStatus]);

  // 1) Primer chequeo
  useEffect(() => {
    (async () => {
      await refreshStatus();
    })();
  }, [refreshStatus]);

  // 2) Re-chequear AUTOMÁTICAMENTE al volver a enfocar la pestaña
  useEffect(() => {
    (async () => {
      if (!isFocused) return;
      setLoading(true);
      try {
        const avail = await refreshStatus();
        if (avail) {
          // Intento de lectura “sonda” para detectar permisos ya concedidos
          const ok = await fetchData();
          setGranted(ok);
        } else {
          setGranted(false);
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isFocused, refreshStatus, fetchData]);

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
                  try {
                    await hcOpenSettings();
                    // Pequeña espera para que el sistema aplique cambios
                    await new Promise((r) => setTimeout(r, 600));
                    await refreshStatus();
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log('[SALUD] revisar de nuevo');
                  setLoading(true);
                  try {
                    await refreshStatus();
                  } finally {
                    setLoading(false);
                  }
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
                  try {
                    await hcOpenSettings();
                    await new Promise((r) => setTimeout(r, 600));
                    // Tras volver, re-sondear de inmediato
                    const avail = await refreshStatus();
                    if (avail) {
                      const ok = await fetchData();
                      setGranted(ok);
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
              />

              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log('[SALUD] revisar de nuevo (granted=false)');
                  setLoading(true);
                  try {
                    const avail = await refreshStatus();
                    if (avail) {
                      const ok = await fetchData();
                      setGranted(ok);
                    } else {
                      setGranted(false);
                      setData(null);
                    }
                  } finally {
                    setLoading(false);
                  }
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
                  try {
                    await fetchData();
                  } finally {
                    setLoading(false);
                  }
                }}
              />

              <View style={{ height: 12 }} />
              <Button
                title="Abrir Health Connect"
                onPress={async () => {
                  setLoading(true);
                  try {
                    await hcOpenSettings();
                  } finally {
                    setLoading(false);
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
