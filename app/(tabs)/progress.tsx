// app/(tabs)/progress.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppLanguage } from '../LanguageContext';
import { type AppLanguage } from '../mentorPhrases';
import { getOrCreateDaySnapshot, type DaySnapshot } from '../storage/daySnapshotStore';

// Психоделическая цветовая схема в стиле Snoop Dogg "Last Dance"
const COLORS = {
  primary: '#FF00FF',    // Ярко-розовый
  secondary: '#00FFFF',   // Циан
  accent: '#FFD700',      // Золотой
  background: '#0A001A',  // Глубокий фиолетово-синий
  surface: '#1A0033',     // Пурпурно-синий
  text: '#FFFFFF',
  textSecondary: '#B8E2FF',
  neonGreen: '#39FF14',
  neonOrange: '#FF5F1F',
  neonPurple: '#BF00FF',
};

// Анимационные константы
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PULSE_ANIMATION_DURATION = 2000;
const FLOAT_ANIMATION_DURATION = 3000;

type JournalEntry = {
  id: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  text: string;
  mood?: 'low' | 'neutral' | 'high';
  source?: string;
  relatedChallengeId?: string;
};

const JOURNAL_KEY = '@ya_tvorets_journal_entries';

// Анимированный фон с пульсирующими кругами
function PsychedelicBackground() {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: PULSE_ANIMATION_DURATION,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: PULSE_ANIMATION_DURATION,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: PULSE_ANIMATION_DURATION * 2,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Градиентный фон */}
      <LinearGradient
        colors={['#0A001A', '#1A0033', '#330066']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Анимированные круги */}
      <Animated.View
        style={[
          styles.floatingCircle,
          {
            top: '20%',
            left: '10%',
            backgroundColor: COLORS.primary,
            transform: [{ scale: scaleAnim }, { rotate }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingCircle,
          {
            top: '60%',
            right: '15%',
            backgroundColor: COLORS.secondary,
            transform: [{ scale: scaleAnim.interpolate({
              inputRange: [1, 1.2],
              outputRange: [1, 1.3]
            }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingCircle,
          {
            bottom: '20%',
            left: '20%',
            backgroundColor: COLORS.neonGreen,
            transform: [{ scale: scaleAnim.interpolate({
              inputRange: [1, 1.2],
              outputRange: [1.1, 0.9]
            }) }],
          },
        ]}
      />
    </View>
  );
}

// Неоновый кнопочный компонент
function NeonButton({ 
  title, 
  subtitle, 
  icon, 
  color = COLORS.primary,
  onPress,
  isAnimated = false 
}: { 
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
  isAnimated?: boolean;
}) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnimated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isAnimated]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.neonButton}>
      {isAnimated && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: color,
              opacity: glowOpacity,
              borderRadius: 16,
            },
          ]}
        />
      )}
      <View style={[styles.neonButtonInner, { borderColor: color }]}>
        <View style={[styles.neonIconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.neonTextContainer}>
          <Text style={[styles.neonButtonTitle, { color }]}>{title}</Text>
          {subtitle && <Text style={styles.neonButtonSubtitle}>{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={20} color={color} style={{ opacity: 0.7 }} />
      </View>
    </Pressable>
  );
}

// Психоделический прогресс-бар
function PsychedelicProgress({ 
  progress, 
  size = 120, 
  label,
  color = COLORS.primary 
}: { 
  progress: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <View style={[styles.progressContainer, { width: size, height: size }]}>
        <Animated.View
          style={[
            styles.progressRing,
            {
              width: size,
              height: size,
              borderColor: color,
              borderTopColor: 'transparent',
              transform: [{ rotate }],
            },
          ]}
        />
        <LinearGradient
          colors={[color, `${color}80`, `${color}20`]}
          style={[
            styles.progressFill,
            {
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: (size * 0.8) / 2,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          {label && <Text style={styles.progressLabel}>{label}</Text>}
        </LinearGradient>
      </View>
    </View>
  );
}

// Анимированная статистическая карточка
function AnimatedStatCard({ 
  title, 
  value, 
  icon, 
  color = COLORS.primary,
  delay = 0 
}: { 
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  delay?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        { backgroundColor: `${color}15`, borderColor: color },
        { opacity: fadeAnim, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${color}40` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Animated.View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { language } = useAppLanguage();
  const lang = language as AppLanguage;

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [snap, rawJournal] = await Promise.all([
        getOrCreateDaySnapshot({ lang }),
        AsyncStorage.getItem(JOURNAL_KEY),
      ]);

      setSnapshot(snap);

      if (rawJournal) {
        try {
          const parsed = JSON.parse(rawJournal) as JournalEntry[];
          const cleaned = Array.isArray(parsed)
            ? parsed.filter((e) => e && typeof e.text === 'string' && typeof e.date === 'string')
            : [];
          setJournalEntries(cleaned);
        } catch (e) {
          console.log('ProgressScreen: journal parse error', e);
          setJournalEntries([]);
        }
      } else {
        setJournalEntries([]);
      }
    } catch (e) {
      console.log('ProgressScreen refresh error', e);
      setSnapshot(null);
      setJournalEntries([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const totalEntries = journalEntries.length;
  const xp = snapshot?.xp?.xp ?? 0;
  const level = snapshot?.xp?.level ?? 1;
  const streak = snapshot?.xp?.streak ?? 0;
  
  // Прогресс уровня
  const xpToNextLevel = 1000;
  const currentLevelXp = xp % xpToNextLevel;
  const levelProgress = Math.min((currentLevelXp / xpToNextLevel) * 100, 100);

  // Статистика настроения
  const moodStats = useMemo(() => {
    const stats = { low: 0, neutral: 0, high: 0 };
    journalEntries.forEach(entry => {
      if (entry.mood && stats[entry.mood] !== undefined) {
        stats[entry.mood]++;
      }
    });
    return stats;
  }, [journalEntries]);

  const lastEntryDate = useMemo(() => {
    if (!journalEntries.length) return null;
    const sorted = [...journalEntries].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : Date.parse(a.date || '');
      const bTime = b.createdAt ? Date.parse(b.createdAt) : Date.parse(b.date || '');
      return bTime - aTime;
    });
    return sorted[0]?.date?.slice(0, 10) ?? null;
  }, [journalEntries]);

  const displayName = useMemo(() => {
    const t = (snapshot?.name ?? '').trim();
    return t.length ? t : lang === 'ua' ? 'Творець' : 'Creator';
  }, [snapshot, lang]);

  const navigationScreens = [
    {
      id: 'creatorPath',
      title: lang === 'ua' ? 'Шлях творця' : 'Creator path',
      subtitle: lang === 'ua' ? 'Твій унікальний маршрут' : 'Your unique journey',
      icon: 'trail-sign-outline' as const,
      color: COLORS.primary,
      animated: true,
    },
    {
      id: 'stats',
      title: lang === 'ua' ? 'Крута статистика' : 'Cool Stats',
      subtitle: lang === 'ua' ? 'Цифри та графіки' : 'Numbers & Charts',
      icon: 'stats-chart' as const,
      color: COLORS.secondary,
      animated: false,
    },
    {
      id: 'mood-stats',
      title: lang === 'ua' ? 'Вібрації' : 'Vibes',
      subtitle: lang === 'ua' ? 'Емоційна хвиля' : 'Emotional wave',
      icon: 'pulse-outline' as const,
      color: COLORS.neonGreen,
      animated: true,
    },
    {
      id: 'insights',
      title: lang === 'ua' ? 'Інсайти' : 'Insights',
      subtitle: lang === 'ua' ? 'Мудрість з записів' : 'Wisdom from entries',
      icon: 'bulb' as const,
      color: COLORS.accent,
      animated: false,
    },
    {
      id: 'temple',
      title: lang === 'ua' ? 'Храм' : 'Temple',
      subtitle: lang === 'ua' ? 'Твій священний простір' : 'Your sacred space',
      icon: 'home' as const,
      color: COLORS.neonPurple,
      animated: true,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <PsychedelicBackground />
        <Animated.View style={styles.loadingContent}>
          <Ionicons name="infinite" size={64} color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {lang === 'ua' ? 'Завантажуємо космос...' : 'Loading the cosmos...'}
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PsychedelicBackground />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Анимированный заголовок */}
        <View style={styles.header}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.neonPurple, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.titleGradient}
          >
            <Text style={styles.title}>
              {lang === 'ua' ? 'ТВОЯ ЕНЕРГІЯ' : 'YOUR ENERGY'}
            </Text>
          </LinearGradient>
          <Text style={styles.subtitle}>
            {lang === 'ua' 
              ? 'Візуалізуй свій шлях до великого'
              : 'Visualize your path to greatness'}
          </Text>
        </View>

        {/* Статистика с анимациями */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>
            {lang === 'ua' ? 'ТВОЯ СИЛА ЗАРАЗ' : 'YOUR POWER NOW'}
          </Text>
          <View style={styles.statsGrid}>
            <AnimatedStatCard
              title={lang === 'ua' ? 'РІВЕНЬ' : 'LEVEL'}
              value={level}
              icon="nuclear"
              color={COLORS.primary}
              delay={100}
            />
            <AnimatedStatCard
              title={lang === 'ua' ? 'СЕРІЯ' : 'STREAK'}
              value={streak}
              icon="flame"
              color={COLORS.neonOrange}
              delay={200}
            />
            <AnimatedStatCard
              title={lang === 'ua' ? 'ЗАПИСІВ' : 'ENTRIES'}
              value={totalEntries}
              icon="book"
              color={COLORS.secondary}
              delay={300}
            />
            <AnimatedStatCard
              title="XP"
              value={xp}
              icon="sparkles"
              color={COLORS.neonGreen}
              delay={400}
            />
          </View>
        </View>

        {/* Психоделический прогресс */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>
            {lang === 'ua' ? 'ПРОГРЕС РІВНЯ' : 'LEVEL PROGRESS'}
          </Text>
          <PsychedelicProgress 
            progress={levelProgress}
            label={lang === 'ua' ? 'енергії' : 'energy'}
            color={COLORS.primary}
          />
          <View style={styles.xpInfo}>
            <Text style={styles.xpCurrent}>
              {lang === 'ua' ? 'Поточний рівень' : 'Current level'}: <Text style={{ color: COLORS.primary }}>{level}</Text>
            </Text>
            <Text style={styles.xpNext}>
              {lang === 'ua' ? 'До наступного' : 'To next level'}: <Text style={{ color: COLORS.neonGreen }}>{xpToNextLevel - currentLevelXp} XP</Text>
            </Text>
          </View>
        </View>

        {/* Навигация в стиле ретро-консоли */}
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>
            {lang === 'ua' ? 'ВИБИРАЙ СВІЙ ШЛЯХ' : 'CHOOSE YOUR PATH'}
          </Text>
          <View style={styles.navigationGrid}>
            {navigationScreens.map((screen, index) => (
              <NeonButton
                key={screen.id}
                title={screen.title}
                subtitle={screen.subtitle}
                icon={screen.icon}
                color={screen.color}
                isAnimated={screen.animated}
                onPress={() => router.push(`/${screen.id}`)}
              />
            ))}
          </View>
        </View>

        {/* Mood stats with fun visualization */}
        <View style={styles.moodSection}>
          <Text style={styles.sectionTitle}>
            {lang === 'ua' ? 'ТВОЇ ВІБРАЦІЇ' : 'YOUR VIBES'}
          </Text>
          <View style={styles.moodStats}>
            {Object.entries(moodStats).map(([mood, count], index) => {
              const colors = {
                high: [COLORS.neonGreen, '#00FF9D'],
                neutral: [COLORS.accent, '#FFB347'],
                low: [COLORS.primary, '#FF0080'],
              };
              return (
                <View key={mood} style={styles.moodItem}>
                  <LinearGradient
                    colors={colors[mood as keyof typeof colors]}
                    style={styles.moodPill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.moodPillText}>
                      {lang === 'ua' 
                        ? mood === 'high' ? 'ВИСОКО' : 
                          mood === 'neutral' ? 'НОРМ' : 
                          'НИЗЬКО'
                        : mood.toUpperCase()}
                    </Text>
                    <Text style={styles.moodPillCount}>{count}</Text>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        </View>

        {/* Инфо-панель в стиле неоновой вывески */}
        <View style={styles.infoPanel}>
          <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
          <Text style={styles.infoText}>
            {lang === 'ua'
              ? 'Твій космос розвитку — без меж. Дотикайся до зірок кожен день! ✨'
              : 'Your development universe has no limits. Reach for stars every day! ✨'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontFamily: 'System',
    fontWeight: '600',
  },
  floatingCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  titleGradient: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 15,
    letterSpacing: 1,
    textShadowColor: COLORS.secondary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  progressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 4,
    borderStyle: 'dashed',
  },
  progressFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  xpInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  xpCurrent: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  xpNext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  navigationSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  navigationGrid: {
    gap: 12,
  },
  neonButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  neonButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  neonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  neonTextContainer: {
    flex: 1,
  },
  neonButtonTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  neonButtonSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.8,
  },
  moodSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  moodStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  moodItem: {
    flex: 1,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#FF00FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  moodPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  moodPillCount: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  infoPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
});
