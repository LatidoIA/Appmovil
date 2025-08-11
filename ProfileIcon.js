import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ProfileIcon({ navigation: navProp }) {
  const navigation = useNavigation() || navProp;

  const goToProfile = () => {
    navigation.navigate('PerfilModal');
  };

  return (
    <TouchableOpacity onPress={goToProfile} style={{ marginLeft: 16 }}>
      <Ionicons name="person-circle-outline" size={28} color="black" />
    </TouchableOpacity>
  );
}
