// app/(tabs)/journal.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppLanguage } from '../LanguageContext';
import type { AppLanguage, JournalMood } from '../mentorPhrases';

// поддерживаем твои + возможные "старые" источники из других частей приложения
type JournalSource = 'manual' | 'challenge' | 'reflection' | 'bad_day' | 'win' | 'note' | 'system';

interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  text: string;
  mood?: JournalMood;
  source?: JournalSource;
  relatedChallengeId?: string;
  // на будущее, если прилетит из другого стора
  meta?: Record<string, unknown>;
}

const JOURNAL_KEY = '@ya_tvorets_journal_entries';
// IMPORTANT: если у тебя другой "основной" ключ, где пишут reflection/bad_day/challenge — поменяй здесь
const ALT_JOURNAL_KEY = '@ya_tvorets_journal_v1';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeIsoToDate(iso: string | undefined, fallbackDate: string): string {
  const base = (iso ?? '').slice(0, 10);
  return base && base.includes('-') ? base : fallbackDate;
}

function formatHumanDate(iso: string, lang: AppLanguage): string {
  void lang;
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

// Функции перевода для поиска (не UI)
function getMoodLabelForSearch(mood: JournalMood, lang: AppLanguage): string {
  if (lang === 'ua') {
    if (mood === 'low') return 'Важкий день';
    if (mood === 'neutral') return 'Звичайний день';
    return 'Добрий день';
  }
  if (mood === 'low') return 'Hard day';
  if (mood === 'neutral') return 'Normal day';
  return 'Good day';
}

function isMood(v: unknown): v is JournalMood {
  return v === 'low' || v === 'neutral' || v === 'high';
}

function isSource(v: unknown): v is JournalSource {
  return (
    v === 'manual' ||
    v === 'challenge' ||
    v === 'reflection' ||
    v === 'bad_day' ||
    v === 'win' ||
    v === 'note' ||
    v === 'system'
  );
}

function parseList(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Нормализация записей из разных схем (текущая + возможная "другая")
function sanitizeEntry(anyEntry: any): JournalEntry | null {
  const id = String(anyEntry?.id ?? '').trim();
  const text = typeof anyEntry?.text === 'string' ? anyEntry.text : '';
  if (!id || !text) return null;

  const createdAt = anyEntry?.createdAt != null ? String(anyEntry.createdAt) : undefined;
  const updatedAt = anyEntry?.updatedAt != null ? String(anyEntry.updatedAt) : undefined;

  // если из другой схемы нет date — восстановим
  const dateRaw = String(anyEntry?.date ?? '').slice(0, 10);
  const date =
    dateRaw && dateRaw.includes('-')
      ? dateRaw
      : safeIsoToDate(createdAt || updatedAt, todayIso());

  const title = anyEntry?.title != null ? String(anyEntry.title) : undefined;

  const moodRaw = anyEntry?.mood;
  const mood = moodRaw == null ? undefined : isMood(moodRaw) ? moodRaw : undefined;

  const sourceRaw = anyEntry?.source;
  const source = sourceRaw == null ? undefined : isSource(sourceRaw) ? sourceRaw : undefined;

  const relatedChallengeId =
    anyEntry?.relatedChallengeId != null ? String(anyEntry.relatedChallengeId) : undefined;

  const meta =
    anyEntry?.meta && typeof anyEntry.meta === 'object' && !Array.isArray(anyEntry.meta)
      ? (anyEntry.meta as Record<string, unknown>)
      : undefined;

  return {
    id,
    date,
    createdAt,
    updatedAt,
    title,
    text,
    mood,
    source,
    relatedChallengeId,
    meta,
  };
}

function entryTimeMs(e: JournalEntry): number {
  const t1 = e.createdAt ? Date.parse(e.createdAt) : NaN;
  const t2 = e.updatedAt ? Date.parse(e.updatedAt) : NaN;
  const t3 = e.date ? Date.parse(`${e.date}T00:00:00.000Z`) : NaN;

  const t = Number.isFinite(t1) ? t1 : Number.isFinite(t2) ? t2 : Number.isFinite(t3) ? t3 : 0;
  return t;
}

function dedupeById(list: JournalEntry[]): JournalEntry[] {
  const map = new Map<string, JournalEntry>();
  for (const e of list) {
    const prev = map.get(e.id);
    if (!prev) {
      map.set(e.id, e);
      continue;
    }
    // если дубликат — оставим более "новый" по времени
    map.set(e.id, entryTimeMs(e) >= entryTimeMs(prev) ? e : prev);
  }
  return Array.from(map.values());
}

export default function JournalScreen() {
  const { t, language } = useAppLanguage();
  const lang: AppLanguage = language;

  const [loading, setLoading] = useState<boolean>(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const [newText, setNewText] = useState('');
  const [newMood, setNewMood] = useState<JournalMood | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filterMood, setFilterMood] = useState<JournalMood | 'all'>('all');
  const [search, setSearch] = useState<string>('');

  const saveEntries = useCallback(async (list: JournalEntry[]) => {
    setEntries(list);
    try {
      await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(list));
    } catch (e) {
      console.log('Error saving journal entries', e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawMain, rawAlt] = await Promise.all([
        AsyncStorage.getItem(JOURNAL_KEY),
        AsyncStorage.getItem(ALT_JOURNAL_KEY),
      ]);

      const mainList = parseList(rawMain).map(sanitizeEntry).filter(Boolean) as JournalEntry[];
      const altList = parseList(rawAlt).map(sanitizeEntry).filter(Boolean) as JournalEntry[];

      // мердж + дедуп
      const merged = dedupeById([...mainList, ...altList]).sort((a, b) => entryTimeMs(b) - entryTimeMs(a));

      setEntries(merged);

      // миграция: если в alt есть данные, а в main пусто/меньше — записываем merged в основной ключ
      if (altList.length > 0 && merged.length >= mainList.length) {
        await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.log('Error loading journal entries', e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleAddEntry = async () => {
    const trimmed = newText.trim();

    if (!trimmed && !newMood) {
      Alert.alert(
        t('common:noText', { defaultValue: 'No text' }),
        t('journal:noTextWarning', { defaultValue: 'Write at least one line or choose a mood.' })
      );
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const now = new Date().toISOString();
      const entry: JournalEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: todayIso(),
        createdAt: now,
        text:
          trimmed.length > 0
            ? trimmed
            : lang === 'ua'
            ? 'Коротка позначка стану без тексту.'
            : 'Short mood marker without text.',
        mood: newMood ?? undefined,
        source: 'manual',
      };

      const updated = [entry, ...entries].sort((a, b) => entryTimeMs(b) - entryTimeMs(a));
      await saveEntries(updated);

      setNewText('');
      setNewMood(null);

      Alert.alert(
        t('journal:saved'),
        t('journal:entryAdded')
      );
    } catch (e) {
      console.log('Error adding journal entry', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    Alert.alert(
      t('journal:deleteConfirm'),
      t('journal:deleteWarning'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: () => void doDelete(entry.id),
        },
      ]
    );
  };

  const doDelete = async (id: string) => {
    try {
      const next = entries.filter((e) => e.id !== id);
      await saveEntries(next);
    } catch (e) {
      console.log('Error deleting journal entry', e);
    }
  };

  const filteredEntries = useMemo(() => {
    let list = entries;

    if (filterMood !== 'all') {
      list = list.filter((e) => e.mood === filterMood);
    }

    const q = search.trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter((e) => {
        const moodStr = e.mood ? getMoodLabelForSearch(e.mood, lang) : '';
        const src = e.source ?? '';
        const hay = `${e.date} ${src} ${moodStr} ${e.title ?? ''} ${e.text ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [entries, filterMood, search, lang]);

  const handleOpenEntry = (entry: JournalEntry) => {
    const title =
      lang === 'ua'
        ? `Запис від ${formatHumanDate(entry.date, lang)}`
        : `Entry from ${formatHumanDate(entry.date, lang)}`;

    let message = entry.text;

    if (entry.mood) {
      const moodStr = t(`journal:${entry.mood}`);
      message = `${lang === 'ua' ? 'Настрій: ' : 'Mood: '}${moodStr}\n\n${entry.text}`;
    }

    Alert.alert(title, message);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      if (entries.length === 0) {
        Alert.alert(
          t('common:noEntries', { defaultValue: 'No entries' }),
          t('journal:noEntriesExport', { defaultValue: 'There is nothing to export yet.' })
        );
        return;
      }

      // JSON экспорт — ок, но иногда удобнее читать "человеческий" формат.
      const human = entries
        .slice(0, 500)
        .map((e) => {
          const header = `${formatHumanDate(e.date, lang)}${e.mood ? ` • ${t(`journal:${e.mood}`)}` : ''}`;
          const title = e.title ? `\n${e.title}` : '';
          return `${header}${title}\n${e.text}`.trim();
        })
        .join('\n\n---\n\n');

      await Share.share({
        title: t('journal:export'),
        message: human,
      });
    } catch (e) {
      console.log('Error exporting journal', e);
    } finally {
      setExporting(false);
    }
  };

  const moodSummary = useMemo(() => {
    let low = 0;
    let neutral = 0;
    let high = 0;

    entries.forEach((e) => {
      if (!e.mood) return;
      if (e.mood === 'low') low += 1;
      else if (e.mood === 'neutral') neutral += 1;
      else if (e.mood === 'high') high += 1;
    });

    return { low, neutral, high };
  }, [entries]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {t('journal:loading', { defaultValue: 'Loading journal...' })}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{t('journal:title')}</Text>
      <Text style={styles.subtitle}>
        {t('journal:subtitle')}
      </Text>

      {/* Блок для нового запису */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('journal:newEntry')}</Text>
        <Text style={styles.mutedText}>
          {t('journal:newEntryHint', { defaultValue: 'You can write a few sentences or just mark your mood.' })}
        </Text>

        <TextInput
          value={newText}
          onChangeText={setNewText}
          placeholder={t('journal:newEntryPlaceholder')}
          placeholderTextColor="#B0A493"
          style={styles.input}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.moodSelectorLabel}>{t('journal:entryMood')}</Text>

        <View style={styles.moodChipsRow}>
          {(['low', 'neutral', 'high'] as JournalMood[]).map((mood) => (
            <Pressable
              key={mood}
              onPress={() => setNewMood((prev) => (prev === mood ? null : mood))}
              style={[styles.moodChip, newMood === mood && styles.moodChipActive]}
            >
              <Text style={[styles.moodChipText, newMood === mood && styles.moodChipTextActive]}>
                {t(`journal:${mood}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleAddEntry}
          disabled={saving}
          style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }, saving && { opacity: 0.7 }]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? t('journal:saving') : t('journal:addEntry')}
          </Text>
        </Pressable>
      </View>

      {/* Коротка статистика по настрою */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('journal:moodBalance')}</Text>
        {entries.length === 0 ? (
          <Text style={styles.mutedText}>
            {t('journal:noEntries')}
          </Text>
        ) : (
          <>
            <View style={styles.moodSummaryRow}>
              <View style={styles.moodSummaryItem}>
                <View style={[styles.moodDot, styles.moodDotLow]} />
                <Text style={styles.moodSummaryLabel}>{t('journal:low')}</Text>
                <Text style={styles.moodSummaryCount}>{moodSummary.low}</Text>
              </View>
              <View style={styles.moodSummaryItem}>
                <View style={[styles.moodDot, styles.moodDotNeutral]} />
                <Text style={styles.moodSummaryLabel}>{t('journal:neutral')}</Text>
                <Text style={styles.moodSummaryCount}>{moodSummary.neutral}</Text>
              </View>
              <View style={styles.moodSummaryItem}>
                <View style={[styles.moodDot, styles.moodDotHigh]} />
                <Text style={styles.moodSummaryLabel}>{t('journal:high')}</Text>
                <Text style={styles.moodSummaryCount}>{moodSummary.high}</Text>
              </View>
            </View>
            <Text style={styles.mutedText}>
              {t('journal:moodBalanceHint', { defaultValue: 'The goal is not a perfect mood chart, but noticing how you actually felt.' })}
            </Text>
          </>
        )}
      </View>

      {/* Панель фільтрації + пошук + експорт */}
      <View style={styles.card}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.sectionTitle}>{t('journal:entries')}</Text>
          <Pressable
            onPress={handleExport}
            disabled={exporting || entries.length === 0}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && { opacity: 0.9 },
              (exporting || entries.length === 0) && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.exportButtonText}>{t('journal:export')}</Text>
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('journal:searchPlaceholder')}
          placeholderTextColor="#B0A493"
          style={styles.searchInput}
        />

        <View style={styles.filterChipsRow}>
          {(['all', 'low', 'neutral', 'high'] as const).map((m) => {
            const active = filterMood === m;
            const label =
              m === 'all'
                ? t('journal:all')
                : t(`journal:${m}`);

            return (
              <Pressable
                key={m}
                onPress={() => setFilterMood(m)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {filteredEntries.length === 0 ? (
          <Text style={styles.mutedText}>
            {t('journal:noEntriesFilter')}
          </Text>
        ) : (
          <View style={styles.entriesList}>
            {filteredEntries.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => handleOpenEntry(entry)}
                onLongPress={() => handleDeleteEntry(entry)}
                style={({ pressed }) => [styles.entryCard, pressed && { opacity: 0.95 }]}
              >
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryDate}>{formatHumanDate(entry.date, lang)}</Text>
                  {entry.mood && <Text style={styles.entryMoodBadge}>{t(`journal:${entry.mood}`)}</Text>}
                </View>
                {entry.title ? (
                  <Text style={styles.entryTitle} numberOfLines={1}>
                    {entry.title}
                  </Text>
                ) : null}
                <Text style={styles.entryText} numberOfLines={3}>
                  {entry.text}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.mutedText}>
              {t('journal:tip')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F0E8' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 24 },

  loadingContainer: { flex: 1, backgroundColor: '#F3F0E8', alignItems: 'center', justifyContent: 'center' },
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
  mutedText: { fontSize: 12, color: '#9B8F7C', marginTop: 4 },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2B2620',
    minHeight: 80,
    backgroundColor: '#FFFEFA',
  },

  moodSelectorLabel: { marginTop: 10, fontSize: 13, color: '#4E4537', marginBottom: 4 },

  moodChipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  moodChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFEFA',
    marginRight: 6,
    marginBottom: 6,
  },
  moodChipActive: { borderColor: '#C9A14A', backgroundColor: '#F8F2DE' },
  moodChipText: { fontSize: 12, color: '#6C6255' },
  moodChipTextActive: { fontSize: 12, color: '#2B2620', fontWeight: '600' },

  primaryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#2B2620',
  },
  primaryButtonText: { fontSize: 13, color: '#FFF7E8', fontWeight: '600' },

  moodSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  moodSummaryItem: { flex: 1, marginRight: 6, padding: 8, borderRadius: 12, backgroundColor: '#F8F2DE' },
  moodDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  moodDotLow: { backgroundColor: '#D37B7B' },
  moodDotNeutral: { backgroundColor: '#C9A14A' },
  moodDotHigh: { backgroundColor: '#6AA56A' },
  moodSummaryLabel: { fontSize: 12, color: '#4E4537', marginBottom: 2 },
  moodSummaryCount: { fontSize: 14, fontWeight: '600', color: '#2B2620' },

  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F7F2E7',
  },
  exportButtonText: { fontSize: 12, color: '#6C6255', fontWeight: '500' },

  searchInput: {
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0D4C3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    color: '#2B2620',
    backgroundColor: '#FFFDF7',
  },

  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 4 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFEFA',
    marginRight: 6,
    marginBottom: 6,
  },
  filterChipActive: { borderColor: '#2B2620', backgroundColor: '#2B2620' },
  filterChipText: { fontSize: 12, color: '#6C6255' },
  filterChipTextActive: { fontSize: 12, color: '#FFF7E8', fontWeight: '600' },

  entriesList: { marginTop: 4 },
  entryCard: {
    backgroundColor: '#F8F2DE',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D6C28A',
    marginBottom: 8,
  },
  entryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryDate: { fontSize: 12, color: '#7C7365' },
  entryMoodBadge: {
    fontSize: 11,
    color: '#5D4A23',
    backgroundColor: '#E8D29F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  entryTitle: { fontSize: 13, fontWeight: '600', color: '#2B2620', marginBottom: 2 },
  entryText: { fontSize: 13, color: '#4E4537' },
});
