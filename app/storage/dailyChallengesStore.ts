// app/storage/dailyChallengesStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage, TraitKey } from '../mentorPhrases';
import { localDateIso, todayLocalIso } from '../utils/date';

export type ChallengeStatus = 'pending' | 'completed' | 'skipped';
export type ChallengeComplexity = 'easy' | 'medium' | 'hard';

export type DailyChallenge = {
  id: string;
  trait: TraitKey | null;
  titleUa: string;
  titleEn: string;
  descriptionUa: string;
  descriptionEn: string;
  complexity: ChallengeComplexity;
  status: ChallengeStatus;
  completedAt: string | null;
};

type HistoryItem = { date: string; ids: string[] };

const DAILY_CHALLENGES_KEY = '@ya_tvorets_daily_challenges_v1';
const DAILY_CHALLENGES_DATE_KEY = '@ya_tvorets_daily_challenges_date_v1';
const DAILY_CHALLENGES_HISTORY_KEY = '@ya_tvorets_daily_challenges_history_v1';

export const DAILY_CHALLENGES_COUNT = 3;

// -------- База --------
const BASE_CHALLENGES: Array<Omit<DailyChallenge, 'status' | 'completedAt'>> = [
  // focus
  {
    id: 'ch_focus_1',
    trait: 'focus',
    titleUa: '10 хвилин чистого фокусу',
    titleEn: '10 minutes of pure focus',
    descriptionUa: 'Обери одну справу й працюй над нею 10 хвилин без телефону, сповіщень і перемикань.',
    descriptionEn: 'Pick one task and work on it for 10 minutes without phone, notifications, or switching.',
    complexity: 'easy',
  },
  {
    id: 'ch_focus_2',
    trait: 'focus',
    titleUa: 'Зачистка вкладок',
    titleEn: 'Tab clean-up',
    descriptionUa: 'Закрий 3–5 зайвих вкладок/додатків і доведи одну маленьку справу до кінця.',
    descriptionEn: 'Close 3–5 unnecessary tabs/apps and finish one small task completely.',
    complexity: 'medium',
  },

  // calm
  {
    id: 'ch_calm_1',
    trait: 'calm',
    titleUa: 'Мʼяка пауза для нервової системи',
    titleEn: 'Soft pause for your nervous system',
    descriptionUa: 'Зроби 5 повільних вдихів/видихів, спостерігаючи за тілом (не за думками).',
    descriptionEn: 'Take 5 slow breaths, watching your body (not your thoughts).',
    complexity: 'easy',
  },
  {
    id: 'ch_calm_2',
    trait: 'calm',
    titleUa: 'Зняти напругу з плечей',
    titleEn: 'Release shoulder tension',
    descriptionUa: '60 секунд: підняти плечі → видих → опустити. Повторити 5 разів. Потім ковток води.',
    descriptionEn: '60 seconds: shoulders up → exhale → down. Repeat 5 times. Then drink water.',
    complexity: 'easy',
  },

  // confidence
  {
    id: 'ch_conf_1',
    trait: 'confidence',
    titleUa: 'Маленький крок у “стрьомну” зону',
    titleEn: 'Small step into the “scary” zone',
    descriptionUa: 'Зроби одну дію, яку давно відкладаєш: коротке повідомлення, запит, відповідь.',
    descriptionEn: 'Do one action you postponed: a short message, a question, a reply.',
    complexity: 'medium',
  },
  {
    id: 'ch_conf_2',
    trait: 'confidence',
    titleUa: 'Сказати “так/ні” чітко',
    titleEn: 'Say a clear “yes/no”',
    descriptionUa:
      'Одна межа сьогодні: чітко погодься або відмовся в чомусь невеликому — без пояснень “на 3 сторінки”.',
    descriptionEn: 'One boundary today: say a clear yes/no on something small — without over-explaining.',
    complexity: 'medium',
  },

  // discipline
  {
    id: 'ch_disc_1',
    trait: 'discipline',
    titleUa: 'Закрити один “хвіст”',
    titleEn: 'Close one loose end',
    descriptionUa: 'Обери один “хвіст” і доведи його до завершення в мінімальному форматі.',
    descriptionEn: 'Pick one loose end and finish it in the smallest possible format.',
    complexity: 'medium',
  },
  {
    id: 'ch_disc_2',
    trait: 'discipline',
    titleUa: '10 хвилин порядку',
    titleEn: '10 minutes of order',
    descriptionUa: '10 хвилин: прибери одну маленьку зону (стіл/папка/нотатки). Без ідеалу — тільки “краще ніж було”.',
    descriptionEn: '10 minutes: tidy one small area (desk/folder/notes). Not perfect — just better than before.',
    complexity: 'easy',
  },

  // creativity
  {
    id: 'ch_crea_1',
    trait: 'creativity',
    titleUa: '10 хвилин чесної творчості',
    titleEn: '10 minutes of honest creativity',
    descriptionUa: '10 хвилин без оцінки: ескіз/чорновик/ідеї. Тільки рух.',
    descriptionEn: '10 minutes without judging: sketch/draft/ideas. Just movement.',
    complexity: 'easy',
  },
  {
    id: 'ch_crea_2',
    trait: 'creativity',
    titleUa: '1 новий кут',
    titleEn: 'One new angle',
    descriptionUa: 'Переформулюй одну ідею трьома способами. Без “краще/гірше” — тільки варіанти.',
    descriptionEn: 'Rewrite one idea in 3 different ways. No “better/worse” — only variants.',
    complexity: 'easy',
  },

  // empathy
  {
    id: 'ch_emp_1',
    trait: 'empathy',
    titleUa: 'Одна тепла дія',
    titleEn: 'One warm action',
    descriptionUa: 'Зроби одну невелику дію підтримки: для себе або іншого. Без пафосу.',
    descriptionEn: 'Do one small act of support: for yourself or someone else. No drama.',
    complexity: 'easy',
  },
  {
    id: 'ch_emp_2',
    trait: 'empathy',
    titleUa: 'Пауза перед реакцією',
    titleEn: 'Pause before reacting',
    descriptionUa: 'Перед відповіддю/реакцією: 1 вдих-видих і запитання “що я хочу зберегти в цій взаємодії?”.',
    descriptionEn: 'Before responding: one breath and ask “what do I want to preserve in this interaction?”.',
    complexity: 'medium',
  },
];

