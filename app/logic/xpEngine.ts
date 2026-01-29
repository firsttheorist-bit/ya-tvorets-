// app/logic/xpEngine.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Типы ----------
export type AppLanguage = 'ua' | 'en';
export type MentorMode = 'default' | 'after_break' | 'long_streak';

export interface XpContext {
  isGrowthTask?: boolean;            // задача по зоне роста
  mentorMode?: MentorMode;           // режим наставника
  streak?: number;                   // текущая серия
  dayCompleted?: boolean;            // все задачи дня выполнены
  afterBreak?: boolean;              // возвращение после паузы
  tasksCompletedToday?: number;      // сколько задач уже сделано
  totalTasksToday?: number;          // всего задач сегодня
}

export interface LevelInfo {
  level: number;
  nextLevelXp: number;
  currentLevelXp: number;
}

// ---------- Хранилище ----------
const STORAGE_KEYS = {
  xp: '@ya_tvorets_xp',
  level: '@ya_tvorets_level',
  streak: '@ya_tvorets_streak',
  lastSuccessDate: '@ya_tvorets_last_success_date',
};

// ---------- Модель уровней ----------
/**
 * Возвращает суммарный XP, требуемый для начала заданного уровня.
 * Level 1 = 0 XP, дальше рост 100, 120, 140, ...
 */
export function getRequiredXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    const increment = 100 + (i - 1) * 20;
    total += increment;
  }
  return total;
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  while (true) {
    const nextLevelReq = getRequiredXpForLevel(level + 1);
    if (xp >= nextLevelReq) {
      level++;
    } else {
      break;
    }
  }
  return level;
}

export function getLevelInfo(xp: number): LevelInfo {
  const level = getLevelFromXp(xp);
  const currentLevelXp = getRequiredXpForLevel(level);
  const nextLevelXp = getRequiredXpForLevel(level + 1);
  return { level, nextLevelXp, currentLevelXp };
}

// ---------- Динамический расчёт XP ----------
/**
 * Базовый XP за выполнение мелкой задачи.
 */
const BASE_XP = 10;

export function calculateXpReward(ctx: XpContext): number {
  let xp = BASE_XP;

  // 1) Зона роста
  if (ctx.isGrowthTask) xp *= 1.3;

  // 2) Streak бонус (если streak уже хороший)
  if (ctx.streak && ctx.streak >= 5) xp *= 1.1;

  // 3) Наставник: long_streak = лёгкий бонус
  if (ctx.mentorMode === 'long_streak') xp += 5;

  // 4) Наставник: after_break = поддерживающий бонус
  if (ctx.mentorMode === 'after_break') xp += 7;

  // 5) День после перерыва — дополнительные +20%
  if (ctx.afterBreak) xp *= 1.2;

  // 6) Бонус за последнюю задачу дня
  // безопасно обрабатываем undefined
  if (
    typeof ctx.totalTasksToday === 'number' &&
    ctx.totalTasksToday > 0
  ) {
    const done =
      typeof ctx.tasksCompletedToday === 'number'
        ? ctx.tasksCompletedToday
        : 0;

    if (done + 1 === ctx.totalTasksToday) {
      xp += 10;
    }
  }

  return Math.round(xp);
}

// ---------- Streak Engine v2 ----------
export function computeStreak(
  lastSuccessDate: string | null,
  todayIso: string
): number | null {
  if (!lastSuccessDate) return 1;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(
    (Date.parse(todayIso) - Date.parse(lastSuccessDate)) / oneDayMs
  );

  if (diffDays === 0) return null; // уже обновили сегодня
  if (diffDays === 1) return 1;    // новая серия (упрощённо)
  if (diffDays === -1) return null;

  // после длинной паузы — начинаем с 1, а не с 0
  return 1;
}

/**
 * Обновляет streak и lastSuccessDate.
 */
export async function updateStreak(): Promise<number> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const storedLast = await AsyncStorage.getItem(STORAGE_KEYS.lastSuccessDate);
  const storedStreakRaw = await AsyncStorage.getItem(STORAGE_KEYS.streak);
  const prevStreak = storedStreakRaw ? Number(storedStreakRaw) || 0 : 0;

  const oneDayMs = 24 * 60 * 60 * 1000;

  if (!storedLast) {
    await AsyncStorage.setItem(STORAGE_KEYS.lastSuccessDate, todayIso);
    await AsyncStorage.setItem(STORAGE_KEYS.streak, '1');
    return 1;
  }

  const diffDays = Math.floor(
    (Date.parse(todayIso) - Date.parse(storedLast)) / oneDayMs
  );

  // уже был успех сегодня — просто возвращаем старый streak
  if (diffDays === 0) {
    return prevStreak > 0 ? prevStreak : 1;
  }

  let newStreak: number;

  if (diffDays === 1) {
    // продолжаем серию
    newStreak = prevStreak > 0 ? prevStreak + 1 : 1;
  } else {
    // пауза больше дня — начинаем с 1
    newStreak = 1;
  }

  await AsyncStorage.setItem(STORAGE_KEYS.lastSuccessDate, todayIso);
  await AsyncStorage.setItem(STORAGE_KEYS.streak, String(newStreak));

  return newStreak;
}

// ---------- Основная функция начисления XP ----------
export async function grantXp(ctx: XpContext): Promise<{
  newXp: number;
  newLevel: number;
  reward: number;
}> {
  const reward = calculateXpReward(ctx);

  const raw = await AsyncStorage.getItem(STORAGE_KEYS.xp);
  const currentXp = raw ? Number(raw) || 0 : 0;
  const updatedXp = currentXp + reward;

  await AsyncStorage.setItem(STORAGE_KEYS.xp, String(updatedXp));

  const level = getLevelFromXp(updatedXp);
  await AsyncStorage.setItem(STORAGE_KEYS.level, String(level));

  return { newXp: updatedXp, newLevel: level, reward };
}

// ---------- Простой интерфейс для TodayScreen & Challenges ----------
export async function applyTaskCompletionXp(context: XpContext) {
  const streak = await updateStreak();
  const res = await grantXp({ ...context, streak });
  return res;
}
