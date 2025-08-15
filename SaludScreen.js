// SaludScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';

// OJO: si tu health.ts está en "src/health.ts", usa esta ruta.
// Si lo tienes en la raíz, cambia a: './health'
import {
  hcEnsureAvailable,
  hcInitAndRequest,
  hcReadLatestHeartRate,
  hcReadStepsToday,
} from './src/health';

export default function SaludScreen() {
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [perms, setPerms] = useState(null);
  const [steps, setSteps] = useState(null);
  const [hr, setHr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const ok = await hcEnsureAvailable();
        setAvailable(!!ok);
      } catch {
        setAvailable(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const openHealthConnectPage = useCallback(async () => {
    const pkg = 'com.google.android.apps.healthdata';
    // intenta abrir la app o su ficha de Play Store
    const intents = [
      `android-app://${pkg}`,
      `market://details?id=${pkg}`,
      `https://play.google.com/store/apps/details?id=${pkg}`,
    ];
    for (const url of intents) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      } catch {}
    }
  }, []);

  const requestHC = useCallback(async () => {
    setMsg('');
    setBusy(true);
    try {
      const granted = await hcInitAndRequest(); // abre el diálogo nativo de Health Connect
      setPerms(granted || []);
      // tras otorgar permisos, intenta leer
      await refresh();
      if (!granted || (Array.isArray(granted) && granted.length === 0)) {
        setMsg('Permisos no otorgados en Health Connect.');
      }
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    setMsg('');
    try {
      const s = await hcReadStepsToday();
      const h = await hcReadLatestHeartRate();
      setSteps(s || { total: 0, count: 0 });
      setHr(h || null);
      if ((s?.total ?? 0) === 0 && !h) {
        setMsg(
          'Sin datos. Verifica en Samsung Health → Ajustes → Health Connect que comparta Pasos y FC.'
        );
      }
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, []);

  const Body = () => {
    if (checking) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.note}>Comprobando Health Connect…</Text>
        </View>
      );
    }

    if (!available) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Health Connect no disponible</Text>
          <Text style={styles.note}>
            Instala/activa “Health Connect by Android” y vuelve a esta pantalla.
          </Text>
          <Button title="Abrir Health Connect" onPress={openHealthConnectPage} />
        </View>
      );
    }

    return (
      <View style={{ gap: 12 }}>
        <Button title="Conectar con Health Connect" onPress={requestHC} />
        <Button title="Actualizar lecturas" onPress={refresh} />
        {busy && (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.note}>Leyendo…</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pasos (hoy)</Text>
          <Text style={styles.value}>{steps?.total ?? 0}</Text>
          <Text style={styles.small}>Registros: {steps?.count ?? 0}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Frecuencia cardiaca</Text>
          {hr ? (
            <>
              {/* React-native-health-connect retorna diferentes formas.
                  Mostramos datos comunes si existen */}
              {'samples' in hr && Array.isArray(hr.samples) && hr.samples[0] ? (
                <>
                  <Text style={styles.value}>{hr.samples[0]?.beatsPerMinute ?? '--'} bpm</Text>
                  <Text style={styles.small}>
                    {hr.startTime || hr.samples[0]?.time || ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.value}>{hr.beatsPerMinute ?? '--'} bpm</Text>
                  <Text style={styles.small}>{hr.time || hr.startTime || ''}</Text>
                </>
              )}
            </>
          ) : (
            <Text style={styles.small}>Sin datos</Text>
          )}
        </View>

        {perms ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Permisos otorgados</Text>
            <ScrollView horizontal>
              <Text style={styles.mono}>
                {JSON.stringify(perms, null, 2)}
              </Text>
            </ScrollView>
          </View>
        ) : null}

        {!!msg && <Text style={styles.warn}>{msg}</Text>}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Salud</Text>
      <Body />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  screenTitle: { fontSize: 24, fontWeight: '700' },
  center: { alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { color: '#666' },
  warn: { color: '#b45309' },
  title: { fontSize: 18, fontWeight: '600' },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f6f6f6',
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  value: { fontSize: 28, fontWeight: '800' },
  small: { color: '#666' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
});

