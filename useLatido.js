// hooks/useLatido.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio, Vibration } from 'expo-av';
import theme from '../theme';

export function useLatido() {
  const [recording, setRecording] = useState(null);
  const [waveform, setWaveform] = useState([]);
  const [recCountdown, setRecCountdown] = useState(0);
  const [isRecCounting, setIsRecCounting] = useState(false);
  const soundRef = useRef(null);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!recording) return;
    clearInterval(recording._meterInterval);
    await recording.stopAndUnloadAsync();
    setIsRecCounting(false);
    const uri = recording.getURI();
    setRecording(null);
    return uri;
  }, [recording]);

  // Start 10s recording
  const startRecording = useCallback(async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording(rec);
      setWaveform([]);
      setRecCountdown(10);
      setIsRecCounting(true);

      const meterInterval = setInterval(async () => {
        const status = await rec.getStatusAsync();
        if (status.metering != null) {
          setWaveform(wf => {
            const next = [...wf, status.metering];
            return next.length > theme.waveformPoints
              ? next.slice(-theme.waveformPoints)
              : next;
          });
        }
      }, theme.waveformInterval);
      rec._meterInterval = meterInterval;
    } catch (e) {
      console.error('Error starting recording', e);
    }
  }, []);

  // Countdown effect
  useEffect(() => {
    let timer;
    if (isRecCounting && recCountdown > 0) {
      timer = setTimeout(() => setRecCountdown(c => c - 1), theme.countdownInterval);
    } else if (isRecCounting && recCountdown === 0) {
      stopRecording();
    }
    return () => clearTimeout(timer);
  }, [recCountdown, isRecCounting, stopRecording]);

  // Play / stop audio
  const playSound = useCallback(async uri => {
    if (!uri) return;
    const { sound } = await Audio.Sound.createAsync({ uri });
    soundRef.current = sound;
    await sound.playAsync();
  }, []);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    playSound,
    stopSound,
    waveform,
    recCountdown,
    isRecCounting
  };
}
