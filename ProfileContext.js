import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ProfileContext = createContext(null);
const PROFILE_KEY = '@latido_profile';
const HISTORY_KEY = '@latido_history';

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then(raw => raw && setProfile(JSON.parse(raw)))
      .catch(console.error);
    AsyncStorage.getItem(HISTORY_KEY)
      .then(raw => raw && setHistory(JSON.parse(raw)))
      .catch(console.error);
  }, []);

  const updateProfile = async (newProfile) => {
    setProfile(newProfile);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
  };

  const addHistoryRecord = async (record) => {
    const updated = [record, ...history];
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, history, addHistoryRecord }}>
      {children}
    </ProfileContext.Provider>
  );
}
