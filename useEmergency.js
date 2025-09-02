import { useRef, useCallback } from 'react';
import { Linking, Vibration, Alert } from 'react-native';

// Dinámicos: no rompen si la lib no está instalada
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

let AVNS = null; // expo-av
async function getAV() {
  if (AVNS) return AVNS;
  try {
    const m = await import('expo-av');
    AVNS = m;
  } catch (e) {
    console.debug('AV import error:', e?.message || e);
  }
  return AVNS;
}

let LocationNS = null; // expo-location (opcional)
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

export function useEmergency({
  phoneNumber,
  whatsappNumber,
  whatsappText = 'Necesito ayuda.',
  alertSound,
  tickSound,
  testMode = false
} = {}) {
  const playingRef = useRef(null);

  const playSound = useCallback(async (asset) => {
    try {
      const AV = await getAV();
      if (!AV?.Audio) return;
      const sound = new AV.Audio.Sound();
      await sound.loadAsync(asset);
      playingRef.current = sound;
      await sound.playAsync();
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

  const sendWhatsApp = useCallback(async () => {
    try {
      if (!whatsappNumber) return false;
      const url = `whatsapp://send?phone=${encodeURIComponent(whatsappNumber)}&text=${encodeURIComponent(whatsappText)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: pos?.coords?.latitude, lon: pos?.coords?.longitude };
    } catch (e) {
      console.debug('Location error:', e?.message || e);
      return null;
    }
  }, []);

  const triggerEmergency = useCallback(async () => {
    try {
      Vibration.vibrate(300);

      if (tickSound)  playSound(tickSound);
      if (alertSound) setTimeout(() => playSound(alertSound), 500);

      const voice = await getVoice();
      // p.ej.: await voice?.start?.('es-MX');

      const coords = await getCoords();
      console.debug('EMERGENCY coords:', coords);

      const waOk = await sendWhatsApp();
      const callOk = await callPhone();

      if (!waOk && !callOk) {
        Alert.alert('Emergencia', 'No se pudo abrir WhatsApp ni llamar automáticamente.');
      }

      if (testMode) {
        Alert.alert('Modo Prueba', 'Se simuló la emergencia (no se enviaron mensajes reales).');
      }
    } catch (e) {
      console.debug('triggerEmergency error:', e?.message || e);
    } finally {
      setTimeout(stopSound, 5000);
    }
  }, [alertSound, tickSound, sendWhatsApp, callPhone, getCoords, playSound, stopSound, testMode]);

  return { triggerEmergency };
}
