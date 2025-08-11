// FarmaciaScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList, Switch, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CustomText from './CustomText';
import theme from './theme';

const MEDS_KEY  = '@latido_meds';
const QUICK_KEY = '@latido_quick_reminders';

// ---------- Helpers de tiempo (fuera del componente) ----------
function defaultTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
// Normaliza entrada flexible a 'HH:MM'. Acepta '8', '09', '930', '1835', '09:30', etc.
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
  if (now.getTime() <= todayAt.getTime()) return todayAt;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hh, mm, 0, 0);
}
function secondsUntilNextFromStart(startHHMM, intervalHours) {
  const now = new Date();
  const { hh, mm } = startHHMM || { hh: now.getHours(), mm: now.getMinutes() };
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  const stepMs = Math.max(1, parseInt(intervalHours, 10)) * 3600 * 1000;

  if (now.getTime() <= startToday.getTime()) {
    return Math.ceil((startToday.getTime() - now.getTime()) / 1000);
  }
  const passed = now.getTime() - startToday.getTime();
  const k = Math.ceil(passed / stepMs);
  const next = startToday.getTime() + k * stepMs;
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}
function nextOccurrenceForItem(item) {
  const sch = item?.schedule || {};
  // si es "cada X horas" y existe lastTakenAt, usamos eso como base
  if (sch.mode === 'cada') {
    const nHours = Math.max(1, parseInt(sch.everyHours || '8', 10));
    const stepMs = nHours * 3600 * 1000;
    const now = Date.now();
    const base = item.lastTakenAt ? new Date(item.lastTakenAt).getTime() : now;
    if (!Number.isFinite(base)) return new Date(now + stepMs);
    const k = Math.max(1, Math.ceil((now - base) / stepMs));
    return new Date(base + k * stepMs);
  }
  // por hora fija diaria
  const parsed = parseHHMMFlexible(sch.time || item?.time || defaultTime());
  if (!parsed) return null;
  return nextDateForDailyTime(parsed.hh, parsed.mm);
}

