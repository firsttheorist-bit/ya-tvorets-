// app/storage/keys.ts

export const STORAGE_KEYS = {
  // --- Schema / migrations ---
  schemaVersion: '@ya_tvorets_storage_schema_version',

  // --- New unified progress key ---
  progressV1: '@ya_tvorets_progress_v1',

  // --- Legacy progress keys (still kept for backward compatibility) ---
  xp: '@ya_tvorets_xp',
  level: '@ya_tvorets_level',
  streak: '@ya_tvorets_streak',
  lastSuccessDate: '@ya_tvorets_last_success_date',

  // --- Existing app keys used around the app ---
  traits: '@ya_tvorets_traits',
  mentor: '@ya_tvorets_mentor',
  name: '@ya_tvorets_name',
  gender: '@ya_tvorets_gender',

  todayTasks: '@ya_tvorets_today_tasks',
  lastOpenDate: '@ya_tvorets_last_open_date',

  challenges: '@ya_tvorets_challenges',

  journal: '@ya_tvorets_journal_entries',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
