// useEmergency.js
import { useRef, useCallback, useEffect } from 'react';
import { Linking, Vibration, Alert, Platform } from 'react-native';

// ⚠️ Importaciones nativas bajo demanda para evitar crasheos en arranque
let VoiceMod = null;
async function getVoice() {
  if (VoiceMod) return VoiceMod;
  try {
    const m = await import('@react-native-voice/voice');
    VoiceMod = m?.default || m;
  } catch (e) {
    console.debug('Voice import error:', e?.message || e);
  }
  return VoiceMod;
}

let AudioNS = null; // { Audio }
async function getAudio() {
  if (AudioNS) return AudioNS;
  try {
    const m = await import('expo-av'); // ✅ paquete correcto en Expo SDK 53
    AudioNS = m;
  } catch (e) {
    console.debug('Audio import error:', e?.message || e);
  }
  return AudioNS;
}

let LocationNS = null; // expo-location
async function getLocation() {
  if (LocationNS) return LocationNS;
  try {
    const m = await import('expo-location');
    LocationNS = m;
  } catch (e) {
    console.debug('Location import error:', e?.message || e);
  }
  return LocationNS;
}

/**
 * Hook de emergencia
 * @param {Object} params
 * @param {string} params.phoneNumber        Teléfono a llamar (ej: +54911...)
 * @param {string} params.whatsappNumber     Teléfono para WhatsApp (con código país)
 * @param {string} params.whatsappText       Texto a enviar por WhatsApp
 * @param {*}      params.alertSound         require('...') de sonido de alerta
 * @param {*}      params.tickSound          require('...') de sonido "tick"
 * @param {boolean}params.testMode           Si true, muestra alertas de simulación
 */
export function useEmergency({
  phoneNumber,
  whatsappNumber,
  whatsappText = 'Necesito ayuda.',
  alertSound,
  tickSound,
  testMode = false,
} = {}) {
  const playingRef = useRef(null);

  // Configura el modo de audio en iOS (silencioso) cuando haga falta
  const ensureAudioMode = useCallback(async () => {
    try {
      const { Audio } = await getAudio() || {};
      if (!Audio) return;
      if (Platform.OS === 'ios') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: 1, // DuckOthers
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (e) {
      console.debug('ensureAudioMode error:', e?.message || e);
    }
  }, []);

  const playSound = useCallback(async (asset) => {
    try {
      const { Audio } = await getAudio() || {};
      if (!Audio || !asset) return;
      const sound = new Audio.Sound();
      await sound.loadAsync(asset, { shouldPlay: true });
      playingRef.current = sound;
    } catch (e) {
      console.debug('playSound error:', e?.message || e);
    }
  }, []);

  const stopSound = useCallback(async () => {
    try {
      await playingRef.current?.stopAsync?.();
      await playingRef.current?.unloadAsync?.();
    } catch {}
    playingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      // cleanup al desmontar el componente que usa el hook
      stopSound();
    };
  }, [stopSound]);

  const sendWhatsApp = useCallback(async () => {
    try {
      if (!whatsappNumber) return false;
      const url = `whatsapp://send?phone=${encodeURIComponent(
        whatsappNumber
      )}&text=${encodeURIComponent(whatsappText)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
      // Fallback: intento con wa.me (algunos dispositivos lo resuelven vía navegador)
      const waMe = `https://wa.me/${encodeURIComponent(
        whatsappNumber
      )}?text=${encodeURIComponent(whatsappText)}`;
      const supportedWeb = await Linking.canOpenURL(waMe);
      if (supportedWeb) {
        await Linking.openURL(waMe);
        return true;
      }
    } catch (e) {
      console.debug('WhatsApp error:', e?.message || e);
    }
    return false;
  }, [whatsappNumber, whatsappText]);

  const callPhone = useCallback(async () => {
    try {
      if (!phoneNumber) return false;
      const url = `tel:${encodeURIComponent(phoneNumber)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    } catch (e) {
      console.debug('Call error:', e?.message || e);
    }
    return false;
  }, [phoneNumber]);

  const getCoords = useCallback(async () => {
    try {
      const Location = await getLocation();
      if (!Location) return null;
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        lat: pos?.coords?.latitude,
        lon: pos?.coords?.longitude,
      };
    } catch (e) {
      console.debug('Location error:', e?.message || e);
      return null;
    }
  }, []);

  const triggerEmergency = useCallback(async () => {
    try {
      // vibración corta para feedback inmediato
      Vibration.vibrate(Platform.OS === 'android' ? 200 : 300);

      await ensureAudioMode();

      // sonido de “tick” + luego alarma
      if (tickSound) playSound(tickSound);
      if (alertSound) setTimeout(() => playSound(alertSound), 500);

      // Carga opcional de reconocimiento de voz (si está instalado)
      const voice = await getVoice();
      // Ejemplo de uso (desactivado por seguridad):
      // try { await voice?.start?.(Platform.OS === 'ios' ? 'es-ES' : 'es-MX'); } catch {}

      // Obtiene coordenadas si hay permisos
      const coords = await getCoords();
      if (coords) {
        console.debug('EMERGENCY coords:', coords);
      }

      // Intenta WhatsApp y luego llamada
      const waOk = await sendWhatsApp();
      const callOk = await callPhone();

      if (!waOk && !callOk) {
        Alert.alert(
          'Emergencia',
          'No se pudo abrir WhatsApp ni realizar la llamada automáticamente.'
        );
      }

      if (testMode) {
        Alert.alert(
          'Modo Prueba',
          'Se simuló la emergencia (no se enviaron acciones reales).'
        );
      }
    } catch (e) {
      console.debug('triggerEmergency error:', e?.message || e);
    } finally {
      // corta/descarga cualquier sonido tras unos segundos
      setTimeout(stopSound, 5000);
    }
  }, [
    ensureAudioMode,
    alertSound,
    tickSound,
    sendWhatsApp,
    callPhone,
    getCoords,
    playSound,
    stopSound,
    testMode,
  ]);

  return { triggerEmergency };
}
