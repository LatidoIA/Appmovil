// ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@latido_profile';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [weight, setWeight] = useState('');
  const [conditions, setConditions] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [shareLocation, setShareLocation] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        console.log('ProfileScreen: carga raw ➜', raw);
        if (raw) {
          const prof = JSON.parse(raw);
          console.log('ProfileScreen: perfil parseado ➜', prof);
          setName(prof.name || '');
          setAge(prof.age || '');
          setEmail(prof.email || '');
          setWeight(prof.weight || '');
          setConditions(prof.conditions || '');
          setEmergencyName(prof.emergencyName || '');
          setEmergencyContact(prof.emergencyContact || '');
          setShareLocation(!!prof.shareLocation);
        }
      } catch (e) {
        console.error('ProfileScreen load error', e);
      }
    })();
  }, []);

  const saveProfile = async () => {
    if (
      !name.trim() ||
      !age.trim() ||
      !email.trim() ||
      !emergencyName.trim() ||
      !emergencyContact.trim()
    ) {
      Alert.alert(
        'Campos incompletos',
        'Nombre, edad, email y contacto de emergencia son obligatorios.'
      );
      return;
    }

    const prof = {
      name,
      age,
      email,
      weight,
      conditions,
      emergencyName,
      emergencyContact,
      shareLocation,
    };
    console.log('ProfileScreen: guardando perfil ➜', prof);
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(prof));
      Alert.alert('Guardado', 'Perfil actualizado correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error('ProfileScreen save error', e);
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Perfil de Usuario</Text>

      <Text>Nombre:</Text>
      <TextInput
        style={styles.input}
        placeholder="Tu nombre"
        value={name}
        onChangeText={setName}
      />

      <Text>Edad:</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. 30"
        keyboardType="numeric"
        value={age}
        onChangeText={setAge}
      />

      <Text>Email:</Text>
      <TextInput
        style={styles.input}
        placeholder="usuario@ejemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Text>Peso (kg):</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. 70"
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />

      <Text>Antecedentes médicos:</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Diabetes, hipertensión..."
        multiline
        value={conditions}
        onChangeText={setConditions}
      />

      <Text>Contacto de emergencia (nombre):</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Juan Pérez"
        value={emergencyName}
        onChangeText={setEmergencyName}
      />

      <Text>Contacto de emergencia (teléfono):</Text>
      <TextInput
        style={styles.input}
        placeholder="+569XXXXXXXX"
        keyboardType="phone-pad"
        value={emergencyContact}
        onChangeText={setEmergencyContact}
      />

      <View style={styles.switchRow}>
        <Text>Compartir ubicación:</Text>
        <Switch value={shareLocation} onValueChange={setShareLocation} />
      </View>

      <Button title="Guardar Perfil" onPress={saveProfile} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
});

