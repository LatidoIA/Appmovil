// MedicationsScreen.js

import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomText from './CustomText';
import CustomButton from './CustomButton';
import theme from './theme';

const MEDS_KEY = '@latido_meds';

export default function MedicationsScreen() {
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [meds, setMeds] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(MEDS_KEY)
      .then(raw => raw && setMeds(JSON.parse(raw)))
      .catch(console.error);
  }, []);

  const addMed = async () => {
    if (!medName.trim() || !dosage.trim() || !frequency.trim()) {
      Alert.alert('Faltan datos', 'Completa todos los campos');
      return;
    }
    const newMed = { id: Date.now().toString(), medName, dosage, frequency };
    const updated = [newMed, ...meds];
    setMeds(updated);
    await AsyncStorage.setItem(MEDS_KEY, JSON.stringify(updated));
    setMedName('');
    setDosage('');
    setFrequency('');
  };

  const removeMed = async id => {
    const filtered = meds.filter(m => m.id !== id);
    setMeds(filtered);
    await AsyncStorage.setItem(MEDS_KEY, JSON.stringify(filtered));
  };

  const renderItem = ({ item }) => (
    <View style={styles.medItem}>
      <View>
        <CustomText style={styles.medName}>{item.medName}</CustomText>
        <CustomText style={styles.medDetails}>
          {item.dosage} • {item.frequency}
        </CustomText>
      </View>
      <TouchableOpacity onPress={() => removeMed(item.id)}>
        <CustomText style={styles.remove}>Eliminar</CustomText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CustomText style={styles.header}>Ingreso de Medicamentos</CustomText>

      <CustomText style={styles.label}>Nombre del medicamento</CustomText>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Ej. Paracetamol"
          placeholderTextColor={theme.colors.textSecondary}
          value={medName}
          onChangeText={setMedName}
        />
      </View>

      <CustomText style={styles.label}>Dosis</CustomText>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Ej. 500mg"
          placeholderTextColor={theme.colors.textSecondary}
          value={dosage}
          onChangeText={setDosage}
        />
      </View>

      <CustomText style={styles.label}>Frecuencia</CustomText>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Ej. 2 veces al día"
          placeholderTextColor={theme.colors.textSecondary}
          value={frequency}
          onChangeText={setFrequency}
        />
      </View>

      <CustomButton
        title="Agregar"
        onPress={addMed}
        variant="primary"
        style={styles.addButton}
      />

      <FlatList
        data={meds}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={meds.length === 0 && styles.emptyList}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  header: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  input: {
    padding: theme.spacing.sm,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textPrimary,
  },
  addButton: {
    marginVertical: theme.spacing.md,
  },
  medItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  medName: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.subtitle.fontFamily,
    color: theme.colors.textPrimary,
  },
  medDetails: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textSecondary,
  },
  remove: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.error,
  },
  emptyList: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
});
