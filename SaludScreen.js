// src/SaludScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import {
  hcGetStatusDebug,
  hcOpenSettings,
  readTodaySteps,
  readLatestHeartRate,
  quickSetup
} from "./health"; // si health.ts está en el mismo /src

export default function SaludScreen() {
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [granted, setGranted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [data, setData] = useState(null); // { steps, bpm, at }

  async function refreshStatus() {
    const s = await hcGetStatusDebug();
    setStatusLabel(s.label);
    // Disponible si no es "PROVIDER_NOT_INSTALLED"
    setAvailable(s.label !== "PROVIDER_NOT_INSTALLED");
  }

  async function fetchData() {
    const [stepsRes, hrRes] = await Promise.all([
      readTodaySteps(),
      readLatestHeartRate(),
    ]);
    setData({ steps: stepsRes.steps ?? 0, bpm: hrRes.bpm, at: hrRes.at });
  }

  // Timeout para evitar quedarse pegado esperando al sheet nativo
  async function requestWithTimeout(ms = 10000) {
    return Promise.race([
      quickSetup(), // pide permisos y/o abre ajustes si falta algo
      new Promise((resolve) => setTimeout(() => resolve(false), ms)),
    ]);
  }

  async function handleRequest() {
    setLoading(true);
    await refreshStatus();
    const ok = await requestWithTimeout();
    setGranted(!!ok);
    if (ok) {
      await fetchData();
    } else {
      setData(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Solo chequeo de estado al entrar; no pedimos permisos aún
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
              <Button title="Abrir Health Connect" onPress={hcOpenSettings} />
              <View style={{ height: 12 }} />
              <Button title="Revisar de nuevo" onPress={refreshStatus} />
            </>
          )}

          {available && !granted && (
            <>
              <Text style={{ fontSize: 16, marginBottom: 6 }}>
                Para continuar, otorga permisos de lectura de Pasos y Frecuencia Cardíaca.
              </Text>
              <Text style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
                Si ya los diste en Health Connect, toca “Revisar de nuevo”.
              </Text>
              <Button title="Solicitar permisos ahora" onPress={handleRequest} />
              <View style={{ height: 12 }} />
              <Button title="Abrir Health Connect" onPress={hcOpenSettings} />
              <View style={{ height: 12 }} />
              <Button title="Revisar de nuevo" onPress={async () => {
                setLoading(true);
                await refreshStatus();
                setLoading(false);
              }} />
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
              <Button title="Actualizar datos" onPress={async () => {
                setLoading(true);
                await fetchData();
                setLoading(false);
              }} />
              <View style={{ height: 12 }} />
              <Button title="Abrir Health Connect" onPress={hcOpenSettings} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
