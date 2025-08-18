// src/SaludScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import {
  hcGetStatusDebug,
  hcOpenSettings,
  readTodaySteps,
  readLatestHeartRate,
  quickSetup,
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
      setAvailable(s.label === "SDK_AVAILABLE"); // criterio estricto
    } catch (e) {
      console.log("[SALUD] status error:", e);
      setStatusLabel("STATUS_ERROR");
      setAvailable(false);
    }
  }

  async function fetchData() {
    const [stepsRes, hrRes] = await Promise.all([
      readTodaySteps(),
      readLatestHeartRate(),
    ]);
    console.log("[SALUD] data:", { steps: stepsRes.steps, hr: hrRes });
    setData({ steps: stepsRes.steps ?? 0, bpm: hrRes.bpm, at: hrRes.at });
  }

  async function handleRequest() {
    console.log("[SALUD] pedir permisos");
    setLoading(true);
    await refreshStatus();
    const ok = await Promise.race([
      quickSetup(),
      new Promise((r) => setTimeout(() => r(false), 10000)),
    ]);
    console.log("[SALUD] quickSetup =>", ok);
    setGranted(!!ok);
    if (ok) await fetchData();
    else setData(null);
    setLoading(false);
  }

  useEffect(() => {
    // Solo chequeo de estado al montar
    refreshStatus();
  }, []);

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
                  const ok = await hcOpenSettings();
                  console.log("[SALUD] abrir ajustes HC =>", ok);
                  await refreshStatus();
                  setLoading(false);
                }}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log("[SALUD] revisar de nuevo");
                  setLoading(true);
                  await refreshStatus();
                  setLoading(false);
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
                  const ok = await hcOpenSettings();
                  console.log("[SALUD] abrir HC =>", ok);
                  await refreshStatus();
                  setLoading(false);
                }}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log("[SALUD] revisar de nuevo (granted=false)");
                  setLoading(true);
                  await refreshStatus();
                  setLoading(false);
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
                  await fetchData();
                  setLoading(false);
                }}
              />
              <View style={{ height: 12 }} />
              <Button title="Abrir Health Connect" onPress={hcOpenSettings} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
