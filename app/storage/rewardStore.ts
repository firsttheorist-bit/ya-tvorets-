// app/storage/rewardStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Reward Engine v1
 * Единая логика начисления XP/уровня/серии (streak) для Today/Challenges/Journal.
 * Минималистично и безопасно: без зависимости от UI и без сложных правил.
 */

export type RewardAction = 'task' | 'challenge' | 'journal';

export type RewardResult = {
  xpGained: number;
  newXp: number;
  newLevel: number;
  newStreak: number;
  lastSuccessDate: string; // YYYY-MM-DD
};

export const REWARD_STORAGE_KEYS = {
  xp: '@ya_tvorets_xp',
  level: '@ya_tvorets_level',
  streak: '@ya_tvorets_streak',
  lastSuccessDate: '@ya_tvorets_last_success_date',
} as const;

const XP_PER_LEVEL = 100;

// Базовые награды (можно тюнить позже)
const XP_REWARDS: Record<RewardAction, number> = {
  task: 10,
  challenge: 20,
  journal: 5,
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftedIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toNumberOr(fallback: number, raw: string | null): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function computeLevelFromXp(xp: number): number {
  // Level starts at 1
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

/**
 * Правило streak:
 * - если lastSuccessDate === today -> streak не меняем
 * - если lastSuccessDate === yesterday -> streak + 1
 * - иначе -> streak = 1
 */
export function computeNextStreak(params: {
  currentStreak: number;
  lastSuccessDate: string | null;
  nowIso?: string;
}): { newStreak: number; newLastSuccessDate: string } {
  const now = params.nowIso ?? todayIso();
  const yesterday = shiftedIso(-1);

  if (params.lastSuccessDate === now) {
    return { newStreak: params.currentStreak, newLastSuccessDate: now };
  }

  if (params.lastSuccessDate === yesterday) {
    return { newStreak: Math.max(1, params.currentStreak + 1), newLastSuccessDate: now };
  }

  return { newStreak: 1, newLastSuccessDate: now };
}

export async function readRewardState(): Promise<{
  xp: number;
  level: number;
  streak: number;
  lastSuccessDate: string | null;
}> {
  try {
    const [rawXp, rawLevel, rawStreak, rawLast] = await Promise.all([
      AsyncStorage.getItem(REWARD_STORAGE_KEYS.xp),
      AsyncStorage.getItem(REWARD_STORAGE_KEYS.level),
      AsyncStorage.getItem(REWARD_STORAGE_KEYS.streak),
      AsyncStorage.getItem(REWARD_STORAGE_KEYS.lastSuccessDate),
    ]);

    const xp = toNumberOr(0, rawXp);
    const level = toNumberOr(computeLevelFromXp(xp), rawLevel);
    const streak = toNumberOr(0, rawStreak);
    const lastSuccessDate = rawLast ?? null;

    return { xp, level, streak, lastSuccessDate };
  } catch (e) {
    console.log('readRewardState error', e);
    return { xp: 0, level: 1, streak: 0, lastSuccessDate: null };
  }
}

export async function writeRewardState(params: {
  xp: number;
  level: number;
  streak: number;
  lastSuccessDate: string;
}): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(REWARD_STORAGE_KEYS.xp, String(params.xp)),
      AsyncStorage.setItem(REWARD_STORAGE_KEYS.level, String(params.level)),
      AsyncStorage.setItem(REWARD_STORAGE_KEYS.streak, String(params.streak)),
      AsyncStorage.setItem(REWARD_STORAGE_KEYS.lastSuccessDate, params.lastSuccessDate),
    ]);
  } catch (e) {
    console.log('writeRewardState error', e);
  }
}

/**
 * Главная функция наград.
 * - начисляет XP
 * - пересчитывает уровень
 * - обновляет streak/lastSuccessDate (только при реальном "успехе": task/challenge/journal)
 */
export async function applyReward(action: RewardAction): Promise<RewardResult> {
  const now = todayIso();
  const baseReward = XP_REWARDS[action] ?? 0;

  const state = await readRewardState();

  const newXp = Math.max(0, state.xp + baseReward);
  const newLevel = computeLevelFromXp(newXp);

  const streakRes = computeNextStreak({
    currentStreak: state.streak,
    lastSuccessDate: state.lastSuccessDate,
    nowIso: now,
  });

  await writeRewardState({
    xp: newXp,
    level: newLevel,
    streak: streakRes.newStreak,
    lastSuccessDate: streakRes.newLastSuccessDate,
  });

  return {
    xpGained: baseReward,
    newXp,
    newLevel,
    newStreak: streakRes.newStreak,
    lastSuccessDate: streakRes.newLastSuccessDate,
  };
}

/**
 * Если нужно начислять 0 XP, но обновить streak (например, "честно пропустил", не награждаем).
 * Сейчас не используем, но полезно на будущее.
 */
export async function touchSuccessWithoutXp(): Promise<{
  newStreak: number;
  lastSuccessDate: string;
}> {
  const now = todayIso();
  const state = await readRewardState();

  const streakRes = computeNextStreak({
    currentStreak: state.streak,
    lastSuccessDate: state.lastSuccessDate,
    nowIso: now,
  });

  // xp/level не меняем
  await writeRewardState({
    xp: state.xp,
    level: state.level,
    streak: streakRes.newStreak,
    lastSuccessDate: streakRes.newLastSuccessDate,
  });

  return {
    newStreak: streakRes.newStreak,
    lastSuccessDate: streakRes.newLastSuccessDate,
  };
}
