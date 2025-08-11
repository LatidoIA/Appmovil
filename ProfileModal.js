import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Button } from 'react-native';
import { ProfileContext } from './ProfileContext';
import theme from './theme';

export default function ProfileModal({ navigation }) {
  const { profile, updateProfile } = useContext(ProfileContext);

  const [form, setForm] = useState({
    nombre: '',
    edad: '',
    peso: '',
    enfermedades: '',
    contactoEmergencia: ''
  });

  useEffect(() => {
    if (profile && typeof profile === 'object') {
      setForm(prev => ({
        ...prev,
        ...profile
      }));
    }
  }, [profile]);

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = () => {
    updateProfile(form);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perfil del Usuario</Text>

      <TextInput
        placeholder="Nombre"
        style={styles.input}
        value={form.nombre}
        onChangeText={(text) => handleChange('nombre', text)}
      />
      <TextInput
        placeholder="Edad"
        style={styles.input}
        keyboardType="numeric"
        value={form.edad}
        onChangeText={(text) => handleChange('edad', text)}
      />
      <TextInput
        placeholder="Peso (kg)"
        style={styles.input}
        keyboardType="numeric"
        value={form.peso}
        onChangeText={(text) => handleChange('peso', text)}
      />
      <TextInput
        placeholder="Enfermedades crónicas"
        style={styles.input}
        value={form.enfermedades}
        onChangeText={(text) => handleChange('enfermedades', text)}
      />
      <TextInput
        placeholder="Contacto de Emergencia"
        style={styles.input}
        keyboardType="phone-pad"
        value={form.contactoEmergencia}
        onChangeText={(text) => handleChange('contactoEmergencia', text)}
      />

      <Button title="Guardar" onPress={handleSave} color={theme.colors.primary} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 10,
    marginBottom: theme.spacing.md,
    borderRadius: theme.shape.borderRadius,
  },
});

