// SaludScreen.js (RAÍZ) — muestra hora y origen de cada métrica; busca sample HR más reciente global

import React, { useEffect, useState, useCallback } from 'react';
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
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function SaludScreen() {
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState('');
  const [granted, setGranted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [data, setData] = useState(null); // { steps, bpm, hrAt, hrOrigin, stepOrigins, stepsAsOf }
  const [grantedList, setGrantedList] = useState([]); // debug

  const refreshStatus = useCallback(async () => {
    try {
      const s = await hcGetStatusDebug();
      console.log('[SALUD] status:', s);
      setStatusLabel(`${s.label} (${s.status})`);
      setAvailable(s.label === 'SDK_AVAILABLE' || s.status === 0);
    } catch (e) {
      console.log('[SALUD] status error:', e);
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

      console.log('[SALUD] data:', { steps, stepOrigins, stepsAsOf, bpm, hrAt, hrOrigin });
      setData({ steps, stepOrigins, stepsAsOf, bpm, hrAt, hrOrigin });
    } catch (e) {
      console.log('[SALUD] fetchData error:', e);
      setData(null);
    }
  }, []);

  const fullRefresh = useCallback(async () => {
    await refreshStatus();
    const ok = await refreshPermissions();
    if (available && ok) {
      await refreshData();
    } else {
      setData(null);
    }
  }, [available, refreshStatus, refreshPermissions, refreshData]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        setLoading(true);
        try { await fullRefresh(); } finally { setLoading(false); }
      })();
      return () => { active = false; };
    }, [fullRefresh])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st === 'active') {
        setLoading(true);
        try { await fullRefresh(); } finally { setLoading(false); }
      }
    });
    return () => sub.remove();
  }, [fullRefresh]);

  async function handleRequest() {
    console.log('[SALUD] pedir permisos');
    setLoading(true);
    try {
      const ok = await quickSetup();
      console.log('[SALUD] quickSetup =>', ok);

      // Poll corto y refresco
      for (let i = 0; i < 3; i++) {
        const okNow = await refreshPermissions();
        if (okNow) break;
      }
      if (await hasAllPermissions()) {
        await refreshData();
      }
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

              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log('[SALUD] revisar de nuevo (granted=false)');
                  setLoading(true);
                  try { await fullRefresh(); } finally { setLoading(false); }
                }}
              />

              {/* Debug mínimo */}
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
              <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
                Orígenes: {data?.stepOrigins?.length ? data.stepOrigins.join(', ') : '—'}
              </Text>

              <Button
                title="Actualizar datos"
                onPress={async () => {
                  console.log('[SALUD] actualizar datos');
                  setLoading(true);
                  try { await refreshData(); } finally { setLoading(false); }
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

              {/* Debug */}
              <View style={{ marginTop: 16, opacity: 0.7 }}>
                <Text style={{ fontSize: 12 }}>
                  Concedidos: {grantedList.length ? grantedList.join(', ') : '—'}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
