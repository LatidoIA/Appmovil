// CuidadorScreen.js

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then(raw => raw && setProfile(JSON.parse(raw)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/metrics/patient/${patientId}`);
        const data = await res.json();
        const map = {};
        data.forEach(m => { map[m.metric] = m; });
        setMetrics(map);
      } catch (e) {
        console.error(e);
      }
    })();
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
      setPatientId(data.patient_id);
      Alert.alert('¡Éxito!', `Cuidas a ${data.patient_name}`);
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    Clipboard.setString(invitationCode);
    Alert.alert('Copiado', 'Código copiado al portapapeles');
  };

  const shareLink = () => {
    const link = `${BACKEND_URL}/join?code=${invitationCode}`;
    Share.share({ message: `Únete como cuidador: ${link}` });
  };

  const metricsList = [
    ['FC', metrics.heart_rate?.value + 'bpm'],
    ['PA', metrics.blood_pressure?.value + 'mmHg'],
    ['Ánimo', metrics.mood?.value],
    ['Pasos', metrics.steps?.value],
    ['Sueño', metrics.sleep?.value + 'h'],
    ['SPO₂', metrics.spo2?.value + '%'],
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
            <CustomText style={styles.value}>{val || '—'}</CustomText>
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
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
            >
              <CustomText style={styles.closeText}>×</CustomText>
            </TouchableOpacity>

            {loading && (
              <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginVertical: 4 }} />
            )}

            {!loading && mode === null && (
              <>
                <CustomButton
                  title="Código"
                  onPress={generateCode}
                  variant="primary"
                  style={styles.modalBtn}
                />
                <CustomButton
                  title="Unirse"
                  onPress={() => setMode('join')}
                  variant="outline"
                  style={styles.modalBtn}
                />
              </>
            )}

            {!loading && mode === 'generate' && (
              <>
                <CustomText style={styles.modalTitle}>
                  {invitationCode}
                </CustomText>
                <CustomButton
                  title="Copiar"
                  onPress={copyCode}
                  variant="outline"
                  style={styles.modalBtn}
                />
                <CustomButton
                  title="Compartir"
                  onPress={shareLink}
                  variant="outline"
                  style={styles.modalBtn}
                />
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
                <CustomButton
                  title="Ir"
                  onPress={joinWithCode}
                  variant="primary"
                  style={styles.modalBtn}
                />
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
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalBtn: {
    marginBottom: theme.spacing.xs,
  },
});
