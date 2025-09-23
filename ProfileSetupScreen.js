// ProfileSetupScreen.js
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomText from './CustomText';
import CustomButton from './CustomButton';
import theme from './theme';
import { useAuth } from './src/auth/AuthContext';

const PROFILE_KEY = '@latido_profile';

export default function ProfileSetupScreen({ navigation }) {
  const { user, refreshProfileStatus } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    heightCm: '',
    weightKg: '',
    condition: '',
    emergencyName: '',
    emergencyContact: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        const prev = raw ? JSON.parse(raw) : {};
        setForm(f => ({
          ...f,
          ...prev,
          name: prev?.name || user?.name || '',
          email: prev?.email || user?.email || '',
        }));
      } catch {}
    })();
  }, [user]);

  const onChange = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const save = async () => {
    if (!form.name || !form.email) {
      Alert.alert('Faltan datos', 'Completa al menos nombre y correo.');
      return;
    }
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      const payload = {
        ...prev,
        ...form,
        profileCompleted: true,
      };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(payload));
      await refreshProfileStatus();
      navigation.replace('Main');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1 }}>
      <ScrollView contentContainerStyle={styles.container} style={{ backgroundColor: theme.colors.background }}>
        <CustomText style={styles.title}>Configura tu perfil</CustomText>

        <View style={styles.card}>
          <CustomText style={styles.label}>Nombre</CustomText>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={t => onChange('name', t)}
            placeholder="Tu nombre"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <CustomText style={styles.label}>Correo</CustomText>
          <TextInput
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={t => onChange('email', t)}
            placeholder="tucorreo@dominio.com"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <CustomText style={styles.label}>Altura (cm)</CustomText>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(form.heightCm || '')}
            onChangeText={t => onChange('heightCm', t.replace(/[^0-9]/g, ''))}
            placeholder="170"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <CustomText style={styles.label}>Peso (kg)</CustomText>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(form.weightKg || '')}
            onChangeText={t => onChange('weightKg', t.replace(/[^0-9.]/g, ''))}
            placeholder="70"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <CustomText style={styles.label}>Condición/enfermedad relevante</CustomText>
          <TextInput
            style={styles.input}
            value={form.condition}
            onChangeText={t => onChange('condition', t)}
            placeholder="Diabetes, hipertensión, etc."
            placeholderTextColor={theme.colors.textSecondary}
          />

          <CustomText style={styles.label}>Contacto de emergencia (nombre)</CustomText>
          <TextInput
            style={styles.input}
            value={form.emergencyName}
            onChangeText={t => onChange('emergencyName', t)}
            placeholder="Nombre de contacto"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <CustomText style={styles.label}>Contacto de emergencia (teléfono/WhatsApp)</CustomText>
          <TextInput
            style={styles.input}
            value={form.emergencyContact}
            onChangeText={t => onChange('emergencyContact', t)}
            keyboardType="phone-pad"
            placeholder="+56 9 1234 5678"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <CustomButton
          title={saving ? 'Guardando…' : 'Guardar y continuar'}
          onPress={save}
          variant="primary"
          disabled={saving}
          style={{ alignSelf:'center', marginTop: theme.spacing.sm, paddingHorizontal: 24 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.sm },
  title: { fontSize: 20, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, fontFamily: theme.typography.heading.fontFamily, textAlign:'center' },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.shape.borderRadius, padding: theme.spacing.sm,
    ...Platform.select({
      ios: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.1, shadowRadius:2 },
      android: { elevation:2 },
    }),
  },
  label: { color: theme.colors.textSecondary, marginTop: theme.spacing.xs, marginBottom: 4, fontFamily: theme.typography.body.fontFamily },
  input: {
    borderWidth:1, borderColor: theme.colors.outline, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily,
  },
});
