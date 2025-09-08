// CuidadorScreen.js (ADAPTADO)
// - Persistencia vínculo (AsyncStorage)
// - Generar / unirse por código
// - Desvincular local (y hook para backend si existe)
// - Polling de métricas con AppState y AbortController (timeout)
// - UI segura (placeholder y estados de carga/errores discretos)
// - Sin dependencias nuevas (usa expo-clipboard que ya tienes)

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

// === Config ===
const BACKEND_URL = 'https://orca-app-njfej.ondigitalocean.app';
const PROFILE_KEY = '@latido_profile';
const CARE_LINK_KEY = '@care_link_v1';

// === Utils ===
const fmt = (val, suffix = '') => (val == null ? '—' : `${val}${suffix}`);
const safeJSON = (s, d) => {
  try { return JSON.parse(s); } catch { return d; }
};

// Normaliza códigos (trim + uppercase, solo alfanumérico)
const normalizeCode = (s) => (s || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export default function CuidadorScreen({ onCongratulate = () => {} }) {
  // Estado de UI / vínculo
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState(null); // null | 'generate' | 'join'
  const [invitationCode, setInvitationCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Perfil local (para generar código)
  const [profile, setProfile] = useState({ name: '', email: '' });

  // Vínculo
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState(null);

  // Métricas
  const [metrics, setMetrics] = useState({});

  // Polling control
  const appStateRef = useRef('active');
  const intervalRef = useRef(null);

  // --- Carga perfil
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PROFILE_KEY).catch(() => null);
      if (raw) {
        const p = safeJSON(raw, {});
        setProfile({
          name: p.name || '',
          email: p.email || '',
        });
      }
    })();
  }, []);

  // --- Rehidrata vínculo previo
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(CARE_LINK_KEY).catch(() => null);
      if (!raw) return;
      const saved = safeJSON(raw, {});
      if (saved?.patientId) {
        setPatientId(saved.patientId);
        setPatientName(saved.patientName || '');
      }
    })();
  }, []);

  // --- Fetch métricas (con timeout)
  const fetchMetrics = async () => {
    if (!patientId) return;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(`${BACKEND_URL}/metrics/patient/${patientId}`, { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Esperamos un array [{ metric, value, ... }]
      const map = {};
      if (Array.isArray(data)) {
        data.forEach((m) => { if (m?.metric) map[m.metric] = m; });
      }
      setMetrics(map);
    } catch {
      // silencioso; mantenemos último estado
    }
  };

  // --- Polling cada 30s (solo app activa)
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

  // --- AppState para pausar/resumir
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      appStateRef.current = s;
      if (s === 'active' && patientId) fetchMetrics();
    });
    return () => sub.remove();
  }, [patientId]);

  // --- UI helpers
  const openModal = () => {
    setMode(null);
    setInvitationCode('');
    setJoinCode('');
    setModalVisible(true);
  };

  // --- Generar código (paciente)
  const generateCode = async () => {
    if (!profile.email || !profile.name) {
      return Alert.alert('Perfil incompleto', 'Completa tu nombre y email en Perfil antes de generar un código.');
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/caregiver/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_email: profile.email, patient_name: profile.name }),
      });
      const data = await res.json();
      if (!res.ok || !data?.code) throw new Error(data?.detail || 'No se pudo generar el código.');
      setInvitationCode(String(data.code).toUpperCase());
      setMode('generate');
    } catch (e) {
      Alert.alert('Error', e.message || 'Ocurrió un error al generar el código.');
    } finally {
      setLoading(false);
    }
  };

  // --- Unirse como cuidador con código
  const joinWithCode = async () => {
    const code = normalizeCode(joinCode);
    if (!code) return Alert.alert('Código requerido', 'Ingresa un código válido.');

    if (!profile.email || !profile.name) {
      return Alert.alert('Perfil incompleto', 'Completa tu nombre y email en Perfil antes de unirte.');
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
      if (!res.ok || !data?.patient_id) throw new Error(data?.detail || 'Código inválido o expirado.');

      setPatientId(data.patient_id);
      setPatientName(data.patient_name || '');
      await AsyncStorage.setItem(
        CARE_LINK_KEY,
        JSON.stringify({ patientId: data.patient_id, patientName: data.patient_name || '' })
      );
      setModalVisible(false);
      Alert.alert('¡Éxito!', `Te vinculaste para cuidar a ${data.patient_name}.`);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo completar la vinculación.');
    } finally {
      setLoading(false);
    }
  };

  // --- Copiar / Compartir
  const copyCode = async () => {
    if (!invitationCode) return;
    await Clipboard.setStringAsync(invitationCode);
    Alert.alert('Copiado', 'Código copiado al portapapeles.');
  };

  const shareLink = () => {
    if (!invitationCode) return;
    const link = `${BACKEND_URL}/join?code=${encodeURIComponent(invitationCode)}`;
    Share.share({ message: `Únete como cuidador: ${link}` }).catch(() => {});
  };

  // --- Desvincular
  const unlink = async () => {
    Alert.alert('Desvincular', '¿Seguro que quieres dejar de cuidar a esta persona?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: async () => {
          try {
            // Si tu backend expone un endpoint, llámalo aquí (ejemplo):
            // await fetch(`${BACKEND_URL}/caregiver/unlink`, {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ caregiver_email: profile.email, patient_id: patientId }),
            // });

            await AsyncStorage.removeItem(CARE_LINK_KEY);
            setPatientId(null);
            setPatientName('');
            setMetrics({});
          } catch {
            // incluso si falla el backend, limpiamos local
            await AsyncStorage.removeItem(CARE_LINK_KEY).catch(() => {});
            setPatientId(null);
            setPatientName('');
            setMetrics({});
          }
        },
      },
    ]);
  };

  // --- Render
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
            <Ionicons
              name="add-circle-outline"
              size={theme.fontSizes.lg}
              color={theme.colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      <CustomText style={styles.patientName}>
        {patientName || 'Sin paciente vinculado'}
      </CustomText>

      {/* Métricas */}
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

      {/* Modal Vinculación */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <CustomText style={styles.closeText}>×</CustomText>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginVertical: 8 }} />
            ) : mode === null ? (
              <>
                <CustomButton title="Generar código" onPress={generateCode} variant="primary" style={styles.modalBtn} />
                <CustomButton title="Unirme con código" onPress={() => setMode('join')} variant="outline" style={styles.modalBtn} />
              </>
            ) : mode === 'generate' ? (
              <>
                <CustomText style={styles.modalTitle}>{invitationCode}</CustomText>
                <CustomButton title="Copiar" onPress={copyCode} variant="outline" style={styles.modalBtn} />
                <CustomButton title="Compartir" onPress={shareLink} variant="outline" style={styles.modalBtn} />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="CÓDIGO (p. ej. 3F7K9A)"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType={Platform.select({ ios: 'ascii-capable', android: 'visible-password' })}
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(normalizeCode(t))}
                  maxLength={12}
                />
                <CustomButton title="Unirme" onPress={joinWithCode} variant="primary" style={styles.modalBtn} />
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
  congratsBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  congratsText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '80%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
  },
  closeBtn: { position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs },
  closeText: { fontSize: theme.fontSizes.lg, color: theme.colors.textSecondary },
  modalTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.subtitle.fontFamily,
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
    letterSpacing: 1,
  },
  modalBtn: { marginBottom: theme.spacing.xs },
});
