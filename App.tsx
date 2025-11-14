// App.tsx
import React from 'react';
import { SafeAreaView, Text } from 'react-native';

export default function App() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#101010',
      }}
    >
      <Text style={{ color: 'white', fontSize: 24 }}>
        Latido IA release OK
      </Text>
    </SafeAreaView>
  );
}
