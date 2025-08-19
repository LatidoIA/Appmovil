// src/SaludScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
      // Seguimos con criterio estricto
      setAvailable(s.label === "SDK_AVAILABLE");
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
    } catch (e) {
      console.log("[SALUD] fetchData error:", e);
      setData(null);
    }
  }

  // 🔑 Flujo central: refresca estado, intenta quickSetup (si ya diste permisos devolverá true) y, si procede, lee datos
  async function handleRequest() {
    console.log("[SALUD] pedir permisos / validar");
    setLoading(true);
    try {
      await refreshStatus();
      if (!available) {
        setGranted(false);
        setData(null);
        return;
      }

      const ok = await Promise.race([
        quickSetup(), // si ya hay permisos debería resolver true sin re-prompt (según tu implementación)
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

  // Al montar: solo status para no forzar prompts
  useEffect(() => {
    refreshStatus();
  }, []);

  // Al enfocar la pestaña: refresca status (si volviste de HC por fuera del botón)
  useFocusEffect(
    React.useCallback(() => {
      refreshStatus();
    }, [])
  );

  // Si ya está disponible y concedido, cada vez que cambien estos flags, trae datos
  useEffect(() => {
    if (available && granted) {
      fetchData();
    }
  }, [available, granted]);

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
                  try {
                    await hcOpenSettings();
                  } catch (e) {
                    console.log("[SALUD] abrir ajustes HC error:", e);
                  }
                  // ⬇️ Al volver, corre el flujo completo para detectar permisos concedidos
                  await handleRequest();
                }}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log("[SALUD] revisar de nuevo (no disponible)");
                  // ⬇️ Forzamos el flujo completo (no solo status)
                  await handleRequest();
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
                  try {
                    await hcOpenSettings();
                  } catch (e) {
                    console.log("[SALUD] abrir HC error:", e);
                  }
                  // ⬇️ Al volver, ejecutar flujo completo
                  await handleRequest();
                }}
              />

              <View style={{ height: 12 }} />
              <Button
                title="Revisar de nuevo"
                onPress={async () => {
                  console.log("[SALUD] revisar de nuevo (granted=false)");
                  // ⬇️ Ahora corre flujo completo (antes solo status)
                  await handleRequest();
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
                  console.log("[SALUD] abrir HC (granted=true)");
                  try {
                    await hcOpenSettings();
                  } catch (e) {
                    console.log("[SALUD] abrir HC (granted) error:", e);
                  }
                  // Tras tocar HC, vuelve y refresca datos por si cambiaste algo
                  await handleRequest();
                }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
