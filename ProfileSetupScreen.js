// ProfileSetupScreen.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomText from './CustomText';
import CustomButton from './CustomButton';
import theme from './theme';
import { useAuth } from './auth/AuthContext';

const PROFILE_KEY = '@latido_profile';

export default function ProfileSetupScreen({ navigation }) {
  const { markProfileCompleted } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    gender: '',
    birthdate: '',
    heightCm: '',
    weightKg: '',
    conditions: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        const base = raw ? JSON.parse(raw) : {};
        setForm({
          name: base.name || '',
          email: base.email || '',
          gender: base.gender || '',
          birthdate: base.birthdate || '',
          heightCm: base.heightCm ? String(base.heightCm) : '',
          weightKg: base.weightKg ? String(base.weightKg) : '',
          conditions: Array.isArray(base.conditions) ? base.conditions.join(', ') : (base.conditions || ''),
        });
      } catch {}
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      const currentRaw = await AsyncStorage.getItem(PROFILE_KEY);
      const current = currentRaw ? JSON.parse(currentRaw) : {};
      const next = {
        ...current,
        name: form.name?.trim(),
        email: form.email?.trim(),
        gender: form.gender?.trim(),
        birthdate: form.birthdate?.trim(),
        heightCm: form.heightCm ? parseInt(form.heightCm, 10) : null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        conditions: form.conditions ? form.conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      await markProfileCompleted();
      Alert.alert('Listo', 'Perfil guardado');
      navigation.replace('Main');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} style={{ backgroundColor: theme.colors.background }}>
      <CustomText style={styles.title}>Tu perfil</CustomText>
      <CustomText style={styles.caption}>Completa estos datos para personalizar tu experiencia.</CustomText>

      {[
        { key:'name', label:'Nombre' },
        { key:'email', label:'Email', keyboardType:'email-address' },
        { key:'gender', label:'Sexo (M/F/otro)' },
        { key:'birthdate', label:'Fecha de nacimiento (YYYY-MM-DD)' },
        { key:'heightCm', label:'Estatura (cm)', keyboardType:'numeric' },
        { key:'weightKg', label:'Peso (kg)', keyboardType:'numeric' },
        { key:'conditions', label:'Condiciones (coma separadas)' },
      ].map(f => (
        <View key={f.key} style={styles.inputWrap}>
          <CustomText style={styles.label}>{f.label}</CustomText>
          <TextInput
            style={styles.input}
            value={form[f.key]}
            onChangeText={t => setForm(s => ({ ...s, [f.key]: t }))}
            placeholder=""
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType={f.keyboardType}
          />
        </View>
      ))}

      <CustomButton title={loading ? 'Guardando…' : 'Guardar y continuar'} onPress={save} variant="primary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md },
  title: { fontSize: 20, color: theme.colors.textPrimary, marginBottom: 4, fontFamily: theme.typography.heading.fontFamily },
  caption: { color: theme.colors.textSecondary, marginBottom: theme.spacing.md, fontFamily: theme.typography.body.fontFamily },
  inputWrap: { marginBottom: theme.spacing.sm },
  label: { color: theme.colors.textSecondary, marginBottom: 6, fontFamily: theme.typography.body.fontFamily },
  input: {
    borderWidth: 1, borderColor: theme.colors.outline, borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm, color: theme.colors.textPrimary, backgroundColor: theme.colors.surface,
    ...Platform.select({ android: { paddingVertical: 10 } }),
  },
});
