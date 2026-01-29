// app/progressLogic.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROGRESS_KEYS = {
  xp: '@ya_tvorets_xp',
  level: '@ya_tvorets_level',
  streak: '@ya_tvorets_streak',
  lastSuccessDate: '@ya_tvorets_last_success_date',
} as const;

export const XP_PER_LEVEL = 100;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function shiftedIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ProgressSnapshot = {
  xp: number;
  level: number;
  streak: number;
  lastSuccessDate: string | null;
};

export async function readProgress(): Promise<ProgressSnapshot> {
  const [rawXp, rawLevel, rawStreak, rawLast] = await Promise.all([
    AsyncStorage.getItem(PROGRESS_KEYS.xp),
    AsyncStorage.getItem(PROGRESS_KEYS.level),
    AsyncStorage.getItem(PROGRESS_KEYS.streak),
    AsyncStorage.getItem(PROGRESS_KEYS.lastSuccessDate),
  ]);

  const xp = rawXp ? Number(rawXp) || 0 : 0;
  const level = rawLevel ? Number(rawLevel) || 1 : Math.floor(xp / XP_PER_LEVEL) + 1;
  const streak = rawStreak ? Number(rawStreak) || 0 : 0;
  const lastSuccessDate = rawLast || null;

  return { xp, level, streak, lastSuccessDate };
}

export type ApplyXpResult = {
  newXp: number;
  newLevel: number;
  reward: number;
};

export async function applyXp(reward: number): Promise<ApplyXpResult> {
  const snap = await readProgress();
  const newXp = snap.xp + reward;
  const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

  await Promise.all([
    AsyncStorage.setItem(PROGRESS_KEYS.xp, String(newXp)),
    AsyncStorage.setItem(PROGRESS_KEYS.level, String(newLevel)),
  ]);

  return { newXp, newLevel, reward };
}

export type ApplySuccessResult = {
  newStreak: number;
  lastSuccessDate: string;
  alreadyCountedToday: boolean;
};

/**
 * Увеличиваем streak только 1 раз в день.
 * Если вчера был успех — streak++, иначе streak=1.
 */
export async function applySuccessStreak(): Promise<ApplySuccessResult> {
  const snap = await readProgress();

  const today = todayIso();
  if (snap.lastSuccessDate === today) {
    return { newStreak: snap.streak, lastSuccessDate: today, alreadyCountedToday: true };
  }

  const yesterday = shiftedIso(-1);
  const newStreak = snap.lastSuccessDate === yesterday ? snap.streak + 1 : 1;

  await Promise.all([
    AsyncStorage.setItem(PROGRESS_KEYS.streak, String(newStreak)),
    AsyncStorage.setItem(PROGRESS_KEYS.lastSuccessDate, today),
  ]);

  return { newStreak, lastSuccessDate: today, alreadyCountedToday: false };
}
