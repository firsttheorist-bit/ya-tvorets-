// app/mentorCore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage, MentorMode, TraitKey } from './mentorPhrases';
import { computeMentorMode, getDailyMentorLine } from './mentorPhrases';
import { loadProfile } from './storage/profileStore';
import { STORAGE_KEYS } from './storage/storageKeys';

export type MentorContext = {
  lang: AppLanguage;
  mentor: 'lev' | 'lana' | 'bro' | 'katana';
  gender: 'neutral' | 'male' | 'female';
  name: string;
  mainGrowth: TraitKey | null;
  mode: MentorMode;
};

export type DayFrame = {
  mode: MentorMode;
  oneLiner: string;   // основная фраза дня
  microRule: string;  // короткое правило/ритуал (фиксировано и понятно)
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftedIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function readTraitsMainGrowth(): Promise<TraitKey | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.traits);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;
    const gz = Array.isArray(parsed?.growthZones) ? (parsed.growthZones as any[]) : [];
    const first = gz.length ? gz[0] : null;
    return typeof first === 'string' ? (first as TraitKey) : null;
  } catch {
    return null;
  }
}

// Главный конструктор контекста наставника под “день”
export async function buildMentorContext(params: {
  lang: AppLanguage;
}): Promise<MentorContext> {
  const { lang } = params;

  const profile = await loadProfile();
  const mainGrowth = await readTraitsMainGrowth();

  const [streakRaw, lastRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.streak),
    AsyncStorage.getItem(STORAGE_KEYS.lastSuccessDate),
  ]);

  const streak = streakRaw ? Number(streakRaw) || 0 : 0;
  const lastSuccessDate = lastRaw ? lastRaw.slice(0, 10) : null;

  const mode = computeMentorMode({ streak, lastSuccessDate });

  const name = (profile.name ?? '').trim();
  const safeName = name.length ? name : lang === 'ua' ? 'Творець' : 'Creator';

  return {
    lang,
    mentor: profile.mentor,
    gender: profile.gender,
    name: safeName,
    mainGrowth,
    mode,
  };
}

// Нормализованный “каркас дня”
export function computeDayFrame(ctx: MentorContext): DayFrame {
  const oneLiner = getDailyMentorLine({
    mentor: ctx.mentor,
    lang: ctx.lang,
    growth: ctx.mainGrowth,
    mode: ctx.mode,
    gender: ctx.gender,
    name: ctx.name,
  });

  // Простое правило дня: короткое, исполнимое, “микро-ритуал”
  // (сознательно без рандома, чтобы всегда звучало одинаково и не ломало UX)
  const microRule =
    ctx.lang === 'ua'
      ? ctx.mode === 'push'
        ? 'Правило дня: додай +1% — один крок понад мінімум.'
        : ctx.mode === 'support'
        ? 'Правило дня: зменш крок, але не скасовуй рух.'
        : 'Правило дня: одна точна дія без перемикань.'
      : ctx.mode === 'push'
      ? 'Rule: add +1% — one step above minimum.'
      : ctx.mode === 'support'
      ? 'Rule: shrink the step, don’t cancel the journey.'
      : 'Rule: one precise action, no switching.';

  return { mode: ctx.mode, oneLiner, microRule };
}
