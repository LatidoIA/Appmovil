// CuidadorScreen.js
// ✅ Expo SDK 53 / RN 0.76
// ✅ Sin dependencias extra (solo expo-clipboard ya instalada)
// ✅ Persistencia vínculo (AsyncStorage)
// ✅ Unirse por código / Generar código
// ✅ Polling de métricas (30s) solo cuando la app está activa
// ✅ UI segura, sin warnings

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

// 🔧 Ajusta si cambias backend:
const BACKEND_URL = 'https://orca-app-njfej.ondigitalocean.app';

const PROFILE_KEY = '@latido_profile';
const CARE_LINK_KEY = '@care_link_v1';

function fmt(val, suffix = '') {
  return val == null ? '—' : `${val}${suffix}`;
}

export default function CuidadorScreen({ onCongratulate }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState(null); // null | 'generate' | 'join'
  const [invitationCode, setInvitationCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({ name: '', email: '' });

  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState(null);

  const [metrics, setMetrics] = useState({});
  const appStateRef = useRef(AppState.currentState || 'active');
  const intervalRef = useRef(null);

  // Cargar perfil
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then((raw) => raw && setProfile(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  // Rehidratar vínculo previo
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CARE_LINK_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setPatientId(saved.patientId || null);
          setPatientName(saved.patientName || '');
        }
      } catch {}
    })();
  }, []);

  // Fetch métricas del paciente vinculado
  const fetchMetrics = async () => {
    if (!patientId) return;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(`${BACKEND_URL}/metrics/patient/${patientId}`, { signal: ctrl.signal });
      clearTimeout(to);

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const map = {};
      (data || []).forEach((m) => {
        // Se espera forma: { metric: 'heart_rate', value: 70, ... }
        if (m && m.metric) map[m.metric] = m;
      });
      setMetrics(map);
    } catch {
      // silencio: mantenemos último estado conocido
    }
  };

  // Primer fetch + polling cada 30s cuando la app está activa
  useEffect(() => {
    if (!patientId) return;
    fetchMetrics();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') fetchMetrics();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [patientId]);

  // Pausar/retomar por AppState
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
    if (!profile.email || !profile.name) {
      return Alert.alert('Perfil incompleto', 'Completa tu nombre y correo en el perfil antes de generar un código.');
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/caregiver/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_email: profile.email, patient_name: profile.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'No se pudo generar el código.');
      setInvitationCode(String(data.code || ''));
      setMode('generate');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo generar el código.');
    } finally {
      setLoading(false);
    }
  };

  const joinWithCode = async () => {
    const code = joinCode.trim();
    if (!code) return Alert.alert('Error', 'Ingresa un código válido.');
    if (!profile.email || !profile.name) {
      return Alert.alert('Perfil incompleto', 'Completa tu nombre y correo en el perfil antes de unirte.');
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/caregiver/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          caregiver_email: profile.email,
          caregiver_name: profile.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Código inválido o expirado.');

      setPatientName(String(data.patient_name || ''));
      setPatientId(data.patient_id || null);

      await AsyncStorage.setItem(
        CARE_LINK_KEY,
        JSON.stringify({ patientId: data.patient_id, patientName: data.patient_name })
      );

      Alert.alert('¡Éxito!', `Ahora cuidas a ${data.patient_name}`);
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo unir con ese código.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(invitationCode);
      Alert.alert('Copiado', 'Código copiado al portapapeles.');
    } catch {
      Alert.alert('Error', 'No se pudo copiar el código.');
    }
  };

  const shareLink = () => {
    const code = invitationCode || '';
    const link = `${BACKEND_URL}/join?code=${encodeURIComponent(code)}`;
    Share.share({ message: `Únete como cuidador: ${link}` }).catch(() => {});
  };

  const unlink = async () => {
    Alert.alert('Desvincular', '¿Seguro que quieres dejar de cuidar a esta persona?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: async () => {
          try {
            // Si agregas endpoint de server para unlink, llámalo aquí.
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
    ['FC', fmt(metrics.heart_rate?.value, ' bpm')],
    ['PA', fmt(metrics.blood_pressure?.value, ' mmHg')],
    ['Ánimo', fmt(metrics.mood?.value)],
    ['Pasos', fmt(metrics.steps?.value)],
    ['Sueño', fmt(metrics.sleep?.value, ' h')],
    ['SPO₂', fmt(metrics.spo2?.value, ' %')],
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <CustomText style={styles.header}>Cuidador</CustomText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {patientId ? (
            <TouchableOpacity onPress={unlink} style={{ marginRight: theme.spacing.sm }}>
              <Ionicons name="unlink-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={openModal}>
            <Ionicons name="add-circle-outline" size={theme.fontSizes.lg} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Paciente */}
      <CustomText style={styles.patientName}>{patientName || 'Sin paciente vinculado'}</CustomText>

      {/* Métricas */}
      <View style={styles.grid}>
        {metricsList.map(([label, val]) => (
          <View key={label} style={styles.card}>
            <CustomText style={styles.value}>{val}</CustomText>
            <CustomText style={styles.label}>{label}</CustomText>
          </View>
        ))}
      </View>

      {/* Felicitar */}
      <CustomButton
        title="🎉  Felicitar"
        onPress={onCongratulate}
        variant="primary"
        style={styles.congratsBtn}
        textStyle={styles.congratsText}
      />

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CustomText style={styles.closeText}>×</CustomText>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginVertical: 8 }} />
            ) : mode === null ? (
              <>
                <CustomButton title="Generar código" onPress={generateCode} variant="primary" style={styles.modalBtn} />
                <CustomButton title="Unirse con código" onPress={() => setMode('join')} variant="outline" style={styles.modalBtn} />
              </>
            ) : mode === 'generate' ? (
              <>
                <CustomText style={styles.modalTitle}>{invitationCode || '—'}</CustomText>
                <CustomButton title="Copiar" onPress={copyCode} variant="outline" style={styles.modalBtn} />
                <CustomButton title="Compartir" onPress={shareLink} variant="outline" style={styles.modalBtn} />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="123456"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  maxLength={12}
                  autoCapitalize="none"
                />
                <CustomButton title="Unirse" onPress={joinWithCode} variant="primary" style={styles.modalBtn} />
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
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
      android: { elevation: 1 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  header: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.textPrimary,
  },
  patientName: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  card: {
    width: '30%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 },
      android: { elevation: 1 },
    }),
  },
  value: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.typography.subtitle.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  label: {
    fontSize: theme.fontSizes.xs || 10,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  congratsBtn: { alignSelf: 'flex-end', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  congratsText: { fontSize: theme.fontSizes.sm, color: theme.colors.background },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '70%', backgroundColor: theme.colors.surface, borderRadius: theme.shape.borderRadius, padding: theme.spacing.sm },
  closeBtn: { position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs },
  closeText: { fontSize: theme.fontSizes.lg, color: theme.colors.textSecondary },
  modalTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.subtitle?.fontFamily || theme.typography.body.fontFamily,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalBtn: { marginBottom: theme.spacing.xs },
});