export default function FarmaciaScreen({ initialEditId, onEditConsumed }) {
  // Formulario
  const [editingId, setEditingId]     = useState(null);                 // null = creando; id = editando
  const [name, setName]               = useState('');
  const [type, setType]               = useState('medicamento');        // 'medicamento' | 'suplemento'
  const [dose, setDose]               = useState('');                   // "Dosis" (texto libre)
  const [mode, setMode]               = useState('hora');               // 'hora' | 'cada'
  const [timeStr, setTimeStr]         = useState(defaultTime());        // HH:MM (si mode='hora')
  const [everyHours, setEveryHours]   = useState('8');                  // string numérica (si mode='cada')
  const [startStr, setStartStr]       = useState(defaultTime());        // HH:MM (si mode='cada')

  const [list, setList]               = useState([]);

  // Recordatorios rápidos
  const [quick, setQuick] = useState({
    hydrationOn: false, hydrationId: null,
    moveOn: false,      moveId: null
  });

  // Para no re-consumir el initialEditId varias veces
  const consumedRef = useRef(false);

  // ---------- Orden por “próxima toma” (useCallback estable) ----------
  const sortByNext = useCallback((arr) => {
    const INF = Number.MAX_SAFE_INTEGER;
    const toTs = (it) => {
      try {
        const d = nextOccurrenceForItem(it);
        return d ? d.getTime() : INF;
      } catch (e) {
        console.debug('toTs error:', e);
        return INF;
      }
    };
    return [...arr].sort((a, b) => toTs(a) - toTs(b));
  }, []);

  // ---------- Carga/guardado ----------
  const loadMeds = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(MEDS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const normalized = arr.map((x) => {
        if (!x.schedule) {
          return {
            ...x,
            schedule: { mode: 'hora', time: x.time || defaultTime(), everyHours: null, startTime: null }
          };
        }
        return x;
      });
      setList(sortByNext(normalized));
    } catch (e) {
      console.warn('Error leyendo meds:', e);
    }
  }, [sortByNext]);

  const loadQuick = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(QUICK_KEY);
      setQuick(raw ? JSON.parse(raw) : { hydrationOn: false, hydrationId: null, moveOn: false, moveId: null });
    } catch (e) {
      console.warn('Error leyendo quick reminders:', e);
    }
  }, []);

  useEffect(() => { loadMeds(); loadQuick(); }, [loadMeds, loadQuick]);

  const saveMeds = async (arr) => {
    const ordered = sortByNext(arr);
    setList(ordered);
    await AsyncStorage.setItem(MEDS_KEY, JSON.stringify(ordered));
  };

  const saveQuick = async (obj) => {
    setQuick(obj);
    await AsyncStorage.setItem(QUICK_KEY, JSON.stringify(obj));
  };

  // Autoformato en onChange (inserta ':' visual cuando hay >=3 dígitos)
  function onChangeTime(setter) {
    return (txt) => {
      const digits = String(txt || '').replace(/\D/g, '').slice(0, 4);
      if (digits.length <= 2) setter(digits);
      else setter(`${digits.slice(0, 2)}:${digits.slice(2)}`);
    };
  }
  function onBlurTime(value, setter) {
    const norm = normalizeToHHMM(value);
    setter(norm || defaultTime());
  }

  // ---------- Programación de notificaciones ----------
  const scheduleForItem = async (item) => {
    const sch = item.schedule || { mode: 'hora', time: item.time || defaultTime() };
    if (sch.mode === 'hora') {
      const parsed = parseHHMMFlexible(sch.time || defaultTime());
      if (!parsed) throw new Error('Hora inválida');
      const { hh, mm } = parsed;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: item.type === 'suplemento' ? '⏰ Suplemento' : '⏰ Medicamento',
          body: `${item.name}${item.dose ? ` — ${item.dose}` : ''}`,
          data: { type: 'alarm', payload: { pharmaId: item.id, pharmaName: item.name } }
        },
        trigger: Platform.select({
          android: { hour: hh, minute: mm, repeats: true, channelId: 'alarms' },
          ios:     { hour: hh, minute: mm, repeats: true }
        })
      });
      return id;
    } else {
      const nHours = Math.max(1, parseInt(sch.everyHours || '8', 10));
      // desde ahora (o desde lastTakenAt si reprogramamos tras "Tomado")
      const seconds = nHours * 3600;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: item.type === 'suplemento' ? '⏰ Suplemento' : '⏰ Medicamento',
          body: `${item.name}${item.dose ? ` — ${item.dose}` : ''}`,
          data: { type: 'alarm', payload: { pharmaId: item.id, pharmaName: item.name, everyHours: nHours } }
        },
        trigger: { seconds, repeats: true, channelId: Platform.OS === 'android' ? 'alarms' : undefined }
      });
      return id;
    }
  };

  const cancelNotif = async (notifId) => {
    if (!notifId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
    } catch (e) {
      console.debug('cancelNotif warn:', e?.message || e);
    }
  };

  // ---------- CRUD ----------
  const clearForm = () => {
    setEditingId(null);
    setName(''); setType('medicamento'); setDose('');
    setMode('hora'); setTimeStr(defaultTime());
    setEveryHours('8'); setStartStr(defaultTime());
  };

  const addOrUpdate = async () => {
    if (!name.trim()) return Alert.alert('Falta nombre', 'Ingresa el nombre.');
    if (mode === 'hora' && !parseHHMMFlexible(timeStr)) return Alert.alert('Hora inválida', 'Ingresa una hora válida (ej. 930 = 09:30).');
    if (mode === 'cada' && (!everyHours || isNaN(parseInt(everyHours, 10)) || parseInt(everyHours, 10) < 1)) {
      return Alert.alert('Intervalo inválido', 'Indica horas como número entero ≥ 1.');
    }

    const normTime  = normalizeToHHMM(timeStr);
    const normStart = normalizeToHHMM(startStr);

    const schedule = (mode === 'hora')
      ? { mode: 'hora', time: normTime, everyHours: null, startTime: null }
      : { mode: 'cada', time: null, everyHours: String(parseInt(everyHours, 10)), startTime: normStart || defaultTime() };

    if (!editingId) {
      const newItem = {
        id: `${Date.now()}`,
        name: name.trim(),
        type,
        dose: dose.trim(),
        schedule,
        lastTakenAt: null,     // NUEVO: para "cada X horas"
        reminderOn: false,
        notifId: null
      };
      const updated = [newItem, ...list];
      await saveMeds(updated);
      clearForm();
      return;
    }

    const old = list.find(x => x.id === editingId);
    let notifId = old?.notifId || null;
    let reminderOn = !!old?.reminderOn;

    if (reminderOn && notifId) {
      await cancelNotif(notifId);
      try {
        notifId = await scheduleForItem({ ...old, name, type, dose, schedule, id: editingId });
      } catch (e) {
        notifId = null;
        reminderOn = false;
        Alert.alert('Atención', 'No se pudo reprogramar el recordatorio. Vuelve a activarlo.');
      }
    }

    const updated = list.map(x =>
      x.id === editingId
        ? { ...x, name: name.trim(), type, dose: dose.trim(), schedule, notifId, reminderOn }
        : x
    );
    await saveMeds(updated);
    clearForm();
  };

  const editItem = useCallback((item) => {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type);
    setDose(item.dose || '');
    const sch = item.schedule || { mode: 'hora', time: item.time || defaultTime() };
    setMode(sch.mode === 'cada' ? 'cada' : 'hora');
    setTimeStr(sch.time || defaultTime());
    setEveryHours(sch.everyHours ? String(sch.everyHours) : '8');
    setStartStr(sch.startTime || defaultTime());
  }, []);

  const removeItem = async (id) => {
    const found = list.find(x => x.id === id);
    if (found?.notifId) await cancelNotif(found.notifId);
    const updated = list.filter(x => x.id !== id);
    await saveMeds(updated);
    if (editingId === id) clearForm();
  };

  const toggleReminder = async (item) => {
    try {
      if (!item.reminderOn) {
        const notifId = await scheduleForItem(item);
        const updated = list.map(x => x.id === item.id ? { ...x, reminderOn: true, notifId } : x);
        await saveMeds(updated);
      } else {
        await cancelNotif(item.notifId);
        const updated = list.map(x => x.id === item.id ? { ...x, reminderOn: false, notifId: null } : x);
        await saveMeds(updated);
      }
    } catch (e) {
      console.warn('toggleReminder error:', e);
      Alert.alert('Error', 'No se pudo configurar el recordatorio.');
    }
  };

  // ---------- Acciones rápidas ----------
  const snooze15 = async (item) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.type === 'suplemento' ? '⏰ Suplemento (snooze)' : '⏰ Medicamento (snooze)',
          body: `${item.name}${item.dose ? ` — ${item.dose}` : ''}`,
          data: { type: 'alarm', payload: { pharmaId: item.id, pharmaName: item.name, snooze: 15 } }
        },
        trigger: { seconds: 15 * 60, repeats: false, channelId: Platform.OS === 'android' ? 'alarms' : undefined }
      });
      Alert.alert('Programado', 'Te avisamos en 15 minutos.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo programar el snooze.');
    }
  };

  const markTaken = async (item) => {
    try {
      const nowIso = new Date().toISOString();
      let updatedItem = { ...item, lastTakenAt: nowIso };

      // Si es "cada X horas" y está activo, reprograma desde ahora
      if (item.reminderOn && item.schedule?.mode === 'cada') {
        if (item.notifId) await cancelNotif(item.notifId);
        try {
          const newId = await scheduleForItem(updatedItem); // schedule desde ahora
          updatedItem = { ...updatedItem, notifId: newId, reminderOn: true };
        } catch (e) {
          updatedItem = { ...updatedItem, notifId: null, reminderOn: false };
          Alert.alert('Atención', 'No se pudo reprogramar el recordatorio. Vuelve a activarlo.');
        }
      }

      const updated = list.map(x => x.id === item.id ? updatedItem : x);
      await saveMeds(updated);
      Alert.alert('¡Listo!', 'Marcado como tomado.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo marcar como tomado.');
    }
  };

  // ---------- Consumo de initialEditId (abrir en modo edición) ----------
  useEffect(() => {
    if (!initialEditId || consumedRef.current) return;
    const found = list.find(x => x.id === initialEditId);
    if (found) {
      editItem(found);
      consumedRef.current = true;
      try {
        onEditConsumed?.();
      } catch (e) {
        console.debug('onEditConsumed callback error:', e?.message || e);
      }
    }
  }, [initialEditId, list, onEditConsumed, editItem]);

  // ---------- Recordatorios rápidos ----------
  const toggleHydration = async () => {
    try {
      if (!quick.hydrationOn) {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: '💧 Hidratación', body: 'Toma agua', data: { type: 'alarm', payload: { habit: 'hydration' } } },
          trigger: { seconds: 7200, repeats: true, channelId: Platform.OS === 'android' ? 'alarms' : undefined } // cada 2h
        });
        await saveQuick({ ...quick, hydrationOn: true, hydrationId: id });
      } else {
        if (quick.hydrationId) await cancelNotif(quick.hydrationId);
        await saveQuick({ ...quick, hydrationOn: false, hydrationId: null });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo configurar hidratación.');
    }
  };

  const toggleMove = async () => {
    try {
      if (!quick.moveOn) {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: '🏃 Moverse', body: 'Ponte de pie y camina un poco', data: { type: 'alarm', payload: { habit: 'move' } } },
          trigger: { seconds: 3600, repeats: true, channelId: Platform.OS === 'android' ? 'alarms' : undefined } // cada 1h
        });
        await saveQuick({ ...quick, moveOn: true, moveId: id });
      } else {
        if (quick.moveId) await cancelNotif(quick.moveId);
        await saveQuick({ ...quick, moveOn: false, moveId: null });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo configurar movimiento.');
    }
  };

  // ---------- UI ----------
  const renderItem = ({ item }) => {
    const sch = item.schedule || { mode: 'hora', time: item.time };
    const isSupp = item.type === 'suplemento';
    const subtitle =
      sch.mode === 'hora'
        ? `${isSupp ? 'Suplemento' : 'Medicamento'} • Diario a las ${sch.time}`
        : `${isSupp ? 'Suplemento' : 'Medicamento'} • Cada ${sch.everyHours} h${sch.startTime ? ` (desde ${sch.startTime})` : ''}`;

    return (
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <CustomText style={styles.itemTitle}>
            {item.name}{item.dose ? ` — ${item.dose}` : ''}
          </CustomText>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <CustomText style={styles.itemSubtitle}>{subtitle}</CustomText>
            {!item.reminderOn && (
              <View style={styles.pausedChip}>
                <CustomText style={styles.pausedChipText}>Pausado</CustomText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => snooze15(item)} style={[styles.smallBtn, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline }]}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => markTaken(item)} style={[styles.smallBtn, { backgroundColor: theme.colors.accent }]}>
            <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
          </TouchableOpacity>

          <Switch value={!!item.reminderOn} onValueChange={() => toggleReminder(item)} />
          <TouchableOpacity onPress={() => editItem(item)} style={[styles.iconBtn, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeItem(item.id)} style={[styles.iconBtn, { backgroundColor: theme.colors.error }]}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Formulario (sin título "Agregar") */}
      <View style={styles.row}>
        <View style={styles.col}>
          <CustomText style={styles.label}>Nombre</CustomText>
          <TextInput value={name} onChangeText={setName} placeholder="Metformina / Omega 3" style={styles.input} />
        </View>
        <View style={[styles.col, { maxWidth: 160 }]}>
          <CustomText style={styles.label}>Hora</CustomText>
          <TextInput
            value={timeStr}
            onChangeText={onChangeTime(setTimeStr)}
            onBlur={() => onBlurTime(timeStr, setTimeStr)}
            placeholder="08:00"
            keyboardType="number-pad"
            maxLength={5}
            style={[styles.input, mode !== 'hora' && styles.inputDisabled]}
            editable={mode === 'hora'}
          />
        </View>
      </View>

      <CustomText style={styles.label}>Dosis</CustomText>
      <TextInput value={dose} onChangeText={setDose} placeholder="500 mg / 1 cápsula" style={styles.input} />

      {/* Tipo */}
      <View style={styles.typeRow}>
        <TypeChip label="Medicamento" active={type === 'medicamento'} onPress={() => setType('medicamento')} />
        <TypeChip label="Suplemento"  active={type === 'suplemento'}  onPress={() => setType('suplemento')} />
      </View>

      {/* Frecuencia */}
      <CustomText style={[styles.label, { marginTop: 4 }]}>Frecuencia</CustomText>
      <View style={styles.typeRow}>
        <TypeChip label="Hora fija"     active={mode === 'hora'} onPress={() => setMode('hora')} />
        <TypeChip label="Cada X horas"  active={mode === 'cada'} onPress={() => setMode('cada')} />
      </View>

      {mode === 'cada' && (
        <View style={styles.row}>
          <View style={styles.col}>
            <CustomText style={styles.label}>Horas (entero)</CustomText>
            <TextInput
              value={everyHours}
              onChangeText={setEveryHours}
              placeholder="8"
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <View style={[styles.col, { maxWidth: 160 }]}>
            <CustomText style={styles.label}>Inicio</CustomText>
            <TextInput
              value={startStr}
              onChangeText={onChangeTime(setStartStr)}
              onBlur={() => onBlurTime(startStr, setStartStr)}
              placeholder="08:00"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.input}
            />
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity onPress={addOrUpdate} style={styles.primaryBtn}>
          <CustomText style={styles.btnText}>{editingId ? 'Guardar' : 'Agregar'}</CustomText>
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity onPress={clearForm} style={styles.secondaryBtn}>
            <CustomText style={styles.btnTextAlt}>Cancelar</CustomText>
          </TouchableOpacity>
        )}
      </View>

      <CustomText style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Lista</CustomText>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<CustomText style={styles.empty}>Sin registro</CustomText>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <CustomText style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Recordatorios rápidos</CustomText>
      <QuickRow title="💧 Hidratación cada 2 horas" value={quick.hydrationOn} onValueChange={toggleHydration} />
      <QuickRow title="🏃 Moverse cada 1 hora" value={quick.moveOn} onValueChange={toggleMove} />
    </View>
  );
}

