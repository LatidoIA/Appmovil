// SaludScreen.js (RAÍZ) — estrategia nueva: sin botón “Abrir Health Connect” en estado granted=false;
// determinamos permisos con getGrantedPermissions(); refresco agresivo al volver y tras request.

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

export default function SaludScreen() {
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState('');
  const [granted, setGranted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [data, setData] = useState(null); // { steps, bpm, at }
  const [grantedList, setGrantedList] = useState([]); // debug mínimo

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

