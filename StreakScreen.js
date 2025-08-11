// StreakScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CustomText from './CustomText';
import theme from './theme';

const STREAK_CNT   = '@streak_count';
const STREAK_LAST  = '@streak_last_open';
const STREAK_BEST  = '@streak_best';

function dateOnlyStr(d = new Date()) {
  // YYYY-MM-DD en horario local
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetweenUTC(aStr, bStr) {
  // ambos en formato YYYY-MM-DD
  const [ay, am, ad] = aStr.split('-').map(n => parseInt(n, 10));
  const [by, bm, bd] = bStr.split('-').map(n => parseInt(n, 10));
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  const diff = Math.round((b - a) / (24 * 3600 * 1000));
  return diff;
}

const MESSAGES = {
  3:  '¡Genial! Completaste 3 días seguidos. Mantén el ritmo 👏',
  7:  '¡Una semana completa! 7 días seguidos 🔥',
  30: '¡Un mes de constancia! 30 días seguidos 🏆'
};

export default function StreakScreen() {
  const [count, setCount] = useState(0);
  const [best, setBest]   = useState(0);
  const [last, setLast]   = useState(null); // YYYY-MM-DD
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [cr, lr, br] = await Promise.all([
        AsyncStorage.getItem(STREAK_CNT),
        AsyncStorage.getItem(STREAK_LAST),
        AsyncStorage.getItem(STREAK_BEST)
      ]);
      setCount(parseInt(cr || '0', 10) || 0);
      setBest(parseInt(br || '0', 10) || 0);
      setLast(lr || null);
    } catch (e) {
      setCount(0); setBest(0); setLast(null);
    }
  }, []);

  const updateToday = useCallback(async () => {
    const today = dateOnlyStr(new Date());
    try {
      const [cr, lr, br] = await Promise.all([
        AsyncStorage.getItem(STREAK_CNT),
        AsyncStorage.getItem(STREAK_LAST),
        AsyncStorage.getItem(STREAK_BEST)
      ]);
      let cnt  = parseInt(cr || '0', 10) || 0;
      let best = parseInt(br || '0', 10) || 0;
      const last = lr || null;

      if (!last) {
        // primera vez
        cnt = 1;
      } else {
        const diff = daysBetweenUTC(last, today);
        if (diff === 0) {
          // ya contamos hoy, no cambia cnt
        } else if (diff === 1) {
          cnt += 1; // día consecutivo
        } else if (diff > 1) {
          cnt = 1;  // se rompió la racha
        } else if (diff < 0) {
          // reloj del sistema cambió hacia atrás; mantenemos cnt y actualizamos last a hoy
        }
      }

      if (cnt > best) best = cnt;

      await AsyncStorage.multiSet([
        [STREAK_CNT,  String(cnt)],
        [STREAK_LAST, today],
        [STREAK_BEST, String(best)]
      ]);

      setCount(cnt);
      setBest(best);
      setLast(today);

      // mensaje de hito si corresponde
      if (MESSAGES[cnt]) setMessage(MESSAGES[cnt]);
      else setMessage(null);

    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar la racha.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      await updateToday(); // registra apertura de hoy al entrar
      setLoading(false);
    })();
  }, [load, updateToday]);

  const manualRefresh = async () => {
    setLoading(true);
    await updateToday();
    setLoading(false);
  };

  const resetStreak = async () => {
    Alert.alert('Reiniciar racha', '¿Seguro que deseas reiniciar el contador actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: async () => {
          try {
            const today = dateOnlyStr();
            await AsyncStorage.multiSet([
              [STREAK_CNT, '1'],
              [STREAK_LAST, today]
            ]);
            setCount(1);
            setLast(today);
            setMessage(null);
          } catch (e) {
            Alert.alert('Error', 'No se pudo reiniciar.');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>Racha</CustomText>

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="flame" size={24} color={theme.colors.accent} />
          <CustomText style={[styles.big, { marginLeft: 8 }]}>{count} {count === 1 ? 'día' : 'días'}</CustomText>
        </View>

        {loading ? (
          <CustomText style={styles.helper}>Actualizando…</CustomText>
        ) : (
          <>
            <CustomText style={styles.helper}>
              Última apertura registrada: {last || '—'}
            </CustomText>
            <CustomText style={styles.helper}>
              Mejor racha: {best} {best === 1 ? 'día' : 'días'}
            </CustomText>

            {!!message && (
              <View style={styles.badge}>
                <Ionicons name="trophy-outline" size={18} color={theme.colors.accent} />
                <CustomText style={styles.badgeText}>{message}</CustomText>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity onPress={manualRefresh} style={styles.primaryBtn}>
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <CustomText style={styles.btnText}>Actualizar</CustomText>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetStreak} style={styles.secondaryBtn}>
                <Ionicons name="backspace-outline" size={18} color={theme.colors.textPrimary} />
                <CustomText style={styles.btnTextAlt}>Reiniciar</CustomText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.tipCard}>
        <CustomText style={styles.tipTitle}>Consejo</CustomText>
        <CustomText style={styles.tipText}>
          Abre la app al menos una vez al día para mantener tu racha. Si quieres que la racha se
          actualice sin abrir esta pantalla, puedo añadirlo al arranque de la app en un siguiente paso.
        </CustomText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  title: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading.fontFamily
  },

  card: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },

  row: { flexDirection: 'row', alignItems: 'center' },
  big: { fontSize: theme.fontSizes.lg, color: theme.colors.textPrimary, fontFamily: theme.typography.subtitle.fontFamily },

  helper: { marginTop: 4, color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily },

  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: theme.shape.borderRadius, borderWidth: 1, borderColor: theme.colors.outline
  },
  btnText: { color: '#fff', fontFamily: theme.typography.body.fontFamily },
  btnTextAlt: { color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },

  badge: {
    marginTop: theme.spacing.sm,
    padding: 10,
    borderRadius: theme.shape.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  badgeText: { color: theme.colors.textPrimary, fontFamily: theme.typography.body.fontFamily },

  tipCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },
  tipTitle: { color: theme.colors.textPrimary, fontFamily: theme.typography.subtitle.fontFamily, marginBottom: 6 },
  tipText:  { color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily }
});
