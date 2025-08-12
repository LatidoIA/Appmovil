// CrashCatcher.js
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@latido_last_crash';

export default function CrashCatcher({ children }) {
  const [errorText, setErrorText] = useState(null);

  useEffect(() => {
    const prevHandler = global.ErrorUtils?.getGlobalHandler?.();

    // Captura errores JS fatales
    global.ErrorUtils?.setGlobalHandler?.(async (error, isFatal) => {
      const payload = [
        `${error?.name || 'Error'}: ${error?.message || ''}`,
        error?.stack || '',
        `FATAL: ${isFatal ? 'yes' : 'no'}`
      ].join('\n');
      try { await AsyncStorage.setItem(KEY, payload); } catch {}
      setErrorText(payload);
      // No llamamos a prevHandler para evitar que Android mate la app inmediatamente
    });

    // Captura rechazos no manejados de Promises
    const onUnhandled = async (evt) => {
      const e = evt?.reason || evt;
      const payload = [
        'UnhandledPromiseRejection',
        e?.message || String(e || ''),
        e?.stack || ''
      ].join('\n');
      try { await AsyncStorage.setItem(KEY, payload); } catch {}
      setErrorText(payload);
    };

    // Algunos runtimes no tienen este event listener; protegemos el acceso
    try { globalThis.addEventListener?.('unhandledrejection', onUnhandled); } catch {}

    return () => {
      if (prevHandler) global.ErrorUtils.setGlobalHandler(prevHandler);
      try { globalThis.removeEventListener?.('unhandledrejection', onUnhandled); } catch {}
    };
  }, []);

  if (errorText) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Se detectó un error</Text>
        <Text selectable style={styles.code}>{errorText}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => Clipboard.setStringAsync(errorText)}>
          <Text style={styles.btnText}>Copiar detalle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { opacity: 0.85 }]} onPress={() => setErrorText(null)}>
          <Text style={styles.btnText}>Seguir</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
  return children;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b0f14' },
  content: { padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  code: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 16 },
  btn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#fff', fontWeight: '600' }
});
