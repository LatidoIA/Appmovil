// CaregiverScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@latido_profile';
const API_BASE    = 'https://orca-app-njfej.ondigitalocean.app';

export default function CaregiverScreen() {
  const [patientEmail, setPatientEmail] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');

  // Carga el email del paciente desde el perfil
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (raw) {
        const prof = JSON.parse(raw);
        if (prof.email) setPatientEmail(prof.email);
      }
    })();
  }, []);

  // Llama al endpoint /caregiver/invite
  const handleInvite = async () => {
    if (!caregiverName.trim() || !caregiverEmail.trim()) {
      Alert.alert('Datos incompletos', 'Nombre y email del cuidador son obligatorios.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/caregiver/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_email:   patientEmail,
          caregiver_name:  caregiverName,
          caregiver_email: caregiverEmail
        })
      });
      const json = await res.json();
      if (!res.ok) {
        Alert.alert('Error', json.detail || 'No se pudo enviar invitación');
      } else {
        Alert.alert('Éxito', 'Invitación enviada correctamente');
        setCaregiverName('');
        setCaregiverEmail('');
      }
    } catch (e) {
      Alert.alert('Error', 'No se puede conectar con el servidor');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tu correo (paciente):</Text>
      <Text style={styles.value}>{patientEmail || '—'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre del cuidador"
        value={caregiverName}
        onChangeText={setCaregiverName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email del cuidador"
        value={caregiverEmail}
        onChangeText={setCaregiverEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button title="Invitar Cuidador" onPress={handleInvite} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fafafa' },
  label:     { fontSize: 14, color: '#555', marginBottom: 4 },
  value:     { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  input:     {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 6,
    padding: 8, marginBottom: 12, backgroundColor: '#fff'
  }
});
