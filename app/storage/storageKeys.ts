// app/storage/storageKeys.ts

export const STORAGE_KEYS = {
  // profile
  name: '@ya_tvorets_name',
  mentor: '@ya_tvorets_mentor',
  gender: '@ya_tvorets_gender',

  // language (если LanguageContext сам хранит — можно не использовать)
  language: '@ya_tvorets_language',

  // traits
  traits: '@ya_tvorets_traits',

  // today tasks
  todayTasks: '@ya_tvorets_today_tasks',
  lastOpenDate: '@ya_tvorets_last_open_date',

  // progress
  xp: '@ya_tvorets_xp',
  level: '@ya_tvorets_level',
  streak: '@ya_tvorets_streak',
  lastSuccessDate: '@ya_tvorets_last_success_date',

  // journal
  journal: '@ya_tvorets_journal_entries',

  // challenges (старый ключ — оставляем, чтобы ничего не потерять)
  challenges: '@ya_tvorets_challenges',

  // daily challenges (новая подборка 3/день)
  dailyChallenges: '@ya_tvorets_daily_challenges_v1',
  dailyChallengesDate: '@ya_tvorets_daily_challenges_date_v1',
} as const;