// ---------- helpers ----------
function todayIso(): string {
  return todayLocalIso();
}

function hash32(str: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function stableSeedForToday(params: { mainGrowth: TraitKey | null }): number {
  // стабильно в рамках дня; изменится только при смене даты/зоны роста
  return hash32(`${todayIso()}|growth:${params.mainGrowth ?? 'none'}|dailyChallenges:v1`);
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandomWithRng<T>(arr: T[], rng: () => number): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function sanitizeStatus(v: unknown): ChallengeStatus {
  return v === 'completed' || v === 'skipped' || v === 'pending' ? v : 'pending';
}

function sanitizeComplexity(v: unknown): ChallengeComplexity {
  return v === 'easy' || v === 'medium' || v === 'hard' ? v : 'easy';
}

function toStateful(base: Omit<DailyChallenge, 'status' | 'completedAt'>): DailyChallenge {
  return { ...base, status: 'pending', completedAt: null };
}

function uniqueById(list: DailyChallenge[]): DailyChallenge[] {
  const seen = new Set<string>();
  const out: DailyChallenge[] = [];
  for (const c of list) {
    if (!c?.id) continue;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

function sanitizeTrait(v: unknown): TraitKey | null {
  return v === 'focus' || v === 'calm' || v === 'confidence' || v === 'discipline' || v === 'creativity' || v === 'empathy'
    ? v
    : null;
}

function sanitizeDailyChallenge(raw: any): DailyChallenge | null {
  const id = String(raw?.id ?? '').trim();
  if (!id) return null;

  const titleUa = String(raw?.titleUa ?? '');
  const titleEn = String(raw?.titleEn ?? '');
  const descriptionUa = String(raw?.descriptionUa ?? '');
  const descriptionEn = String(raw?.descriptionEn ?? '');

  if (!titleUa && !titleEn) return null;

  return {
    id,
    trait: sanitizeTrait(raw?.trait),
    titleUa,
    titleEn,
    descriptionUa,
    descriptionEn,
    complexity: sanitizeComplexity(raw?.complexity),
    status: sanitizeStatus(raw?.status),
    completedAt: raw?.completedAt ? String(raw.completedAt) : null,
  };
}

function parseStoredList(parsed: unknown): DailyChallenge[] {
  if (!Array.isArray(parsed)) return [];
  return (parsed as any[]).map(sanitizeDailyChallenge).filter((x): x is DailyChallenge => x !== null);
}

// ---------- history ----------
async function readHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_CHALLENGES_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as any[])
      .map((x) => ({
        date: typeof x?.date === 'string' ? x.date.slice(0, 10) : '',
        ids: Array.isArray(x?.ids) ? x.ids.filter((id: any) => typeof id === 'string') : [],
      }))
      .filter((x) => x.date && x.ids.length > 0);
  } catch {
    return [];
  }
}

async function writeHistory(items: HistoryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_CHALLENGES_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

function computeExcludedIds(history: HistoryItem[], daysBack: number): Set<string> {
  const out = new Set<string>();
  const base = new Date();
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const iso = localDateIso(d); // локальная дата
    const item = history.find((h) => h.date === iso);
    if (item?.ids?.length) item.ids.forEach((id) => out.add(id));
  }
  return out;
}

// ---------- API ----------
export async function getOrGenerateDailyChallenges(params: { mainGrowth: TraitKey | null }): Promise<DailyChallenge[]> {
  const today = todayIso();

  try {
    const [storedDate, storedListRaw] = await Promise.all([
      AsyncStorage.getItem(DAILY_CHALLENGES_DATE_KEY),
      AsyncStorage.getItem(DAILY_CHALLENGES_KEY),
    ]);

    if (storedDate === today && storedListRaw) {
      const parsed = JSON.parse(storedListRaw) as unknown;
      const cleaned = parseStoredList(parsed);
      if (cleaned.length === DAILY_CHALLENGES_COUNT) return cleaned;
    }
  } catch {
    // fallthrough
  }

  // ВАЖНО: если нет валидного стора — генерим стабильно на день (а не рандомом)
  return regenerateDailyChallenges({ ...params, seed: stableSeedForToday(params) });
}

export async function regenerateDailyChallenges(params: { mainGrowth: TraitKey | null; seed?: number }): Promise<DailyChallenge[]> {
  const today = todayIso();
  const rng = mulberry32((params.seed ?? Date.now()) >>> 0);

  const history = await readHistory();
  const excluded = computeExcludedIds(history, 2);

  const baseStateful = BASE_CHALLENGES.map(toStateful);

  let first: DailyChallenge | null = null;
  if (params.mainGrowth) {
    const pool = baseStateful.filter((c) => c.trait === params.mainGrowth && !excluded.has(c.id));
    first =
      pickRandomWithRng(pool, rng) ??
      pickRandomWithRng(baseStateful.filter((c) => c.trait === params.mainGrowth), rng) ??
      null;
  }

  const chosen: DailyChallenge[] = [];
  if (first) chosen.push(first);

  const usedIds = new Set(chosen.map((c) => c.id));
  const usedTraits = new Set<TraitKey | null>(chosen.map((c) => c.trait));

  const pickNext = (): DailyChallenge | null => {
    const strict = baseStateful.filter((c) => !excluded.has(c.id) && !usedIds.has(c.id) && !usedTraits.has(c.trait));
    const relaxed1 = baseStateful.filter((c) => !usedIds.has(c.id) && !usedTraits.has(c.trait));
    const relaxed2 = baseStateful.filter((c) => !usedIds.has(c.id));

    return pickRandomWithRng(strict, rng) ?? pickRandomWithRng(relaxed1, rng) ?? pickRandomWithRng(relaxed2, rng);
  };

  while (chosen.length < DAILY_CHALLENGES_COUNT) {
    const next = pickNext();
    if (!next) break;
    chosen.push(next);
    usedIds.add(next.id);
    usedTraits.add(next.trait);
  }

  const final = uniqueById(chosen).slice(0, DAILY_CHALLENGES_COUNT);

  while (final.length < DAILY_CHALLENGES_COUNT) {
    const fallbackPool = baseStateful.filter((c) => !final.some((x) => x.id === c.id));
    const fallback = pickRandomWithRng(fallbackPool, rng);
    if (!fallback) break;
    final.push(fallback);
  }

  await AsyncStorage.setItem(DAILY_CHALLENGES_KEY, JSON.stringify(final));
  await AsyncStorage.setItem(DAILY_CHALLENGES_DATE_KEY, today);

  const updatedHistory: HistoryItem[] = [
    { date: today, ids: final.map((c) => c.id) },
    ...history.filter((h) => h.date !== today),
  ].slice(0, 14);

  await writeHistory(updatedHistory);

  return final;
}

export async function setDailyChallengeStatus(params: { id: string; status: ChallengeStatus }): Promise<DailyChallenge[] | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_CHALLENGES_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const list = parseStoredList(parsed);
    if (!list.length) return null;

    const updated = list.map((c) => {
      if (c.id !== params.id) return c;
      const completedAt = params.status === 'completed' ? new Date().toISOString() : null;
      return { ...c, status: params.status, completedAt };
    });

    await AsyncStorage.setItem(DAILY_CHALLENGES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

export async function getDailyChallengesSummary(): Promise<{ challenges: DailyChallenge[]; done: number; total: number }> {
  try {
    const list = await getOrGenerateDailyChallenges({ mainGrowth: null });
    const done = list.filter((c) => c.status === 'completed').length;
    return { challenges: list, done, total: DAILY_CHALLENGES_COUNT };
  } catch {
    return { challenges: [], done: 0, total: DAILY_CHALLENGES_COUNT };
  }
}

export function getChallengeTitle(ch: DailyChallenge, lang: AppLanguage): string {
  return lang === 'ua' ? ch.titleUa : ch.titleEn;
}

export function getChallengeDescription(ch: DailyChallenge, lang: AppLanguage): string {
  return lang === 'ua' ? ch.descriptionUa : ch.descriptionEn;
}
