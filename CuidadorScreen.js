// CuidadorScreen.js (ADAPTADO: robusto, sin crashes por theme, mejor manejo de estado y polling)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CustomText from './CustomText';
import CustomButton from './CustomButton';
import theme from './theme';

const BACKEND_URL = 'https://orca-app-njfej.ondigitalocean.app';
const PROFILE_KEY = '@latido_profile';
const CARE_LINK_KEY = '@care_link_v1';

function safeFmt(val, suffix = '') {
  return val == null || Number.isNaN(val) ? '—' : `${val}${suffix}`;
}
function tpath(obj, path, fallback = undefined) {
  try {
    return path.split('.').reduce((a, k) => (a && a[k] != null ? a[k] : undefined), obj) ?? fallback;
  } catch {
    return fallback;
  }
}
const T = {
  body: tpath(theme, 'typography.body', { fontFamily: 'System' }),
  heading: tpath(theme, 'typography.heading', { fontFamily: 'System' }),
  subtitle: tpath(theme, 'typography.subtitle', { fontFamily: 'System' }),
};
const F = {
  xs: theme?.fontSizes?.xs ?? 12,
  sm: theme?.fontSizes?.sm ?? 14,
  md: theme?.fontSizes?.md ?? 16,
  lg: theme?.fontSizes?.lg ?? 22,
};

