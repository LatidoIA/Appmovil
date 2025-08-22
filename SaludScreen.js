// SaludScreen.js (RAÍZ)
// Fusión con UI original + Health Connect: HR, Steps, Sueño, SpO2, Presión arterial.
// Auto-refresh 15s, quickSetup inicial, y pasa métricas al Cuidador via prop.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  Text as RNText
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LatidoPower } from './LatidoPower';
import CustomText from './CustomText';
import CuidadorScreen from './CuidadorScreen';
import theme from './theme';

import {
  quickSetup,
  readTodaySteps,
  readLatestHeartRate,
  readLatestSpO2,
  readSleepLast24h,
  readLatestBloodPressure,
} from './health';

const PROFILE_KEY = '@latido_profile';
const MEDS_KEY = '@latido_meds';

// ---------- Helpers Vital ----------
function computeVital(metrics = {}, mood) {
  const vals = [];
  if (metrics.heart_rate != null) vals.push(Math.min((metrics.heart_rate / 180) * 100, 100));
  if (metrics.steps      != null) vals.push(Math.min((metrics.steps / 10000) * 100, 100));
  if (metrics.sleep      != null) vals.push(Math.min((metrics.sleep / 8) * 100, 100));
  if (metrics.spo2       != null) vals.push(metrics.spo2);
  if (mood === '😊') vals.push(100);
  else if (mood === '😐') vals.push(50);
  else if (mood === '😔') vals.push(0);

  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const color = avg > 75 ? theme.colors.accent : avg > 50 ? '#FDB827' : theme.colors.error;
  return { score: avg, color };
}

// ---------- Helpers Farmacia (tiempos) ----------
function defaultTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function normalizeToHHMM(input) {
  const digits = String(input || '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return null;
  let hh = '00', mm = '00';
  if (digits.length === 1) { hh = `0${digits}`; mm = '00'; }
  else if (digits.length === 2) { hh = digits; mm = '00'; }
  else if (digits.length === 3) { hh = `0${digits[0]}`; mm = digits.slice(1); }
  else { hh = digits.slice(0, 2); mm = digits.slice(2, 4); }
  const h = Math.max(0, Math.min(23, parseInt(hh, 10)));
  const m = Math.max(0, Math.min(59, parseInt(mm, 10)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function parseHHMMFlexible(s) {
  const norm = s?.includes(':') ? s : normalizeToHHMM(s);
  if (!norm) return null;
  const [hh, mm] = norm.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return { hh, mm };
}
function nextDateForDailyTime(hh, mm) {
  const now = new Date();
  const todayAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  if (now.getTime() <= todayAt
