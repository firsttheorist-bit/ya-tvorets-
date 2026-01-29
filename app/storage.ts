// app/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage, MentorId, TraitKey } from './mentorPhrases';

// ---------- Типы ----------

export interface TraitsResult {
  strengths: TraitKey[];
  growthZones: TraitKey[];
}

export interface UserProfile {
  name: string;
  mentor: MentorId;
  language: AppLanguage;
}

export interface ProgressState {
  xp: number;
  level: number;
  streak: number;
}

const STORAGE_KEYS = {
  name: '@ya_tvorets_name',
  mentor: '@ya_tvorets_mentor',
  language: '@ya_tvorets_language',

  xp: '@ya_tvorets_xp',
  level: '@ya_tvorets_level',
  streak: '@ya_tvorets_streak',
  lastSuccessDate: '@ya_tvorets_last_success_date',

  todayTasks: '@ya_tvorets_today_tasks',
  lastOpenDate: '@ya_tvorets_last_open_date',

  traits: '@ya_tvorets_traits',

  journal: '@ya_tvorets_journal_entries',

  // если есть ещё ключи челенджей — сюда можно добавить позже
};

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ---------- Профиль пользователя ----------

export async function getUserProfile(
  fallbackLang: AppLanguage,
): Promise<UserProfile> {
  try {
    const [rawName, rawMentor, rawLang] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.name),
      AsyncStorage.getItem(STORAGE_KEYS.mentor),
      AsyncStorage.getItem(STORAGE_KEYS.language),
    ]);

    // имя
    const name =
      rawName && rawName.trim().length > 0
        ? rawName.trim()
        : fallbackLang === 'ua'
        ? 'Творець'
        : 'Creator';

    // наставник
    let mentor: MentorId = 'lev';
    if (rawMentor === 'lev' || rawMentor === 'lana' || rawMentor === 'bro' || rawMentor === 'katana') {
      mentor = rawMentor as MentorId;
    }

    // язык
    let lang: AppLanguage = fallbackLang;
    if (rawLang === 'ua' || rawLang === 'en') {
      lang = rawLang as AppLanguage;
    }

    return { name, mentor, language: lang };
  } catch (e) {
    console.log('Error getUserProfile', e);
    return {
      name: fallbackLang === 'ua' ? 'Творець' : 'Creator',
      mentor: 'lev',
      language: fallbackLang,
    };
  }
}

interface SaveUserProfileInput {
  name?: string;
  mentor?: MentorId;
  language?: AppLanguage;
}

export async function saveUserProfile(input: SaveUserProfileInput): Promise<void> {
  const ops: Array<Promise<void>> = [];

  try {
    if (typeof input.name === 'string') {
      ops.push(AsyncStorage.setItem(STORAGE_KEYS.name, input.name));
    }

    if (input.mentor) {
      ops.push(AsyncStorage.setItem(STORAGE_KEYS.mentor, input.mentor));
    }

    if (input.language) {
      ops.push(AsyncStorage.setItem(STORAGE_KEYS.language, input.language));
    }

    if (ops.length > 0) {
      await Promise.all(ops);
    }
  } catch (e) {
    console.log('Error saveUserProfile', e);
    throw e;
  }
}

// ---------- Прогресс (XP / уровень / streak) ----------

export async function getProgress(): Promise<ProgressState> {
  try {
    const [rawXp, rawLevel, rawStreak] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.xp),
      AsyncStorage.getItem(STORAGE_KEYS.level),
      AsyncStorage.getItem(STORAGE_KEYS.streak),
    ]);

    const xp = rawXp ? Number(rawXp) || 0 : 0;
    const level = rawLevel ? Number(rawLevel) || 1 : 1;
    const streak = rawStreak ? Number(rawStreak) || 0 : 0;

    return { xp, level, streak };
  } catch (e) {
    console.log('Error getProgress', e);
    return { xp: 0, level: 1, streak: 0 };
  }
}

export async function saveProgress(partial: Partial<ProgressState>): Promise<void> {
  const ops: Array<Promise<void>> = [];

  try {
    if (typeof partial.xp === 'number') {
      ops.push(AsyncStorage.setItem(STORAGE_KEYS.xp, String(partial.xp)));
    }
    if (typeof partial.level === 'number') {
      ops.push(AsyncStorage.setItem(STORAGE_KEYS.level, String(partial.level)));
    }
    if (typeof partial.streak === 'number') {
      ops.push(AsyncStorage.setItem(STORAGE_KEYS.streak, String(partial.streak)));
    }

    if (ops.length > 0) {
      await Promise.all(ops);
    }
  } catch (e) {
    console.log('Error saveProgress', e);
    throw e;
  }
}

// ---------- Риси (traits) ----------

export async function getTraits(): Promise<TraitsResult | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.traits);
    const parsed = safeParseJSON<TraitsResult>(raw);
    if (!parsed) return null;

    // лёгкая защита от битых данных
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      growthZones: Array.isArray(parsed.growthZones) ? parsed.growthZones : [],
    };
  } catch (e) {
    console.log('Error getTraits', e);
    return null;
  }
}

export async function saveTraits(traits: TraitsResult): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.traits, JSON.stringify(traits));
  } catch (e) {
    console.log('Error saveTraits', e);
    throw e;
  }
}

// ---------- Today: задачи на сегодня ----------

export async function clearTodayTasks(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.todayTasks,
      STORAGE_KEYS.lastOpenDate,
    ]);
  } catch (e) {
    console.log('Error clearTodayTasks', e);
    throw e;
  }
}

// ---------- Полный сброс прогресса (но не профиля) ----------

export async function resetAllProgress(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.xp,
      STORAGE_KEYS.level,
      STORAGE_KEYS.streak,
      STORAGE_KEYS.lastSuccessDate,

      STORAGE_KEYS.todayTasks,
      STORAGE_KEYS.lastOpenDate,

      STORAGE_KEYS.traits,
      STORAGE_KEYS.journal,
      // сюда можно добавить ключи челенджей, когда будем их централизовать
    ]);
  } catch (e) {
    console.log('Error resetAllProgress', e);
    throw e;
  }
}