export default function CuidadorScreen({ onCongratulate = () => {} }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState(null); // null | 'generate' | 'join'
  const [invitationCode, setInvitationCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({ name: '', email: '' });
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState(null);

  const [metrics, setMetrics] = useState({});
  const appStateRef = useRef('active');
  const pollRef = useRef(null);

  // Cargar perfil guardado
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // Rehidratar vínculo previo
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CARE_LINK_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setPatientId(saved?.patientId ?? null);
          setPatientName(saved?.patientName ?? '');
        }
      } catch {}
    })();
  }, []);

  // Fetch métricas
  const fetchMetrics = async () => {
    if (!patientId) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${BACKEND_URL}/metrics/patient/${encodeURIComponent(patientId)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const map = {};
      (Array.isArray(data) ? data : []).forEach((m) => {
        if (m && m.metric) map[m.metric] = m;
      });
      setMetrics(map);
    } catch {
      // silencioso; mantenemos último estado
    }
  };

  // Polling cada 30s solo activa
  useEffect(() => {
    if (!patientId) return;
    fetchMetrics();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (appStateRef.current === 'active') fetchMetrics();
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [patientId]);

  // AppState para pausar/reanudar
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      appStateRef.current = s;
      if (s === 'active') fetchMetrics();
    });
    return () => sub.remove();
  }, []);

  const openModal = () => {
    setMode(null);
    setInvitationCode('');
    setJoinCode('');
    setModalVisible(true);
  };

  const generateCode = async () => {
    if (!profile?.email || !profile?.name) {
      return Alert.alert('Falta perfil', 'Completa tu nombre y correo en el perfil primero.');
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/caregiver/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          patient_email: profile.email,
          patient_name: profile.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'No se pudo generar el código.');
      setInvitationCode(String(data?.code ?? '').trim());
      setMode('generate');
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Fallo generando código');
    } finally {
      setLoading(false);
    }
  };

  const joinWithCode = async () => {
    const code = String(joinCode || '').trim();
    if (!code) return Alert.alert('Código requerido', 'Ingresa el código de invitación.');
    if (!profile?.email || !profile?.name) {
      return Alert.alert('Falta perfil', 'Completa tu nombre y correo en el perfil primero.');
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/caregiver/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          code,
          caregiver_email: profile.email,
          caregiver_name: profile.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Código inválido o expirado.');
      const pid = data?.patient_id ?? null;
      const pname = data?.patient_name ?? '';
      setPatientId(pid);
      setPatientName(pname);
      await AsyncStorage.setItem(
        CARE_LINK_KEY,
        JSON.stringify({ patientId: pid, patientName: pname })
      );
      Alert.alert('¡Listo!', `Ahora cuidas a ${pname}`);
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'No fue posible unirse');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(invitationCode);
      Alert.alert('Copiado', 'Código copiado al portapapeles.');
    } catch {
      Alert.alert('Ups', 'No se pudo copiar el código.');
    }
  };

  const shareLink = () => {
    const link = `${BACKEND_URL}/join?code=${encodeURIComponent(invitationCode)}`;
    Share.share({
      message:
        Platform.OS === 'ios'
          ? `Únete como cuidador.\n${link}`
          : `Únete como cuidador: ${link}`,
      url: link, // iOS también usa esto
      title: 'Invitación Cuidador',
    }).catch(() => {});
  };

  const unlink = async () => {
    Alert.alert('Desvincular', '¿Seguro que deseas dejar de cuidar a esta persona?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: async () => {
          try {
            // Si luego hay endpoint, llamarlo aquí.
            await AsyncStorage.removeItem(CARE_LINK_KEY);
            setPatientId(null);
            setPatientName('');
            setMetrics({});
          } catch {}
        },
      },
    ]);
  };

  const metricsList = [
    ['FC', safeFmt(tpath(metrics, 'heart_rate.value'), ' bpm')],
    ['PA', safeFmt(tpath(metrics, 'blood_pressure.value'), ' mmHg')],
    ['Ánimo', safeFmt(tpath(metrics, 'mood.value'))],
    ['Pasos', safeFmt(tpath(metrics, 'steps.value'))],
    ['Sueño', safeFmt(tpath(metrics, 'sleep.value'), ' h')],
    ['SPO₂', safeFmt(tpath(metrics, 'spo2.value'), ' %')],
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <CustomText style={styles.header}>Cuidador</CustomText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {patientId ? (
            <TouchableOpacity onPress={unlink} style={{ marginRight: theme.spacing?.xs ?? 8 }}>
              <Ionicons name="unlink-outline" size={20} color={theme.colors?.error ?? '#D32F2F'} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={openModal}>
            <Ionicons
              name="add-circle-outline"
              size={F.lg}
              color={theme.colors?.accent ?? '#00BFA6'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <CustomText style={styles.patientName}>
        {patientName || 'Sin paciente vinculado'}
      </CustomText>

      <View style={styles.grid}>
        {metricsList.map(([label, val]) => (
          <View key={label} style={styles.card}>
            <CustomText style={styles.value}>{val}</CustomText>
            <CustomText style={styles.label}>{label}</CustomText>
          </View>
        ))}
      </View>

      <CustomButton
        title="🎉  Felicitar"
        onPress={onCongratulate}
        variant="primary"
        style={styles.congratsBtn}
        textStyle={styles.congratsText}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <CustomText style={styles.closeText}>×</CustomText>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors?.accent ?? '#00BFA6'}
                style={{ marginVertical: 6 }}
              />
            ) : mode === null ? (
              <>
                <CustomButton title="Código" onPress={generateCode} variant="primary" style={styles.modalBtn} />
                <CustomButton title="Unirse" onPress={() => setMode('join')} variant="outline" style={styles.modalBtn} />
              </>
            ) : mode === 'generate' ? (
              <>
                <CustomText style={styles.modalTitle}>
                  {invitationCode || '—'}
                </CustomText>
                <CustomButton title="Copiar" onPress={copyCode} variant="outline" style={styles.modalBtn} />
                <CustomButton title="Compartir" onPress={shareLink} variant="outline" style={styles.modalBtn} />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="123456"
                  placeholderTextColor={theme.colors?.textSecondary ?? '#666'}
                  keyboardType="number-pad"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  maxLength={8}
                  autoCapitalize="none"
                />
                <CustomButton title="Ir" onPress={joinWithCode} variant="primary" style={styles.modalBtn} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing?.xs ?? 8,
    backgroundColor: theme.colors?.surface ?? '#FFF',
    borderRadius: theme.shape?.borderRadius ?? 12,
    marginBottom: theme.spacing?.sm ?? 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing?.xs ?? 8,
  },
  header: {
    fontSize: F.md,
    fontFamily: T.heading.fontFamily,
    color: theme.colors?.textPrimary ?? '#111',
  },
  patientName: {
    fontSize: F.md,
    fontFamily: T.heading.fontFamily,
    color: theme.colors?.textPrimary ?? '#111',
    marginBottom: theme.spacing?.xs ?? 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing?.xs ?? 8,
  },
  card: {
    width: '30%',
    backgroundColor: theme.colors?.background ?? '#F7F7F7',
    borderRadius: theme.shape?.borderRadius ?? 12,
    padding: theme.spacing?.xs ?? 8,
    marginBottom: theme.spacing?.xs ?? 8,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 },
      android: { elevation: 1 },
    }),
  },
  value: {
    fontSize: F.sm,
    fontFamily: T.subtitle.fontFamily,
    color: theme.colors?.textPrimary ?? '#111',
    marginBottom: (theme.spacing?.xs ?? 8) / 2,
  },
  label: {
    fontSize: F.xs,
    fontFamily: T.body.fontFamily,
    color: theme.colors?.textSecondary ?? '#666',
  },
  congratsBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: theme.spacing?.sm ?? 12,
    paddingVertical: theme.spacing?.xs ?? 8,
  },
  congratsText: {
    fontSize: F.sm,
    color: theme.colors?.background ?? '#FFF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '74%',
    backgroundColor: theme.colors?.surface ?? '#FFF',
    borderRadius: theme.shape?.borderRadius ?? 12,
    padding: theme.spacing?.sm ?? 12,
  },
  closeBtn: { position: 'absolute', top: theme.spacing?.xs ?? 8, right: theme.spacing?.xs ?? 8 },
  closeText: { fontSize: F.lg, color: theme.colors?.textSecondary ?? '#666' },
  modalTitle: {
    fontSize: F.md,
    fontFamily: T.subtitle.fontFamily,
    color: theme.colors?.textPrimary ?? '#111',
    textAlign: 'center',
    marginVertical: theme.spacing?.sm ?? 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors?.outline ?? '#DDD',
    borderRadius: theme.shape?.borderRadius ?? 12,
    padding: theme.spacing?.sm ?? 12,
    marginBottom: theme.spacing?.sm ?? 12,
    fontFamily: T.body.fontFamily,
    color: theme.colors?.textPrimary ?? '#111',
    textAlign: 'center',
  },
  modalBtn: { marginBottom: theme.spacing?.xs ?? 8 },
});
