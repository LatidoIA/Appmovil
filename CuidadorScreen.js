// CuidadorScreen.js (Snack original + persistencia, desvincular y polling 15s)

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CustomText from './CustomText';
import CustomButton from './CustomButton';
import theme from './theme';

const BACKEND_URL = 'https://orca-app-njfej.ondigitalocean.app';
const PROFILE_KEY = '@latido_profile';
// Persistencia del vínculo
const CARE_LINK_ID = '@latido_care_patient_id';
const CARE_LINK_NAME = '@latido_care_patient_name';

export default function CuidadorScreen({ onCongratulate }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState(null);
  const [invitationCode, setInvitationCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '' });

  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState(null);

  const [metrics, setMetrics] = useState({});
  const [lastAt, setLastAt] = useState(null);
  const pollRef = useRef(null);

  // Cargar perfil + vínculo persistido
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch {}
      try {
        const [pid, pname] = await Promise.all([
          AsyncStorage.getItem(CARE_LINK_ID),
          AsyncStorage.getItem(CARE_LINK_NAME),
        ]);
        if (pid) setPatientId(pid);
        if (pname) setPatientName(pname);
      } catch {}
    })();
  }, []);

  // Fetch + polling cuando hay vínculo
  useEffect(() => {
    if (!patientId) {
      setMetrics({});
      setLastAt(null);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const fetchOnce = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/metrics/patient/${patientId}`);
        const data = await res.json();
        const map = {};
        (Array.isArray(data) ? data : []).forEach(m => { map[m.metric] = m; });
        setMetrics(map);
        setLastAt(new Date());
      } catch {
        // mantenemos últimos valores si falla
      }
    };

    fetchOnce();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchOnce, 15000);

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [patientId]);

  const openModal = () => {
    setMode(null);
    setInvitationCode('');
    setJoinCode('');
    setModalVisible(true);
  };

  const generateCode = async () => {
    if (!profile.email || !profile.name) {
      return Alert.alert('Error', 'Completa tu perfil primero.');
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/caregiver/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_email: profile.email,
          patient_name: profile.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      setInvitationCode(data.code);
      setMode('generate');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const joinWithCode = async () => {
    if (!joinCode.trim()) {
      return Alert.alert('Error', 'Ingresa un código.');
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/caregiver/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode,
          caregiver_email: profile.email,
          caregiver_name: profile.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Código inválido');
      setPatientName(data.patient_name);
      setPatientId(String(data.patient_id));
      await AsyncStorage.multiSet([
        [CARE_LINK_ID, String(data.patient_id)],
        [CARE_LINK_NAME, data.patient_name || ''],
      ]);
      Alert.alert('¡Éxito!', `Cuidas a ${data.patient_name}`);
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    try {
      await AsyncStorage.multiRemove([CARE_LINK_ID, CARE_LINK_NAME]);
      setPatientId(null);
      setPatientName('');
      setMetrics({});
      setLastAt(null);
      Alert.alert('Listo', 'Vínculo eliminado.');
    } catch {}
  };

  const copyCode = () => {
    Clipboard.setStringAsync(invitationCode);
    Alert.alert('Copiado', 'Código copiado al portapapeles');
  };

  const shareLink = () => {
    const link = `${BACKEND_URL}/join?code=${invitationCode}`;
    Share.share({ message: `Únete como cuidador: ${link}` });
  };

  // Formateo seguro: 0s cuando no hay vínculo, “—” si hay vínculo y falta dato
  const linked = !!patientId;
  const hrText   = linked ? (metrics.heart_rate?.value != null ? `${metrics.heart_rate.value} bpm` : '—') : '0 bpm';
  const bpText   = linked ? (metrics.blood_pressure?.value ? `${metrics.blood_pressure.value} mmHg` : '—') : '0 mmHg';
  const moodText = linked ? (metrics.mood?.value ?? '—') : '—';
  const stepsTxt = linked ? (metrics.steps?.value ?? '—') : '0';
  const sleepTxt = linked ? (metrics.sleep?.value != null ? `${metrics.sleep.value} h` : '—') : '0 h';
  const spo2Txt  = linked ? (metrics.spo2?.value != null ? `${metrics.spo2.value}%` : '—') : '0 %';

  const metricsList = [
    ['FC',    hrText],
    ['PA',    bpText],
    ['Ánimo', moodText],
    ['Pasos', stepsTxt],
    ['Sueño', sleepTxt],
    ['SPO₂',  spo2Txt],
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <CustomText style={styles.header}>Cuidador</CustomText>
        <TouchableOpacity onPress={openModal}>
          <Ionicons name="add-circle-outline" size={theme.fontSizes.lg} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <CustomText style={styles.patientName}>
        {patientName || 'Paciente'}
      </CustomText>

      <View style={styles.grid}>
        {metricsList.map(([label, val]) => (
          <View key={label} style={styles.card}>
            <CustomText style={styles.value}>{val}</CustomText>
            <CustomText style={styles.label}>{label}</CustomText>
          </View>
        ))}
      </View>

      {linked && (
        <CustomText style={styles.updatedAt}>
          Última actualización: {lastAt ? lastAt.toLocaleTimeString() : '—'}
        </CustomText>
      )}

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

            {loading && <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginVertical: 4 }} />}

            {!loading && mode === null && (
              <>
                <CustomButton title="Código" onPress={generateCode} variant="primary" style={styles.modalBtn} />
                <CustomButton title="Unirse" onPress={() => setMode('join')} variant="outline" style={styles.modalBtn} />
                {linked && (
                  <CustomButton title="Desvincular" onPress={unlink} variant="outline" style={styles.modalBtn} />
                )}
              </>
            )}

            {!loading && mode === 'generate' && (
              <>
                <CustomText style={styles.modalTitle}>{invitationCode}</CustomText>
                <CustomButton title="Copiar" onPress={copyCode} variant="outline" style={styles.modalBtn} />
                <CustomButton title="Compartir" onPress={shareLink} variant="outline" style={styles.modalBtn} />
              </>
            )}

            {!loading && mode === 'join' && (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="123456"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={joinCode}
                  onChangeText={setJoinCode}
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
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing.sm,
    ...Platform.select({
      ios: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.1, shadowRadius:1 },
      android: { elevation:1 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent:'space-between',
    alignItems:'center',
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
    flexDirection:'row',
    flexWrap:'wrap',
    justifyContent:'space-between',
    marginBottom: theme.spacing.xs,
  },
  card: {
    width:'30%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    alignItems:'center',
    ...Platform.select({
      ios: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:1 },
      android: { elevation:1 },
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
  updatedAt: {
    alignSelf: 'flex-end',
    fontSize: theme.fontSizes.xs || 10,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
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
    width: '70%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
  },
  closeBtn: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
  },
  closeText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
  },
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
    fontFamily: theme.typTypography?.body?.fontFamily || theme.typography.body.fontFamily,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalBtn: {
    marginBottom: theme.spacing.xs,
  },
});
