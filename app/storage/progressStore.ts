// app/storage/progressStore.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';

export type ProgressState = {
  xp: number;
  level: number;
  streak: number;
  lastSuccessDate: string | null; // YYYY-MM-DD
};

const XP_PER_LEVEL = 100;

function toInt(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadProgress(): Promise<ProgressState> {
  try {
    const [xpRaw, levelRaw, streakRaw, lastSuccessRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.xp),
      AsyncStorage.getItem(STORAGE_KEYS.level),
      AsyncStorage.getItem(STORAGE_KEYS.streak),
      AsyncStorage.getItem(STORAGE_KEYS.lastSuccessDate),
    ]);

    return {
      xp: toInt(xpRaw, 0),
      level: toInt(levelRaw, 1),
      streak: toInt(streakRaw, 0),
      lastSuccessDate: lastSuccessRaw ?? null,
    };
  } catch (e) {
    console.log('loadProgress error', e);
    return { xp: 0, level: 1, streak: 0, lastSuccessDate: null };
  }
}

export async function applyXpDelta(currentXp: number, addedXp: number) {
  const newXp = currentXp + addedXp;
  const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.xp, String(newXp)),
    AsyncStorage.setItem(STORAGE_KEYS.level, String(newLevel)),
  ]);

  return { newXp, newLevel };
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getShiftedIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function applySuccessStreak(params: {
  currentStreak: number;
  lastSuccessDate: string | null;
}) {
  const today = getTodayIso();
  if (params.lastSuccessDate === today) {
    return { newStreak: params.currentStreak, today, changed: false };
  }

  const yesterday = getShiftedIso(-1);
  const newStreak = params.lastSuccessDate === yesterday ? params.currentStreak + 1 : 1;

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.streak, String(newStreak)),
    AsyncStorage.setItem(STORAGE_KEYS.lastSuccessDate, today),
  ]);

  return { newStreak, today, changed: true };
}
