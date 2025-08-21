// SaludScreen.js (RAÍZ) — auto-refresco cada 15s cuando la pantalla está enfocada y la app activa.
// Sin botón "Actualizar datos". Muestra "Actualizado: hh:mm:ss".

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Button, ActivityIndicator, AppState } from 'react-native';
import {
  hcGetStatusDebug,
  hcOpenSettings,
  readTodaySteps,
  readLatestHeartRate,
  quickSetup,
  hasAllPermissions,
  getGrantedList,
  areAllGranted,
} from './health';
import { useFocusEffect } from '@react-navigation/native';

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}
function fmtClock(d) {
  if (!d) return '—';
  try {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

const INTERVAL_MS = 15000;

export default function SaludScreen() {
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState('');
  const [granted, setGranted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [data, setData] = useState(null); // { steps, bpm, hrAt, hrOrigin, stepOrigins, stepsAsOf }
  const [grantedList, setGrantedList] = useState([]); // debug
  const [lastUpdated, setLastUpdated] = useState(null);

  // refs para controlar auto refresh
  const intervalRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const focusedRef = useRef(false);
  const appActiveRef = useRef(true);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await hcGetStatusDebug();
      setStatusLabel(`${s.label} (${s.status})`);
      setAvailable(s.label === 'SDK_AVAILABLE' || s.status === 0);
    } catch {
      setStatusLabel('STATUS_ERROR');
      setAvailable(false);
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    const list = await getGrantedList();
    setGrantedList(list);
    const ok = areAllGranted(list);
    setGranted(ok);
    return ok;
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [stepsRes, hrRes] = await Promise.allSettled([
        readTodaySteps(),
        readLatestHeartRate(),
      ]);

      const stepsBlock = stepsRes.status === 'fulfilled' && stepsRes.value ? stepsRes.value : null;
      const hrBlock = hrRes.status === 'fulfilled' && hrRes.value ? hrRes.value : null;

      const steps = stepsBlock?.steps ?? 0;
      const stepOrigins = stepsBlock?.origins ?? [];
      const stepsAsOf = stepsBlock?.asOf ?? null;

      const bpm = hrBlock?.bpm ?? null;
      const hrAt = hrBlock?.at ?? null;
      const hrOrigin = hrBlock?.origin ?? null;

      setData({ steps, stepOrigins, stepsAsOf, bpm, hrAt, hrOrigin });
      setLastUpdated(new Date());
    } catch {
      setData(null);
    }
  }, []);

  const tick = useCallback(async () => {
    if (!available || !granted) return;
    if (!focusedRef.current || !appActiveRef.current) return;
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      await refreshData();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [available, granted, refreshData]);

  const tryStartInterval = useCallback(() => {
    if (!intervalRef.current && available && granted && focusedRef.current && appActiveRef.current) {
      intervalRef.current = setInterval(tick, INTERVAL_MS);
    }
  }, [available, granted, tick]);

  const fullRefresh = useCallback(async () => {
    await refreshStatus();
    const ok = await refreshPermissions();
    if (available && ok) {
      await refreshData();
      tryStartInterval();
    } else {
      stopInterval();
      setData(null);
    }
  }, [available, refreshStatus, refreshPermissions, refreshData, tryStartInterval, stopInterval]);

  // manejar foco de pantalla
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      (async () => {
        setLoading(true);
        try { await fullRefresh(); } finally { setLoading(false); }
      })();
      return () => {
        focusedRef.current = false;
        stopInterval();
      };
    }, [fullRefresh, stopInterval])
  );

  // manejar estado de la app (activo/inactivo)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      const active = st === 'active';
      appActiveRef.current = active;
      if (active) {
        setLoading(true);
        try { await fullRefresh(); } finally { setLoading(false); }
      } else {
        stopInterval();
      }
    });
    return () => sub.remove();
  }, [fullRefresh, stopInterval]);

  async function handleRequest() {
    setLoading(true);
    try {
      const ok = await quickSetup();
      for (let i = 0; i < 3; i++) {
        const okNow = await refreshPermissions();
        if (okNow) break;
      }
      if (ok && (await hasAllPermissions())) {
        await refreshData();
        tryStartInterval();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      {loading ? (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12 }}>Sincronizando con Health Connect…</Text>
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
                  setLoading(true);
                  try { await hcOpenSettings(); } finally { setLoading(false); }
                }}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  setLoading(true);
                  try { await fullRefresh(); } finally { setLoading(false); }
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
              <View style={{ marginTop: 16, opacity: 0.7 }}>
                <Text style={{ fontSize: 12 }}>
                  Concedidos: {grantedList.length ? grantedList.join(', ') : '—'}
                </Text>
              </View>
            </>
          )}

          {available && granted && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                Lecturas recientes
              </Text>

              <Text style={{ fontSize: 16, marginBottom: 2 }}>
                Último pulso: {data?.bpm != null ? `${data.bpm} bpm` : '—'}
              </Text>
              <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
                Hora: {fmtTime(data?.hrAt)}{data?.hrOrigin ? `  ·  Origen: ${data.hrOrigin}` : ''}
              </Text>

              <Text style={{ fontSize: 16, marginBottom: 2 }}>
                Pasos (hoy): {data?.steps ?? 0}
              </Text>
              <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                Orígenes: {data?.stepOrigins?.length ? data.stepOrigins.join(', ') : '—'}
              </Text>

              <Text style={{ fontSize: 12, opacity: 0.7 }}>
                Actualizado: {fmtClock(lastUpdated)} · auto cada 15 s
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
