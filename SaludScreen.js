// src/SaludScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import { ensureHealthConnect, goToHealthConnectSettings, readLatestSamples } from "./health";

export default function SaludScreen() {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [granted, setGranted] = useState(false);
  const [data, setData] = useState(null);

  async function bootstrap() {
    setLoading(true);
    const st = await ensureHealthConnect();
    setAvailable(st.available);
    setGranted(st.granted);
    if (st.available && st.granted) {
      const d = await readLatestSamples();
      setData(d);
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
        <Text style={{ fontSize: 16, marginBottom: 12 }}>
          Health Connect no está disponible. Asegúrate de tener la app instalada/actualizada.
        </Text>
        <Button title="Abrir ajustes de Health Connect" onPress={goToHealthConnectSettings} />
      </View>
    );
  }

  if (!granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>
          Debes otorgar permisos de Heart Rate y Steps en Health Connect para continuar.
        </Text>
        <Button title="Abrir permisos en Health Connect" onPress={goToHealthConnectSettings} />
        <View style={{ height: 12 }} />
        <Button title="Ya concedí permisos — Reintentar" onPress={bootstrap} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>Lecturas (últimas 24 h)</Text>
      <Text style={{ fontSize: 16, marginBottom: 4 }}>Muestras de pulso: {data?.heartRateCount ?? 0}</Text>
      <Text style={{ fontSize: 16, marginBottom: 16 }}>Pasos totales: {data?.stepsTotal ?? 0}</Text>
      <Button title="Actualizar" onPress={bootstrap} />
    </View>
  );
}
