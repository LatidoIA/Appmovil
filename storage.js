// storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@latido_history';

export async function saveToHistory(entry) {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    // Añade la nueva entrada al principio
    arr.unshift(entry);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Error saving history:', e);
  }
}

export async function getHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading history:', e);
    return [];
  }
}
