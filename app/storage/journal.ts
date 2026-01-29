// app/storage/journal.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const JOURNAL_KEY = '@ya_tvorets_journal_entries';

export type JournalMood = 'low' | 'neutral' | 'high';
export type JournalSource = 'manual' | 'challenge' | 'reflection' | 'bad_day' | 'win';

export interface JournalEntry {
  id: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  title?: string;
  text: string;
  mood?: JournalMood;
  source?: JournalSource;
  relatedChallengeId?: string;
}

function safeParse<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const raw = await AsyncStorage.getItem(JOURNAL_KEY);
  return safeParse<JournalEntry>(raw);
}

export async function addJournalEntry(entry: JournalEntry): Promise<void> {
  const entries = await getJournalEntries();
  entries.unshift(entry);
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

export async function updateJournalEntry(updated: JournalEntry): Promise<void> {
  const entries = await getJournalEntries();
  const idx = entries.findIndex((e) => e.id === updated.id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], ...updated, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const entries = await getJournalEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(filtered));
}

export async function clearJournal(): Promise<void> {
  await AsyncStorage.removeItem(JOURNAL_KEY);
}

// Утиліта для експорту у JSON
export async function exportJournalToJson(): Promise<string> {
  const entries = await getJournalEntries();
  return JSON.stringify(entries, null, 2);
}
