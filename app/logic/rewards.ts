// app/logic/rewards.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RewardSource = 'task' | 'challenge';

const STORAGE_KEYS = {
  xp: '@ya_tvorets_xp',
  level: '@ya_tvorets_level',
  streak: '@ya_tvorets_streak',
  lastSuccessDate: '@ya_tvorets_last_success_date',
};

// базовые значения — можно балансировать в одном месте
const XP_PER_LEVEL = 100;

const XP_BY_SOURCE: Record<RewardSource, number> = {
  task: 10,
  challenge: 20,
};

export interface RewardResult {
  xpGained: number;
  totalXp: number;
  level: number;
  streak: number;
  leveledUp: boolean;
  streakIncreased: boolean;
}

/**
 * Универсальная точка начисления награды
 * Используется и Today, и Challenges
 */
export async function applyReward(
  source: RewardSource
): Promise<RewardResult> {
  const today = new Date().toISOString().slice(0, 10);

  // читаем текущее состояние
  const [
    rawXp,
    rawLevel,
    rawStreak,
    lastSuccessDate,
  ] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.xp),
    AsyncStorage.getItem(STORAGE_KEYS.level),
    AsyncStorage.getItem(STORAGE_KEYS.streak),
    AsyncStorage.getItem(STORAGE_KEYS.lastSuccessDate),
  ]);

  const currentXp = Number(rawXp) || 0;
  const currentLevel = Number(rawLevel) || 1;
  const currentStreak = Number(rawStreak) || 0;

  const xpGained = XP_BY_SOURCE[source];
  const newXp = currentXp + xpGained;

  const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
  const leveledUp = newLevel > currentLevel;

  // streak логика
  let newStreak = currentStreak;
  let streakIncreased = false;

  if (lastSuccessDate !== today) {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);

    newStreak = lastSuccessDate === yesterday
      ? currentStreak + 1
      : 1;

    streakIncreased = true;
  }

  // сохраняем
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.xp, String(newXp)),
    AsyncStorage.setItem(STORAGE_KEYS.level, String(newLevel)),
    AsyncStorage.setItem(STORAGE_KEYS.streak, String(newStreak)),
    AsyncStorage.setItem(STORAGE_KEYS.lastSuccessDate, today),
  ]);

  return {
    xpGained,
    totalXp: newXp,
    level: newLevel,
    streak: newStreak,
    leveledUp,
    streakIncreased,
  };
}
