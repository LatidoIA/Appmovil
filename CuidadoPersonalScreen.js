// CuidadoPersonalScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import CustomText from './CustomText';
import theme from './theme';
import ArticulosScreen from './ArticulosScreen';
import FarmaciaScreen from './FarmaciaScreen';

// >>> Health Connect helper <<<
import {
  hcEnsureAvailable,
  hcInitAndRequest,
  hcReadLatestHeartRate,
  hcReadStepsToday
} from './src/health';

const MEDS_KEY   = '@latido_meds';
const EXAMS_KEY  = '@latido_exam_history';
const GLUC_KEY   = '@glucose_history';
const STREAK_CNT = '@streak_count';

export default function CuidadoPersonalScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const initialTab = route.params?.initialTab ?? 'Para ti';
  const tabs = ['Para ti', 'Farmacia', 'Insignias', 'Artículos', 'Consejos'];

  const [activeTab, setActiveTab] = useState(initialTab);
  const [nextMed, setNextMed] = useState(null);

  // contadores para insignias
  const [examCount, setExamCount] = useState(0);
  const [glucoseCount, setGlucoseCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);

  // ----- Health Connect (FC y Pasos) -----
  const [hcStatus, setHcStatus] = useState('init'); // init | no-hc | no-perms | ok
  const [lastHr, setLastHr] = useState(null);
  const [steps, setSteps] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const available = await hcEnsureAvailable();
        if (!available) { setHcStatus('no-hc'); return; }

        const granted = await hcInitAndRequest();
        if (!granted?.length) { setHcStatus('no-perms'); return; }

        const hr = await hcReadLatestHeartRate();
        const st = await hcReadStepsToday();
        setLastHr(hr);
        setSteps(st);
        setHcStatus('ok');
      } catch (e) {
        // Si algo falla, mostramos estado genérico
        setHcStatus('no-hc');
      }
    })();
  }, []);

  // ---- cargar datos base ----
  useEffect(() => {
    (async () => {
      try {
        const [medsRaw, exRaw, glRaw, stRaw] = await Promise.all([
          AsyncStorage.getItem(MEDS_KEY),
          AsyncStorage.getItem(EXAMS_KEY),
          AsyncStorage.getItem(GLUC_KEY),
          AsyncStorage.getItem(STREAK_CNT)
        ]);

        // próximo (simple: primero de la lista si hay)
        const meds = medsRaw ? JSON.parse(medsRaw) : [];
        setNextMed(meds[0] || null);

        setExamCount(Array.isArray(JSON.parse(exRaw || '[]')) ? JSON.parse(exRaw || '[]').length : 0);
        setGlucoseCount(Array.isArray(JSON.parse(glRaw || '[]')) ? JSON.parse(glRaw || '[]').length : 0);
        setStreakCount(parseInt(stRaw || '0', 10) || 0);
      } catch (e) {
        // valores por defecto si algo falla
        setNextMed(null);
        setExamCount(0);
        setGlucoseCount(0);
        setStreakCount(0);
      }
    })();
  }, [activeTab]);

  // ---- insignias dinámicas con progreso ----
  const badges = useMemo(() => {
    const b = [];

    // 1) Primer examen de latido
    const exGoal = 1;
    const exPct = Math.max(0, Math.min(100, Math.round((examCount / exGoal) * 100)));
    b.push({
      key: 'latido_first',
      label: 'Primer examen de latido',
      icon: 'heart',
      progress: exPct,
      earned: examCount >= exGoal
    });

    // 2) Primer ingreso de glucosa
    const glGoal = 1;
    const glPct = Math.max(0, Math.min(100, Math.round((glucoseCount / glGoal) * 100)));
    b.push({
      key: 'glucosa_first',
      label: 'Primer ingreso de glucosa',
      icon: 'water',
      progress: glPct,
      earned: glucoseCount >= glGoal
    });

    // 3) Racha 3 días
    const sGoal = 3;
    const sPct = Math.max(0, Math.min(100, Math.round((streakCount / sGoal) * 100)));
    b.push({
      key: 'streak3',
      label: 'Racha de 3 días',
      icon: 'flame',
      progress: sPct,
      earned: streakCount >= sGoal
    });

    return b;
  }, [examCount, glucoseCount, streakCount]);

  // ---- UI helpers ----
  const renderBadges = () => (
    <View style={styles.badgesContainer}>
      {badges.map(item => (
        <View key={item.key} style={styles.badgeCard}>
          <View style={styles.badgeHeader}>
            <Ionicons
              name={`${item.icon}-outline`}
              size={20}
              color={item.earned ? '#FFD700' : theme.colors.textSecondary}
            />
            <CustomText style={styles.badgeLabel}>{item.label}</CustomText>
            {item.earned ? (
              <View style={styles.earnedPill}>
                <CustomText style={styles.earnedPillText}>Completado</CustomText>
              </View>
            ) : null}
          </View>

          {/* barra de progreso */}
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
          <CustomText style={styles.progressText}>{item.progress}%</CustomText>
        </View>
      ))}
    </View>
  );

  const goFarmacia = () => navigation.navigate('Cuidado', { initialTab: 'Farmacia' });

  const renderContent = () => {
    switch (activeTab) {
      case 'Para ti':
        return (
          <View style={styles.content}>
            {/* ---- Card Health Connect ---- */}
            <View style={styles.hcCard}>
              <CustomText style={styles.hcTitle}>Reloj (Health Connect)</CustomText>

              {hcStatus === 'init' && <CustomText>Cargando…</CustomText>}
              {hcStatus === 'no-hc' && (
                <CustomText>Instala/activa Health Connect y vuelve a abrir la app.</CustomText>
              )}
              {hcStatus === 'no-perms' && (
                <CustomText>Permisos denegados. Concede acceso en Health Connect.</CustomText>
              )}
              {hcStatus === 'ok' && (
                <>
                  <CustomText>FC último: {lastHr?.samples?.[0]?.beatsPerMinute ?? '—'} bpm</CustomText>
                  <CustomText>Pasos hoy: {steps?.total ?? 0}</CustomText>
                </>
              )}
            </View>

            {/* Farmacia preview */}
            <TouchableOpacity style={styles.previewRow} onPress={goFarmacia} activeOpacity={0.8}>
              <CustomText style={styles.previewTitle}>Farmacia</CustomText>
              {nextMed ? (
                <CustomText style={styles.previewText}>
                  – {`${nextMed.name || nextMed.medName} a las ${nextMed.schedule?.time || nextMed.time || '—'}`}
                </CustomText>
              ) : (
                <CustomText style={styles.previewLink}>+ Agregar</CustomText>
              )}
            </TouchableOpacity>

            {/* Insignias preview */}
            <View style={styles.previewSection}>
              <CustomText style={styles.previewTitle}>Insignias</CustomText>
              {renderBadges()}
            </View>

            {/* Artículo y consejo simples */}
            <View style={styles.previewSection}>
              <CustomText style={styles.previewTitle}>Artículo destacado</CustomText>
              <CustomText style={styles.previewText}>Cómo el estrés impacta tu frecuencia cardíaca</CustomText>
            </View>
            <View style={styles.previewSection}>
              <CustomText style={styles.previewTitle}>Consejo</CustomText>
              <CustomText style={styles.previewText}>Hidrátate regularmente</CustomText>
            </View>
          </View>
        );

      case 'Farmacia':
        return (
          <View style={styles.content}>
            <CustomText style={styles.contentTitle}>Farmacia y Recordatorios</CustomText>
            <FarmaciaScreen />
          </View>
        );

      case 'Insignias':
        return (
          <View style={styles.content}>
            <CustomText style={styles.contentTitle}>Insignias</CustomText>
            {renderBadges()}
          </View>
        );

      case 'Artículos':
        return <ArticulosScreen navigation={navigation} />;

      case 'Consejos':
        return (
          <View style={styles.content}>
            <CustomText style={styles.contentTitle}>Consejos</CustomText>
            {['Hidrátate regularmente', 'Respira profundamente ante el estrés'].map((c, i) => (
              <CustomText key={i} style={styles.previewText}>• {c}</CustomText>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CustomText style={styles.headerTitle}>Cuidado Personal</CustomText>
      </View>

      {/* tabs */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
        >
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <CustomText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 3 }
    })
  },
  headerTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.textPrimary
  },

  tabBar: {
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },
  tabList: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  tabItem: {
    marginRight: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.colors.surface
  },
  tabItemActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily
  },
  tabTextActive: { color: theme.colors.background, fontFamily: theme.typography.body.fontFamily },

  body: { flex: 1, backgroundColor: theme.colors.background },
  bodyContent: { padding: theme.spacing.md },

  content: { marginBottom: theme.spacing.lg },
  contentTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm
  },

  // ---- Health Connect card ----
  hcCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
      android: { elevation: 1 }
    })
  },
  hcTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.subtitle.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs
  },

  // ---- Farmacia / Insignias / Artículos ----
  previewSection: { marginBottom: theme.spacing.md },
  previewRow: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
      android: { elevation: 1 }
    })
  },
  previewTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.typography.subtitle.fontFamily,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs
  },
  previewText: { fontSize: theme.fontSizes.sm, fontFamily: theme.typography.body.fontFamily, color: theme.colors.textSecondary },
  previewLink: { fontSize: theme.fontSizes.md, color: theme.colors.primary, fontFamily: theme.typTypography?.body?.fontFamily || theme.typography.body.fontFamily },

  // Insignias
  badgesContainer: { marginTop: theme.spacing.xs },
  badgeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
      android: { elevation: 1 }
    })
  },
  badgeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badgeLabel: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs,
    flex: 1
  },
  earnedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline
  },
  earnedPillText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.typography.body.fontFamily },

  progressWrap: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.accent
  },
  progressText: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body.fontFamily
  }
});