function TypeChip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <CustomText style={[styles.chipText, active && styles.chipTextActive]}>{label}</CustomText>
    </TouchableOpacity>
  );
}

function QuickRow({ title, value, onValueChange }) {
  return (
    <View style={styles.quickRow}>
      <CustomText style={styles.quickTitle}>{title}</CustomText>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md, backgroundColor: theme.colors.background },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily,
    marginBottom: theme.spacing.sm
  },
  label: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily,
    marginBottom: 4
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textPrimary
  },
  inputDisabled: { opacity: 0.5 },

  row: { flexDirection: 'row', gap: theme.spacing.sm },
  col: { flex: 1 },

  typeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  chip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.shape.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },
  chipTextActive: { color: '#fff' },

  actions: { marginTop: theme.spacing.xs, flexDirection: 'row', gap: theme.spacing.sm },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  btnText: { color: '#fff', fontFamily: theme.typography.body.fontFamily },
  btnTextAlt: { color: theme.colors.textPrimary, fontFamily: theme.typTypography?.body?.fontFamily || theme.typography.body.fontFamily },

  empty: { marginTop: theme.spacing.sm, color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm
  },
  itemTitle: { color: theme.colors.textPrimary, fontFamily: theme.typography.subtitle.fontFamily },
  itemSubtitle: { color: theme.colors.textSecondary, fontFamily: theme.typTypography?.body?.fontFamily || theme.typography.body.fontFamily, marginTop: 2 },

  pausedChip: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  pausedChipText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.typography.body.fontFamily },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center'
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center'
  },

  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    justifyContent: 'space-between'
  },
  quickTitle: { color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily }
});
