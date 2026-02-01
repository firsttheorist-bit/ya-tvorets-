// app/(tabs)/progress.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppLanguage } from '../LanguageContext';
import { type AppLanguage } from '../mentorPhrases';
import { getOrCreateDaySnapshot, type DaySnapshot } from '../storage/daySnapshotStore';

// Константы для темы
const COLORS = {
  primary: '#6366F1',
  secondary: '#10B981',
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  accent: '#F59E0B',
  muted: '#94A3B8',
  danger: '#EF4444',
  success: '#10B981',
};

type JournalMood = 'low' | 'neutral' | 'high';
type JournalSource = 'manual' | 'challenge' | 'reflection' | 'bad_day' | 'win';

type JournalEntry = {
  id: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  text: string;
  mood?: JournalMood;
  source?: JournalSource;
  relatedChallengeId?: string;
};

const JOURNAL_KEY = '@ya_tvorets_journal_entries';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatHumanDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

// Компонент кругового прогресса
function CircularProgress({ progress, size = 80, strokeWidth = 8 }: { 
  progress: number; 
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.circleBackground, { width: size, height: size, borderRadius: size / 2 }]} />
      <View
        style={[
          styles.circleProgress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: COLORS.secondary,
            transform: [{ rotate: '-90deg' }],
          },
        ]}
      />
      <View style={[styles.circleInner, { width: size - strokeWidth * 2, height: size - strokeWidth * 2 }]}>
        <Text style={styles.circleText}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

