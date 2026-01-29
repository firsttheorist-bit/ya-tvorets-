// app/storage/migrate.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './keys';

export type ProgressV1 = {
  xp: number;
  level: number;
  streak: number;
  lastSuccessDate: string | null; // YYYY-MM-DD
  updatedAt: string; // ISO
};

const CURRENT_SCHEMA_VERSION = 1;
const XP_PER_LEVEL = 100;

function safeNumber(v: string | null, fallback: number): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(n: number, min: number, max: number): number {
  const x = Math.floor(n);
  return Math.min(max, Math.max(min, x));
}

function computeLevelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/**
 * Миграция данных в unified progress key.
 * Безопасно: не удаляет legacy ключи, чтобы старые экраны не ломались,
 * но формирует новый источник истины (@ya_tvorets_progress_v1).
 */
export async function migrateStorageIfNeeded(): Promise<void> {
  try {
    const [schemaRaw, existingProgressRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.schemaVersion),
      AsyncStorage.getItem(STORAGE_KEYS.progressV1),
    ]);

    const schemaVersion = schemaRaw ? Number(schemaRaw) : 0;

    // Если уже есть progressV1 и версия актуальна — ничего не делаем.
    if (existingProgressRaw && schemaVersion >= CURRENT_SCHEMA_VERSION) {
      return;
    }

    // Пробуем восстановить из legacy ключей
    const [rawXp, rawLevel, rawStreak, rawLastSuccess] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.xp),
      AsyncStorage.getItem(STORAGE_KEYS.level),
      AsyncStorage.getItem(STORAGE_KEYS.streak),
      AsyncStorage.getItem(STORAGE_KEYS.lastSuccessDate),
    ]);

    const xp = clampInt(safeNumber(rawXp, 0), 0, 10_000_000);

    // level лучше пересчитать из xp (чтобы исключить рассинхрон)
    const computedLevel = computeLevelFromXp(xp);
    const legacyLevel = clampInt(safeNumber(rawLevel, computedLevel), 1, 1_000_000);
    const level = Math.max(computedLevel, legacyLevel);

    const streak = clampInt(safeNumber(rawStreak, 0), 0, 1_000_000);

    const lastSuccessDate =
      rawLastSuccess && rawLastSuccess.trim().length >= 10
        ? rawLastSuccess.trim().slice(0, 10)
        : null;

    const progress: ProgressV1 = {
      xp,
      level,
      streak,
      lastSuccessDate,
      updatedAt: new Date().toISOString(),
    };

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.progressV1, JSON.stringify(progress)),
      AsyncStorage.setItem(STORAGE_KEYS.schemaVersion, String(CURRENT_SCHEMA_VERSION)),
    ]);
  } catch (e) {
    console.log('migrateStorageIfNeeded error', e);
  }
}
