// app/storage/journalStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from '../mentorPhrases';

export type JournalSource = 'reflection' | 'bad_day' | 'challenge' | 'system' | 'note';
export type JournalMood = 'low' | 'neutral' | 'high';

export type JournalEntry = {
  id: string;
  createdAt: string; // ISO
  title: string;
  text: string;
  mood?: JournalMood;
  source: JournalSource;
  meta?: Record<string, unknown>;
};

const JOURNAL_KEY = '@ya_tvorets_journal_v1';
const MAX_ENTRIES = 500;

// Сколько последних записей сканируем для идемпотентности
const IDEMPOTENCY_SCAN_LIMIT = 200;

function safeStr(v: unknown): string {
  return String(v ?? '').trim();
}

function isMood(v: unknown): v is JournalMood {
  return v === 'low' || v === 'neutral' || v === 'high';
}

function isSource(v: unknown): v is JournalSource {
  return v === 'reflection' || v === 'bad_day' || v === 'challenge' || v === 'system' || v === 'note';
}

function sanitizeEntry(raw: any): JournalEntry | null {
  const id = safeStr(raw?.id);
  const createdAt = safeStr(raw?.createdAt);
  const title = safeStr(raw?.title);
  const text = String(raw?.text ?? '');
  const source = raw?.source;

  if (!id || !createdAt || !title || !isSource(source)) return null;

  const moodRaw = raw?.mood;
  const mood = moodRaw == null ? undefined : isMood(moodRaw) ? moodRaw : undefined;

  const metaRaw = raw?.meta;
  const meta =
    metaRaw && typeof metaRaw === 'object' && !Array.isArray(metaRaw)
      ? (metaRaw as Record<string, unknown>)
      : undefined;

  return { id, createdAt, title, text, source, ...(mood ? { mood } : {}), ...(meta ? { meta } : {}) };
}

async function readAll(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as any[]).map(sanitizeEntry).filter((x): x is JournalEntry => x != null);
  } catch {
    return [];
  }
}

async function writeAll(list: JournalEntry[]): Promise<void> {
  const trimmed = list.slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(trimmed));
}

function makeId(): string {
  return `j_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readIdempotencyKey(e: JournalEntry): string | null {
  const v = e?.meta?.idempotencyKey;
  return typeof v === 'string' && v.trim().length ? v.trim() : null;
}

function readIdempotencyKeyFromMeta(meta?: Record<string, unknown>): string {
  const v = meta?.idempotencyKey;
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Основной метод.
 * Добавляет запись в начало списка.
 * Поддерживает idempotencyKey:
 * - можно передать params.idempotencyKey
 * - либо meta.idempotencyKey (для совместимости с текущими вызовами из index.tsx)
 */
export async function prependJournalEntry(params: {
  title: string;
  text: string;
  source: JournalSource;
  mood?: JournalMood;
  meta?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<JournalEntry> {
  const title = safeStr(params.title);
  const text = String(params.text ?? '');

  // Совместимость: берём ключ либо из отдельного поля, либо из meta
  const directKey = safeStr(params.idempotencyKey);
  const metaKey = readIdempotencyKeyFromMeta(params.meta);
  const idKey = (directKey || metaKey).trim();

  const metaMerged: Record<string, unknown> | undefined = (() => {
    const base =
      params.meta && typeof params.meta === 'object' && !Array.isArray(params.meta)
        ? { ...params.meta }
        : undefined;

    if (idKey.length) {
      return { ...(base ?? {}), idempotencyKey: idKey };
    }
    return base;
  })();

  const list = await readAll();

  // Идемпотентность: если ключ задан — не плодим дубли
  if (idKey.length) {
    const scan = list.slice(0, IDEMPOTENCY_SCAN_LIMIT);
    const existing = scan.find((e) => readIdempotencyKey(e) === idKey);
    if (existing) return existing;
  }

  const entry: JournalEntry = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    title: title || 'Untitled',
    text,
    source: params.source,
    ...(params.mood ? { mood: params.mood } : {}),
    ...(metaMerged ? { meta: metaMerged } : {}),
  };

  await writeAll([entry, ...list]);
  return entry;
}

/**
 * Получить журнал (по умолчанию последние 100).
 * Можно фильтровать по source.
 */
export async function getJournalEntries(params?: { limit?: number; source?: JournalSource }): Promise<JournalEntry[]> {
  const limit = typeof params?.limit === 'number' ? Math.max(1, Math.floor(params.limit)) : 100;
  const source = params?.source;

  const list = await readAll();
  const filtered = source ? list.filter((e) => e.source === source) : list;
  return filtered.slice(0, limit);
}

export async function clearJournal(): Promise<void> {
  await AsyncStorage.removeItem(JOURNAL_KEY);
}

/**
 * То, что вызывается из challenges.tsx
 */
export async function appendChallengeJournalEntry(params: {
  succeeded: boolean;
  challengeId: string;
  challengeTitle: string;
  lang: AppLanguage;
}): Promise<JournalEntry> {
  const title =
    params.lang === 'ua'
      ? params.succeeded
        ? 'Челендж виконано'
        : 'Челендж пропущено'
      : params.succeeded
      ? 'Challenge completed'
      : 'Challenge skipped';

  const text =
    params.lang === 'ua'
      ? `${params.succeeded ? 'Зараховано' : 'Пропущено'}: ${params.challengeTitle}`
      : `${params.succeeded ? 'Counted' : 'Skipped'}: ${params.challengeTitle}`;

  return prependJournalEntry({
    title,
    text,
    source: 'challenge',
    meta: { challengeId: params.challengeId, succeeded: params.succeeded },
  });
}
