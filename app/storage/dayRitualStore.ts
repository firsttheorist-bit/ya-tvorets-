// app/storage/dayRitualStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayLocalIso } from '../utils/date';

function todayIso(): string {
  return todayLocalIso();
}




const MORNING_DONE_DATE_KEY = '@ya_tvorets_morning_done_date_v1';
const EVENING_DONE_DATE_KEY = '@ya_tvorets_evening_done_date_v1';

// цель дня (текст) привязанная к дате
const DAY_GOAL_KEY = '@ya_tvorets_day_goal_v1';

type DayGoalPayload = {
  date: string; // YYYY-MM-DD
  goal: string;
};

// ----------------------
// Morning / Evening flags
// ----------------------
export async function isMorningDoneToday(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(MORNING_DONE_DATE_KEY);
    return v === todayIso();
  } catch {
    return false;
  }
}

export async function markMorningDoneToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(MORNING_DONE_DATE_KEY, todayIso());
  } catch {
    // noop
  }
}

export async function isEveningDoneToday(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(EVENING_DONE_DATE_KEY);
    return v === todayIso();
  } catch {
    return false;
  }
}

export async function markEveningDoneToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENING_DONE_DATE_KEY, todayIso());
  } catch {
    // noop
  }
}

// ----------------------
// Goal of the day
// ----------------------
export async function getTodayGoal(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(DAY_GOAL_KEY);
    if (!raw) return '';

    const parsed = JSON.parse(raw) as unknown;
    const obj = parsed as Partial<DayGoalPayload>;

    if (!obj || typeof obj !== 'object') return '';
    if (typeof obj.date !== 'string' || obj.date !== todayIso()) return '';
    if (typeof obj.goal !== 'string') return '';

    return obj.goal;
  } catch {
    return '';
  }
}

export async function setTodayGoal(goal: string): Promise<void> {
  try {
    const payload: DayGoalPayload = { date: todayIso(), goal: String(goal ?? '').trim() };
    await AsyncStorage.setItem(DAY_GOAL_KEY, JSON.stringify(payload));
  } catch {
    // noop
  }
}

export async function ensureTodayGoal(factory: () => string): Promise<string> {
  const existing = await getTodayGoal();
  if (existing.trim().length) return existing;

  const generated = String(factory?.() ?? '').trim();
  if (!generated.length) return '';

  await setTodayGoal(generated);
  return generated;
}

// ----------------------
// Optional reset helpers
// ----------------------
export async function resetTodayGoal(): Promise<void> {
  await setTodayGoal('');
}
