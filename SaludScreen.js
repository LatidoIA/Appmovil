// src/SaludScreen.js
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  hcGetStatusDebug,
  hcOpenSettings,
  readTodaySteps,
  readLatestHeartRate,
  quickSetup,
  SdkAvailabilityStatus,
} from "./health";

export default function SaludScreen() {
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [granted, setGranted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [data, setData] = useState(null); // { steps, bpm, at }

  async function refreshStatus() {
    try {
      const s = await hcGetStatusDebug();
      console.log("[SALUD] status:", s);
      setStatusLabel(`${s.label} (${s.status})`);
      setAvailable(s.status === SdkAvailabilityStatus.SDK_AVAILABLE);
    } catch (e) {
      console.log("[SALUD] status error:", e);
      setStatusLabel("STATUS_ERROR");
      setAvailable(false);
    }
  }

  async function fetchData() {
    try {
      const [stepsRes, hrRes] = await Promise.allSettled([
        readTodaySteps(),
        readLatestHeartRate(),
      ]);

      const steps =
        stepsRes.status === "fulfilled" && stepsRes.value
          ? stepsRes.value.steps ?? 0
          : 0;

      const hr =
        hrRes.status === "fulfilled" && hrRes.value
          ? { bpm: hrRes.value.bpm ?? null, at: hrRes.value.at ?? null }
          : { bpm: null, at: null };

      console.log("[SALUD] data:", { steps, hr });
      setData({ steps, bpm: hr.bpm, at: hr.at });

      // si alguna lectura llega, asumimos permisos concedidos
      if (steps > 0 || hr.bpm != null) setGranted(true);
    } catch (e) {
      console.log("[SALUD] fetchData error:", e);
      setData(null);
    }
  }

  async function handleRequest() {
    console.log("[SALUD] pedir permisos");
    setLoading(true);
    try {
      await refreshStatus();
      const ok = await Promise.race([
        quickSetup(),
        new Promise((r) => setTimeout(() => r(false), 10000)),
      ]);
      console.log("[SALUD] quickSetup =>", ok);
      setGranted(!!ok);
      if (ok) {
        await fetchData();
      } else {
        setData(null);
      }
    } catch (e) {
      console.log("[SALUD] handleRequest error:", e);
      setGranted(false);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Solo chequeo de estado al montar
    refreshStatus();
  }, []);

  // Revalidar cada vez que la pantalla gana foco (p.ej. al volver de Health)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        await refreshStatus();
        if (alive && available) {
          await fetchData();
        }
      })();
      return () => { alive = false; };
    }, [available])
  );

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      {loading ? (
        <View style={{ alignItems: "center" }}>
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
                  console.log("[SALUD] abrir ajustes HC");
                  setLoading(true);
                  try {
                    const ok = await hcOpenSettings();
                    console.log("[SALUD] abrir ajustes HC =>", ok);
                    await refreshStatus();
                  } catch (e) {
                    console.log("[SALUD] abrir ajustes HC error:", e);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log("[SALUD] revisar de nuevo");
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
                  console.log("[SALUD] abrir HC (desde granted=false)");
                  setLoading(true);
                  try {
                    const ok = await hcOpenSettings();
                    console.log("[SALUD] abrir HC =>", ok);
                    await refreshStatus();
                  } catch (e) {
                    console.log("[SALUD] abrir HC error:", e);
                  } finally {
                    setLoading(false);
                  }
                }}
              />

              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log("[SALUD] revisar de nuevo (granted=false)");
                  setLoading(true);
                  try {
                    await refreshStatus();
                    if (available) await fetchData();
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </>
          )}

          {available && granted && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
                Lecturas recientes
              </Text>
              <Text style={{ fontSize: 16, marginBottom: 4 }}>
                Último pulso: {data?.bpm != null ? `${data.bpm} bpm` : "—"}
              </Text>
              <Text style={{ fontSize: 16, marginBottom: 16 }}>
                Pasos (hoy): {data?.steps ?? 0}
              </Text>

              <Button
                title="Actualizar datos"
                onPress={async () => {
                  console.log("[SALUD] actualizar datos");
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
                  try {
                    await hcOpenSettings();
                  } catch (e) {
                    console.log("[SALUD] abrir HC (granted) error:", e);
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
