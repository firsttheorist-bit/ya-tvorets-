// app/storage/mentorMemoryStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MentorId, MentorMode, TraitKey } from '../mentorPhrases';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type MentorMemoryEntry = {
  date: string; // YYYY-MM-DD
  goal: string;
  xpEarned: number; // >=0
  hasAnyAction: boolean;
  closedAs: 'evening' | 'bad_day';

  // NEW
  mentor: MentorId;
  mode: MentorMode;
  growth: TraitKey | null;
};

const MEMORY_KEY = '@ya_tvorets_mentor_memory_v2';
const MAX_KEEP = 2;

async function readAll(): Promise<MentorMemoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MentorMemoryEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (x) =>
          x &&
          typeof x.date === 'string' &&
          typeof x.goal === 'string' &&
          Number.isFinite(Number(x.xpEarned)) &&
          typeof x.hasAnyAction === 'boolean' &&
          (x.closedAs === 'evening' || x.closedAs === 'bad_day') &&
          (x.mentor === 'lev' || x.mentor === 'lana' || x.mentor === 'bro' || x.mentor === 'katana') &&
          (x.mode === 'neutral' || x.mode === 'support' || x.mode === 'push')
      )
      .map((x) => ({
        ...x,
        xpEarned: Math.max(0, Math.floor(Number(x.xpEarned))),
        growth:
          x.growth === 'focus' ||
          x.growth === 'calm' ||
          x.growth === 'confidence' ||
          x.growth === 'discipline' ||
          x.growth === 'creativity' ||
          x.growth === 'empathy'
            ? (x.growth as TraitKey)
            : null,
      }));
  } catch {
    return [];
  }
}

async function writeAll(items: MentorMemoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

export async function recordTodayMentorMemory(params: {
  goal: string;
  xpEarned: number;
  hasAnyAction: boolean;
  closedAs: 'evening' | 'bad_day';

  mentor: MentorId;
  mode: MentorMode;
  growth: TraitKey | null;
}): Promise<void> {
  const date = todayIso();

  const entry: MentorMemoryEntry = {
    date,
    goal: (params.goal ?? '').trim(),
    xpEarned: Math.max(0, Math.floor(Number(params.xpEarned) || 0)),
    hasAnyAction: Boolean(params.hasAnyAction),
    closedAs: params.closedAs,

    mentor: params.mentor,
    mode: params.mode,
    growth: params.growth ?? null,
  };

  const all = await readAll();
  const withoutToday = all.filter((x) => x.date !== date);

  const next = [...withoutToday, entry]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(-MAX_KEEP);

  await writeAll(next);
}

export async function getLastMentorMemory(): Promise<MentorMemoryEntry | null> {
  const all = await readAll();
  const t = todayIso();

  const filtered = all
    .filter((x) => x.date !== t)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  return filtered.length ? filtered[0] : null;
}

export async function clearMentorMemory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MEMORY_KEY);
  } catch {
    // noop
  }
}
