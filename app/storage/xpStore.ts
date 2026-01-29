// app/storage/xpStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateIso, todayLocalIso } from '../utils/date';
import { STORAGE_KEYS } from './storageKeys';

export type XpState = {
  xp: number;
  level: number;
  streak: number;
  lastSuccessDate: string | null; // YYYY-MM-DD (LOCAL)
};

const XP_PER_LEVEL = 100;

function todayIso(): string {
  return todayLocalIso();
}

function shiftedIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateIso(d);
}

function num(v: string | null): number {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeLevelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export async function loadXpState(): Promise<XpState> {
  const [xpRaw, levelRaw, streakRaw, lastRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.xp),
    AsyncStorage.getItem(STORAGE_KEYS.level),
    AsyncStorage.getItem(STORAGE_KEYS.streak),
    AsyncStorage.getItem(STORAGE_KEYS.lastSuccessDate),
  ]);

  const xp = num(xpRaw);
  const levelFromXp = computeLevelFromXp(xp);

  const levelStored = num(levelRaw);
  const level = levelStored > 0 ? levelStored : levelFromXp;

  const normalizedLevel = levelStored > 0 ? levelFromXp : level;

  const streak = num(streakRaw);
  const lastSuccessDate = lastRaw ? lastRaw.slice(0, 10) : null;

  if (normalizedLevel !== levelStored && normalizedLevel > 0) {
    await AsyncStorage.setItem(STORAGE_KEYS.level, String(normalizedLevel));
  }

  return { xp, level: normalizedLevel, streak, lastSuccessDate };
}

export async function addXp(delta: number): Promise<XpState> {
  const state = await loadXpState();
  const newXp = Math.max(0, state.xp + Math.trunc(delta));
  const newLevel = computeLevelFromXp(newXp);

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.xp, String(newXp)),
    AsyncStorage.setItem(STORAGE_KEYS.level, String(newLevel)),
  ]);

  return { ...state, xp: newXp, level: newLevel };
}

/**
 * Регистрирует “успешный день” (ТОЛЬКО при evening close и только если был action):
 * - обновляет streak (1 или +1 если вчера был успех)
 * - пишет lastSuccessDate = today
 */
export async function registerDailySuccess(): Promise<XpState> {
  const state = await loadXpState();
  const today = todayIso();

  if (state.lastSuccessDate === today) return state;

  const yest = shiftedIso(-1);
  const newStreak = state.lastSuccessDate === yest ? state.streak + 1 : 1;

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.streak, String(newStreak)),
    AsyncStorage.setItem(STORAGE_KEYS.lastSuccessDate, today),
  ]);

  return { ...state, streak: newStreak, lastSuccessDate: today };
}

/**
 * Backward-compatible API name:
 * rewardForAction теперь означает “+XP” (без streak).
 * Streak обновляется только через registerDailySuccess().
 */
export async function rewardForAction(params: { xpDelta: number }): Promise<XpState> {
  return addXp(params.xpDelta);
}
