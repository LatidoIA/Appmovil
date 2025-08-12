// hooks/useEmergency.js
import { useEffect, useRef, useCallback } from 'react';
import { Linking, Vibration, Alert, Platform } from 'react-native';
import Voice from '@react-native-voice/voice';
import * as Location from 'expo-location';
import { Audio } from 'expo-audio'; // usamos expo-audio (no expo-av)

export function useEmergency({
  phoneNumber,
  whatsappNumber,
  whatsappText,
  alertSound,
  tickSound,
  cooldownMs = 15000, // antirebote: 15s
  testMode = false    // si true, no llama ni abre WhatsApp (solo simula)
}) {
  const alertRef = useRef(null);
  const tickRef  = useRef(null);
  const lastTriggerRef = useRef(0);
  const isMountedRef = useRef(true);

  // --------- Precarga de sonidos ---------
  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        if (alertSound) {
          const { sound } = await Audio.Sound.createAsync(alertSound);
          if (isMountedRef.current) alertRef.current = sound;
        }
        if (tickSound) {
          const { sound } = await Audio.Sound.createAsync(tickSound);
          if (isMountedRef.current) tickRef.current = sound;
        }
      } catch (e) {
        console.warn('useEmergency: error cargando sonidos:', e?.message || e);
      }
    })();
    return () => {
      isMountedRef.current = false;
      try { alertRef.current?.unloadAsync?.(); } catch (e) { console.debug('useEmergency: unload alert error', e?.message || e); }
      try { tickRef.current?.unloadAsync?.(); } catch (e) { console.debug('useEmergency: unload tick error', e?.message || e); }
    };
  }, [alertSound, tickSound]);

  // --------- Helpers ---------
  const getLocationUrl = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return 'no disponible';
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!coords) return 'no disponible';
      return `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    } catch (e) {
      console.debug('useEmergency: error al obtener ubicación:', e?.message || e);
      return 'no disponible';
    }
  }, []);

  const playAlert = useCallback(async () => {
    try {
      Vibration.vibrate(1000);
      if (alertRef.current) await alertRef.current.replayAsync();
    } catch (e) {
      console.debug('useEmergency: error al reproducir sonido:', e?.message || e);
    }
  }, []);

  async function callNow(num) {
    try {
      if (!num) return false;
      const sanitized = String(num).trim();
      const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
      const url = `${scheme}${sanitized}`;
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open tel url');
      await Linking.openURL(url);
      return true;
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la llamada.');
      return false;
    }
  }

  // --------- Disparo real ---------
  const triggerEmergency = useCallback(async () => {
    // Antirebote
    const now = Date.now();
    const elapsed = now - (lastTriggerRef.current || 0);
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
      Alert.alert('Un momento', `Ya se envió una alerta. Intenta de nuevo en ${remaining}s.`);
      return;
    }
    lastTriggerRef.current = now;

    await playAlert();

    if (testMode) {
      // Solo simula (sin llamada ni WhatsApp)
      const locText = await getLocationUrl();
      try { await tickRef.current?.replayAsync?.(); } catch (e) { console.debug('useEmergency: tick replay (test) error', e?.message || e); }
      Alert.alert(
        'Prueba de emergencia',
        `Se simula el flujo sin llamadas.\n\nTexto: "${whatsappText || 'Necesito ayuda.'}"\nUbicación: ${locText}`
      );
      return;
    }

    // Llamada telefónica (si hay número)
    if (phoneNumber) {
      await callNow(phoneNumber);
    }

    // WhatsApp (si hay número)
    if (whatsappNumber) {
      const locText = await getLocationUrl();
      const text = encodeURIComponent(`${whatsappText || 'Necesito ayuda.'}\nMi ubicación: ${locText}`);
      const waDeepLink = `whatsapp://send?phone=${whatsappNumber}&text=${text}`;
      const waWeb = `https://wa.me/${encodeURIComponent(String(whatsappNumber).replace(/[^\d+]/g, ''))}?text=${text}`;
      try {
        const canOpen = await Linking.canOpenURL(waDeepLink);
        if (canOpen) await Linking.openURL(waDeepLink);
        else await Linking.openURL(waWeb);
      } catch (e) {
        Alert.alert('Error', 'No se pudo abrir WhatsApp.');
      }
    }

    // Reactiva escucha de voz (si existe)
    try {
      if (Voice && typeof Voice.start === 'function') {
        await Voice.start('es-ES');
      }
    } catch (e) {
      console.debug('useEmergency: Voice.start post-trigger error', e?.message || e);
    }
  }, [cooldownMs, phoneNumber, whatsappNumber, whatsappText, testMode, getLocationUrl, playAlert]);

  // --------- Modo prueba manual (expuesto) ---------
  const testEmergencyFlow = useCallback(async () => {
    try {
      await playAlert();
      const locText = await getLocationUrl();
      try { await tickRef.current?.replayAsync?.(); } catch (e) { console.debug('useEmergency: tick replay (manual test) error', e?.message || e); }
      Alert.alert(
        'Prueba de emergencia',
        `Se simula el flujo sin llamadas.\n\nTexto: "${whatsappText || 'Necesito ayuda.'}"\nUbicación: ${locText}`
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo ejecutar la prueba.');
    }
  }, [getLocationUrl, playAlert, whatsappText]);

  // --------- Voz: escucha continua de "ayuda" ---------
  useEffect(() => {
    let active = true;

    Voice.onSpeechResults = (e) => {
      if (!active) return;
      try {
        const text = (e?.value || []).join(' ').toLowerCase();
        if (text.includes('ayuda')) {
          triggerEmergency(); // antirebote evitará repetidos
        }
      } catch (err) {
        console.debug('useEmergency: onSpeechResults error:', err?.message || err);
      }
    };

    Voice.onSpeechError = async () => {
      if (!active) return;
      try { if (Voice?.start) await Voice.start('es-ES'); } catch (e) { console.debug('useEmergency: onSpeechError restart error', e?.message || e); }
    };
    Voice.onSpeechEnd = async () => {
      if (!active) return;
      try { if (Voice?.start) await Voice.start('es-ES'); } catch (e) { console.debug('useEmergency: onSpeechEnd restart error', e?.message || e); }
    };

    (async () => {
      try {
        if (Voice && typeof Voice.start === 'function') {
          await Voice.start('es-ES');
        }
      } catch (e) {
        console.debug('useEmergency: Voice.start init error', e?.message || e);
      }
    })();

    return () => {
      active = false;
      try {
        Voice.destroy?.().then(() => Voice.removeAllListeners());
      } catch (e) {
        console.debug('useEmergency: Voice cleanup error', e?.message || e);
      }
    };
  }, [triggerEmergency]);

  return { triggerEmergency, testEmergencyFlow };
}
