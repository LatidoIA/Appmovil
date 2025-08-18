// src/SaludScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import {
  quickSetup,
  hcGetStatusDebug,
  hcOpenSettings,
  readTodaySteps,
  readLatestHeartRate,
} from "./health"; // si lo guardaste en /src/health.ts, cambia a './src/health'

export default function SaludScreen() {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [granted, setGranted] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");
  const [data, setData] = useState(null); // { steps, bpm, at }

  async function fetchData() {
    const [stepsRes, hrRes] = await Promise.all([
      readTodaySteps(),
      readLatestHeartRate(),
    ]);
    setData({ steps: stepsRes.steps ?? 0, bpm: hrRes.bpm, at: hrRes.at });
  }

  async function bootstrap() {
    setLoading(true);
    const s = await hcGetStatusDebug();
    setStatusLabel(s.label);
    // disponible si no está "PROVIDER_NOT_INSTALLED"
    setAvailable(s.label !== "PROVIDER_NOT_INSTALLED");

    const ok = await quickSetup(); // pide permisos y/o abre ajustes si falta algo
    setGranted(ok);

    if (ok) {
      await fetchData();
    } else {
      setData(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    bootstrap();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Preparando Health Connect…</Text>
      </View>
    );
    }

  if (!available) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>
          Health Connect no está disponible (estado: {statusLabel}).
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 12, opacity: 0.8 }}>
          Instala/actualiza la app Health Connect y verifica que esté habilitada.
        </Text>
        <Button title="Abrir ajustes de Health Connect" onPress={hcOpenSettings} />
        <View style={{ height: 12 }} />
        <Button title="Revisar de nuevo" onPress={bootstrap} />
      </View>
    );
  }

  if (!granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>
          Debes otorgar permisos de lectura para Pasos y Frecuencia Cardíaca en Health Connect.
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 12, opacity: 0.8 }}>
          Si los negaste antes, ábrelos en Ajustes y vuelve a “Revisar de nuevo”.
        </Text>
        <Button title="Abrir permisos en Health Connect" onPress={hcOpenSettings} />
        <View style={{ height: 12 }} />
        <Button title="Ya concedí permisos — Reintentar" onPress={bootstrap} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
        Lecturas recientes
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 4 }}>
        Último pulso: {data?.bpm != null ? `${data.bpm} bpm` : "—"}
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 16 }}>
        Pasos (hoy): {data?.steps ?? 0}
      </Text>
      <Button title="Actualizar" onPress={async () => {
        setLoading(true);
        await fetchData();
        setLoading(false);
      }} />
      <View style={{ height: 12 }} />
      <Button title="Abrir Health Connect" onPress={hcOpenSettings} />
    </View>
  );
}
