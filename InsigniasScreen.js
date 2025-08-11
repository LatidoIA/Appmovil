import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// InsigniasScreen muestra las medallas obtenidas y por ganar
export default function InsigniasScreen() {
  const [insignias, setInsignias] = useState([]);

  useEffect(() => {
    // Aquí podrías cargar el estado real desde AsyncStorage o tu backend
    setInsignias([
      { key: 'first-heart', title: 'Primera medición de latido', icon: 'heart-circle', achieved: true },
      { key: 'first-glucose', title: 'Primer ingreso de glucosa', icon: 'water-outline', achieved: true },
      { key: 'three-measurements', title: 'Tres mediciones', icon: 'heart-half', achieved: false },
      { key: 'ten-measurements', title: 'Diez mediciones', icon: 'heart-circle-sharp', achieved: false },
      { key: 'first-challenge', title: 'Primer desafío completado', icon: 'trophy-outline', achieved: false }
    ]);
  }, []);

  const obtenidas = insignias.filter(item => item.achieved);
  const porGanar = insignias.filter(item => !item.achieved);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Sección de Insignias Obtenidas */}
      <Text style={styles.sectionHeader}>Insignias Obtenidas</Text>
      <View style={styles.grid}>
        {obtenidas.map(item => (
          <View key={item.key} style={styles.card}>
            <Ionicons name={item.icon} size={36} color="#FF6347" />
            <Text style={styles.title}>{item.title}</Text>
          </View>
        ))}
      </View>

      {/* Sección de Insignias por Ganar */}
      <Text style={styles.sectionHeader}>Insignias por Ganar</Text>
      <View style={styles.grid}>
        {porGanar.map(item => (
          <View key={item.key} style={styles.card}>
            <Ionicons name={item.icon} size={36} color="#CCCCCC" />
            <Text style={[styles.title, styles.locked]}>{item.title}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#333'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  card: {
    width: '30%',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1
  },
  title: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
    color: '#333'
  },
  locked: {
    color: '#999'
  }
});