// Компонент карточки статистики
function StatCard({ title, value, icon, color = COLORS.primary }: { 
  title: string; 
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: color + '20' }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '40' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
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
  
  // Рассчитываем прогресс до следующего уровня (условно: 1000 XP на уровень)
  const xpToNextLevel = 1000;
  const currentLevelXp = xp % xpToNextLevel;
  const levelProgress = Math.min((currentLevelXp / xpToNextLevel) * 100, 100);

  // Статистика по настроению
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
      subtitle: lang === 'ua' ? 'Етапи/історія шляху' : 'Stages and path narrative',
      icon: 'map-outline' as const,
      color: COLORS.primary,
    },
    {
      id: 'stats',
      title: lang === 'ua' ? 'Статистика' : 'Stats',
      subtitle: lang === 'ua' ? 'Базові цифри системи' : 'Core system numbers',
      icon: 'stats-chart-outline' as const,
      color: COLORS.secondary,
    },
    {
      id: 'mood-stats',
      title: lang === 'ua' ? 'Статистика настрою' : 'Mood stats',
      subtitle: lang === 'ua' ? 'Розподіл станів за період' : 'Distribution over time',
      icon: 'happy-outline' as const,
      color: COLORS.accent,
    },
    {
      id: 'insights',
      title: lang === 'ua' ? 'Інсайти' : 'Insights',
      subtitle: lang === 'ua' ? 'Більш глибокий аналіз' : 'Deeper journal analysis',
      icon: 'bulb-outline' as const,
      color: COLORS.success,
    },
    {
      id: 'temple',
      title: lang === 'ua' ? 'Храм творця' : 'Creator temple',
      subtitle: lang === 'ua' ? 'Експерименти/метафора' : 'Experiments / metaphor',
      icon: 'home-outline' as const,
      color: '#8B5CF6',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="time-outline" size={48} color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {lang === 'ua' ? 'Завантаження...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Заголовок */}
      <LinearGradient
        colors={[COLORS.primary, '#4F46E5']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.title}>{lang === 'ua' ? 'Прогрес' : 'Progress'}</Text>
        <Text style={styles.subtitle}>
          {lang === 'ua' 
            ? 'Твої досягнення та аналітика' 
            : 'Your achievements and analytics'}
        </Text>
      </LinearGradient>

      {/* Основная статистика */}
      <View style={styles.statsGrid}>
        <StatCard 
          title={lang === 'ua' ? 'Рівень' : 'Level'} 
          value={level} 
          icon="trophy-outline" 
          color={COLORS.accent}
        />
        <StatCard 
          title={lang === 'ua' ? 'Серія' : 'Streak'} 
          value={streak} 
          icon="flame-outline" 
          color={COLORS.danger}
        />
        <StatCard 
          title={lang === 'ua' ? 'Записів' : 'Entries'} 
          value={totalEntries} 
          icon="book-outline" 
          color={COLORS.secondary}
        />
      </View>

      {/* Прогресс уровня */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="speedometer-outline" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>
            {lang === 'ua' ? 'Прогрес рівня' : 'Level Progress'}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <CircularProgress progress={levelProgress} />
          <View style={styles.xpInfo}>
            <Text style={styles.xpText}>{xp} XP</Text>
            <Text style={styles.nextLevelText}>
              {lang === 'ua' ? 'До наступного рівня' : 'To next level'}: {xpToNextLevel - currentLevelXp} XP
            </Text>
            <View style={styles.xpBar}>
              <View 
                style={[
                  styles.xpBarFill, 
                  { width: `${levelProgress}%`, backgroundColor: COLORS.secondary }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>

      {/* Статистика настроения */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart-outline" size={24} color={COLORS.accent} />
          <Text style={styles.cardTitle}>
            {lang === 'ua' ? 'Настрої за період' : 'Mood Distribution'}
          </Text>
        </View>
        <View style={styles.moodStats}>
          {Object.entries(moodStats).map(([mood, count]) => (
            <View key={mood} style={styles.moodItem}>
              <View style={[
                styles.moodIndicator, 
                { 
                  backgroundColor: 
                    mood === 'high' ? COLORS.success : 
                    mood === 'neutral' ? COLORS.accent : 
                    COLORS.danger 
                }
              ]} />
              <Text style={styles.moodLabel}>
                {lang === 'ua' 
                  ? mood === 'high' ? 'Високий' : 
                    mood === 'neutral' ? 'Нейтральний' : 
                    'Низький'
                  : mood === 'high' ? 'High' : 
                    mood === 'neutral' ? 'Neutral' : 
                    'Low'
                }
              </Text>
              <Text style={styles.moodCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Навигация по экранам прогресса */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="compass-outline" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>
            {lang === 'ua' ? 'Екрани прогресу' : 'Progress Screens'}
          </Text>
        </View>
        <Text style={styles.cardDescription}>
          {lang === 'ua'
            ? 'Усі додаткові екрани для глибшого аналізу та відстеження'
            : 'All additional screens for deeper analysis and tracking'}
        </Text>

        <View style={styles.navGrid}>
          {navigationScreens.map((screen) => (
            <Pressable
              key={screen.id}
              onPress={() => router.push(`/${screen.id}`)}
              style={({ pressed }) => [
                styles.navButton,
                { borderLeftColor: screen.color },
                pressed && styles.navButtonPressed
              ]}
            >
              <View style={styles.navButtonContent}>
                <View style={[styles.navIconContainer, { backgroundColor: screen.color + '20' }]}>
                  <Ionicons name={screen.icon} size={20} color={screen.color} />
                </View>
                <View style={styles.navTextContainer}>
                  <Text style={styles.navButtonTitle}>{screen.title}</Text>
                  <Text style={styles.navButtonSubtitle}>{screen.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Информационная панель */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color={COLORS.muted} />
        <Text style={styles.infoText}>
          {lang === 'ua'
            ? 'Після цього кроку вкладки знизу залишаються лише: Сьогодні / Челенджі / Щоденник / Прогрес / Профіль'
            : 'After this step, bottom tabs remain only: Today / Challenges / Journal / Progress / Profile'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 20,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  circleBackground: {
    position: 'absolute',
    backgroundColor: '#334155',
  },
  circleProgress: {
    position: 'absolute',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  circleInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    top: 8,
    left: 8,
    backgroundColor: COLORS.surface,
  },
  circleText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  xpInfo: {
    flex: 1,
    gap: 8,
  },
  xpText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  nextLevelText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  xpBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  moodStats: {
    gap: 12,
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  moodIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moodLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  moodCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 30,
    textAlign: 'right',
  },
  navGrid: {
    gap: 12,
  },
  navButton: {
    backgroundColor: '#2D3748',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  navButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  navButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextContainer: {
    flex: 1,
    gap: 4,
  },
  navButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  navButtonSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
});
