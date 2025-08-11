import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

// Lista de artículos con sus imágenes, extractos y contenido completo
const articles = [
  {
    id: '1',
    title: 'Cómo el Estrés Impacta tu Frecuencia Cardíaca',
    image: require('./assets/stress.png'),
    excerpt: 'El estrés activa la respuesta de "lucha o huida" y libera hormonas que aumentan tu ritmo cardíaco.',
    content: `El estrés activa la respuesta de "lucha o huida" y libera hormonas como el cortisol y la adrenalina, haciendo que tu corazón lata más rápido. Este mecanismo evolutivo te prepara para enfrentar peligros inmediatos, pero en la vida moderna el estrés constante puede llevar a un ritmo cardíaco elevado de forma prolongada, aumentando el riesgo de hipertensión y enfermedades cardiovasculares.

Monitorear tu frecuencia cardíaca en situaciones de estrés te ayuda a identificar patrones y momentos críticos. Con esa información, puedes implementar técnicas de relajación como respiración profunda, meditación y pausas activas para reducir los niveles de estrés y mejorar tu salud cardíaca a largo plazo.`,
  },
  {
    id: '2',
    title: 'Importancia del Peso Corporal para la Salud Cardiaca',
    image: require('./assets/weight.png'),
    excerpt: 'El exceso de peso puede incrementar la carga sobre tu corazón y elevar la presión arterial.',
    content: `Mantener un peso saludable es clave para reducir la carga de trabajo del corazón. El exceso de grasa corporal requiere que el corazón bombee más sangre para abastecer tejidos adicionales, lo que puede elevar la presión arterial y aumentar el riesgo de insuficiencia cardíaca.

Adoptar hábitos de alimentación equilibrada y actividad física regular ayuda a controlar el peso y mejora la eficiencia cardiovascular. El seguimiento de tu índice de masa corporal (IMC) y la composición corporal, junto con mediciones de frecuencia cardíaca, te permite ajustar tu plan de salud de forma personalizada.`,
  },
  {
    id: '3',
    title: 'Zonas de Frecuencia Cardíaca para Optimizar tu Entrenamiento',
    image: require('./assets/zones.png'),
    excerpt: 'Entrenar en zonas específicas favorece diferentes beneficios: quema de grasa y mejora aeróbica.',
    content: `Existen varias zonas de entrenamiento basadas en tu frecuencia cardíaca máxima (FCM):

1. Zona de recuperación (50–60% FCM): mejora la circulación y acelera la recuperación.
2. Zona de quema de grasa (60–70% FCM): optimiza la utilización de grasa como fuente de energía.
3. Zona aeróbica (70–80% FCM): mejora la capacidad pulmonar y cardiovascular.
4. Zona de umbral anaeróbico (80–90% FCM): aumenta la potencia y la resistencia.
5. Zona máxima (90–100% FCM): entrenamientos de alta intensidad para mejorar la velocidad y fuerza.

Monitorea tu frecuencia cardíaca durante tus sesiones para mantenerte en la zona adecuada y maximizar tus resultados.`,
  },
  {
    id: '4',
    title: 'Prevención del Sobreentrenamiento: Señales y Consejos',
    image: require('./assets/overtrain.png'),
    excerpt: 'El sobreentrenamiento puede llevar a fatiga crónica y alteraciones del ritmo cardíaco.',
    content: `El sobreentrenamiento ocurre cuando no das tiempo suficiente para recuperarte entre sesiones. Los signos incluyen fatiga persistente, insomnio, irritabilidad y frecuencia cardíaca en reposo elevada.

Para prevenirlo: 
- Programa días de descanso y entrenamientos de baja intensidad.
- Asegura un sueño reparador de 7–9 horas.
- Mantén una alimentación rica en nutrientes y adecuada en calorías.
- Monitorea tu frecuencia cardíaca en reposo; un aumento sostenido puede indicar falta de recuperación.

Escuchar a tu cuerpo y ajustar la carga de entrenamiento es esencial para mantener un progreso saludable a largo plazo.`,
  },
];

export default function ArticulosScreen() {
  const [selected, setSelected] = useState(null);

  // Vista de detalle de un artículo
  if (selected) {
    return (
      <ScrollView contentContainerStyle={styles.detailContainer}>
        <TouchableOpacity onPress={() => setSelected(null)} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Image source={selected.image} style={styles.detailImage} />
        <Text style={styles.detailTitle}>{selected.title}</Text>
        <Text style={styles.detailContent}>{selected.content}</Text>
      </ScrollView>
    );
  }

  // Lista de artículos
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {articles.map(article => (
        <TouchableOpacity
          key={article.id}
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => setSelected(article)}
        >
          <Image source={article.image} style={styles.image} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.excerpt}>{article.excerpt}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fafafa' },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  detailContainer: { padding: 16, backgroundColor: '#fafafa' },
  backButton: { marginBottom: 12 },
  backText: { color: 'tomato', fontSize: 16 },
  detailImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  detailContent: { fontSize: 16, color: '#555', lineHeight: 24 },
});
