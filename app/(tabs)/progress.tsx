// app/(tabs)/progress.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppLanguage } from '../LanguageContext';
import { type AppLanguage } from '../mentorPhrases';
import { getOrCreateDaySnapshot, type DaySnapshot } from '../storage/daySnapshotStore';

type JournalMood = 'low' | 'neutral' | 'high';
type JournalSource = 'manual' | 'challenge' | 'reflection' | 'bad_day' | 'win';

type JournalEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  text: string;
  mood?: JournalMood;
  source?: JournalSource;
  relatedChallengeId?: string;
};

const JOURNAL_KEY = '@ya_tvorets_journal_entries';

function formatHumanDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
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

  const lastEntryDate = useMemo(() => {
    if (!journalEntries.length) return null;
    const sorted = [...journalEntries].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : Date.parse(a.date || '');
      const bTime = b.createdAt ? Date.parse(b.createdAt) : Date.parse(b.date || '');
      return bTime - aTime;
    });
    return sorted[0]?.date?.slice(0, 10) ?? null;
  }, [journalEntries]);

  const xp = snapshot?.xp?.xp ?? 0;
  const level = snapshot?.xp?.level ?? 1;
  const streak = snapshot?.xp?.streak ?? 0;

  const displayName = useMemo(() => {
    const t = (snapshot?.name ?? '').trim();
    return t.length ? t : lang === 'ua' ? 'Творець' : 'Creator';
  }, [snapshot, lang]);

  const subtitle = useMemo(() => {
    return lang === 'ua'
      ? 'Тут зібрані твій прогрес і додаткові екрани системи. Ми тримаємо навігацію чистою: зайве — сховане всередину.'
      : 'Here you find your progress and extra system screens. Navigation stays clean: extras live inside this section.';
  }, [lang]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {lang === 'ua' ? 'Завантаження...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{lang === 'ua' ? 'Прогрес' : 'Progress'}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {lang === 'ua' ? 'Твоя поточна точка' : 'Your current point'}
        </Text>

        <Text style={styles.lineText}>
          {lang === 'ua' ? 'Ти: ' : 'You: '}
          {displayName}
        </Text>

        <Text style={styles.lineText}>
          {lang === 'ua' ? 'Рівень: ' : 'Level: '}
          {level}
        </Text>

        <Text style={styles.lineText}>
          {lang === 'ua' ? 'Загальний XP: ' : 'Total XP: '}
          {xp}
        </Text>

        <Text style={styles.lineText}>
          {lang === 'ua' ? 'Серія днів: ' : 'Streak: '}
          {streak}
        </Text>

        <Text style={styles.lineText}>
          {lang === 'ua' ? 'Записів у щоденнику: ' : 'Journal entries: '}
          {totalEntries}
        </Text>

        {lastEntryDate ? (
          <Text style={styles.mutedText}>
            {lang === 'ua'
              ? `Останній запис: ${formatHumanDate(lastEntryDate)}`
              : `Last entry: ${formatHumanDate(lastEntryDate)}`}
          </Text>
        ) : (
          <Text style={styles.mutedText}>
            {lang === 'ua'
              ? 'Поки що немає записів — навіть один рядок уже створює ритм.'
              : 'No entries yet — even one line starts a rhythm.'}
          </Text>
        )}
      </View>

      {/* Actions / Navigation */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Екрани прогресу' : 'Progress screens'}</Text>
        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? 'Ми прибрали зайві вкладки знизу. Усе “додаткове” відкривається звідси.'
            : 'We removed extra bottom tabs. All “extras” open from here.'}
        </Text>

        <View style={{ gap: 8, marginTop: 10 }}>
          <Pressable
            onPress={() => router.push('/creatorPath')}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.navButtonText}>
              {lang === 'ua' ? 'Шлях творця' : 'Creator path'}
            </Text>
            <Text style={styles.navButtonSubText}>
              {lang === 'ua' ? 'Етапи/історія шляху' : 'Stages and path narrative'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/stats')}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.navButtonText}>
              {lang === 'ua' ? 'Статистика' : 'Stats'}
            </Text>
            <Text style={styles.navButtonSubText}>
              {lang === 'ua' ? 'Базові цифри системи' : 'Core system numbers'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/mood-stats')}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.navButtonText}>
              {lang === 'ua' ? 'Статистика настрою' : 'Mood stats'}
            </Text>
            <Text style={styles.navButtonSubText}>
              {lang === 'ua' ? 'Розподіл станів за період' : 'Distribution over time'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/insights')}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.navButtonText}>
              {lang === 'ua' ? 'Інсайти' : 'Insights'}
            </Text>
            <Text style={styles.navButtonSubText}>
              {lang === 'ua' ? 'Більш глибокий аналіз щоденника' : 'Deeper journal analysis'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/temple')}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.navButtonText}>
              {lang === 'ua' ? 'Храм творця' : 'Creator temple'}
            </Text>
            <Text style={styles.navButtonSubText}>
              {lang === 'ua' ? 'Експерименти/метафора прогресу' : 'Experiments / metaphor'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/explore')}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.navButtonText}>
              {lang === 'ua' ? 'Explore' : 'Explore'}
            </Text>
            <Text style={styles.navButtonSubText}>
              {lang === 'ua' ? 'Якщо ще потрібне — інакше видалимо' : 'If still needed; otherwise remove'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Small guidance */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Що ми видаляємо' : 'What we remove'}</Text>
        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? 'Після цього кроку вкладки знизу залишаються лише: Сьогодні / Челенджі / Щоденник / Прогрес / Профіль. Решта — або всередині “Прогрес”, або видаляється.'
            : 'After this step, bottom tabs remain only: Today / Challenges / Journal / Progress / Profile. Everything else goes inside Progress or is removed.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F0E8' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 24 },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 16, color: '#7C7365' },

  title: { fontSize: 24, fontWeight: '700', color: '#2B2620', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#857A6A', marginBottom: 16 },

  card: {
    backgroundColor: '#FFFEFA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1D6C5',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#2B2620', marginBottom: 6 },
  lineText: { fontSize: 13, color: '#4E4537', marginBottom: 4 },
  mutedText: { fontSize: 12, color: '#9B8F7C', marginTop: 4 },

  navButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8F2DE',
    borderWidth: 1,
    borderColor: '#D6C28A',
  },
  navButtonText: { fontSize: 14, fontWeight: '700', color: '#2B2620' },
  navButtonSubText: { fontSize: 12, color: '#6C6255', marginTop: 2 },
});
