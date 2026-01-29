// app/storage/dayPlanStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TraitKey } from '../mentorPhrases';

import {
  DAILY_CHALLENGES_COUNT,
  getChallengeDescription,
  getChallengeTitle,
  getOrGenerateDailyChallenges,
  regenerateDailyChallenges,
  setDailyChallengeStatus,
  type ChallengeComplexity,
  type ChallengeStatus,
  type DailyChallenge,
} from './dailyChallengesStore';

import { todayLocalIso } from '../utils/date';
import { registerActionEvent } from './dayActionStore';
import type { XpState } from './xpStore';

// ---------------- Types ----------------
export type TodayTaskType = 'habit' | 'exercise' | 'reflection' | 'focus' | 'body';

export type TodayTask = {
  id: string;
  type: TodayTaskType;
  completed: boolean;
  isGrowthFocused: boolean;
  variant: number;
};

export type DayPlan = {
  date: string; // YYYY-MM-DD
  mainGrowth: TraitKey | null;
  tasks: TodayTask[];
  challenges: DailyChallenge[];
};

// ---------------- Storage keys ----------------
const DAY_PLAN_KEY = '@ya_tvorets_day_plan_v2';
const DAY_PLAN_DATE_KEY = '@ya_tvorets_day_plan_date_v2';

// ---------------- Config ----------------
const TASK_VARIANTS_COUNT: Record<TodayTaskType, number> = {
  habit: 3,
  exercise: 3,
  reflection: 3,
  focus: 3,
  body: 3,
};

const BASE_TASKS: Array<Pick<TodayTask, 'id' | 'type'>> = [
  { id: 't_1', type: 'habit' },
  { id: 't_2', type: 'exercise' },
  { id: 't_3', type: 'reflection' },
  { id: 't_4', type: 'focus' },
  { id: 't_5', type: 'body' },
];

// ---------------- Helpers ----------------
function todayIso(): string {
  return todayLocalIso();
}

function randInt(maxExclusive: number): number {
  const m = Math.max(1, Math.floor(maxExclusive));
  return Math.floor(Math.random() * m);
}

function sanitizeTraitKey(v: unknown): TraitKey | null {
  return v === 'focus' || v === 'calm' || v === 'confidence' || v === 'discipline' || v === 'creativity' || v === 'empathy'
    ? v
    : null;
}

function sanitizeTaskType(v: unknown): TodayTaskType {
  return v === 'habit' || v === 'exercise' || v === 'reflection' || v === 'focus' || v === 'body' ? v : 'habit';
}

function traitToTaskType(trait: TraitKey): TodayTaskType {
  switch (trait) {
    case 'focus':
      return 'focus';
    case 'calm':
      return 'reflection';
    case 'confidence':
      return 'exercise';
    case 'discipline':
      return 'habit';
    case 'creativity':
      return 'exercise';
    case 'empathy':
      return 'reflection';
    default:
      return 'habit';
  }
}

function sanitizeTodayTask(v: any): TodayTask | null {
  const id = String(v?.id ?? '').trim();
  if (!id) return null;

  const type = sanitizeTaskType(v?.type);
  const completed = !!v?.completed;
  const isGrowthFocused = !!v?.isGrowthFocused;

  const maxVariants = TASK_VARIANTS_COUNT[type] ?? 1;
  const variantRaw = typeof v?.variant === 'number' ? v.variant : 0;
  const variant = Number.isFinite(variantRaw) ? Math.max(0, Math.min(variantRaw, maxVariants - 1)) : 0;

  return { id, type, completed, isGrowthFocused, variant };
}

function isChallengeStatus(v: unknown): v is ChallengeStatus {
  return v === 'pending' || v === 'completed' || v === 'skipped';
}

function isComplexity(v: unknown): v is ChallengeComplexity {
  return v === 'easy' || v === 'medium' || v === 'hard';
}

function sanitizeDailyChallenge(v: any): DailyChallenge | null {
  const id = String(v?.id ?? '').trim();
  if (!id) return null;

  const titleUa = String(v?.titleUa ?? '');
  const titleEn = String(v?.titleEn ?? '');
  const descriptionUa = String(v?.descriptionUa ?? '');
  const descriptionEn = String(v?.descriptionEn ?? '');

  if (!titleUa && !titleEn) return null;

  const trait = sanitizeTraitKey(v?.trait);
  const complexity: ChallengeComplexity = isComplexity(v?.complexity) ? v.complexity : 'easy';
  const status: ChallengeStatus = isChallengeStatus(v?.status) ? v.status : 'pending';
  const completedAt = v?.completedAt == null ? null : String(v.completedAt);

  return { id, trait, titleUa, titleEn, descriptionUa, descriptionEn, complexity, status, completedAt };
}

function sanitizeDayPlan(raw: unknown): DayPlan | null {
  const obj = raw as any;
  const date = String(obj?.date ?? '').slice(0, 10);
  if (!date) return null;

  const mainGrowth = sanitizeTraitKey(obj?.mainGrowth);

  const tasksRaw = obj?.tasks;
  const challengesRaw = obj?.challenges;
  if (!Array.isArray(tasksRaw) || !Array.isArray(challengesRaw)) return null;

  const tasks: TodayTask[] = (tasksRaw as any[]).map(sanitizeTodayTask).filter((x): x is TodayTask => x != null);
  const challenges: DailyChallenge[] = (challengesRaw as any[])
    .map(sanitizeDailyChallenge)
    .filter((x): x is DailyChallenge => x != null);

  return { date, mainGrowth, tasks, challenges };
}

function buildTodayTasks(mainGrowth: TraitKey | null): TodayTask[] {
  const growthType: TodayTaskType | null = mainGrowth ? traitToTaskType(mainGrowth) : null;

  return BASE_TASKS.map((t) => {
    const maxVariants = TASK_VARIANTS_COUNT[t.type] ?? 1;
    return {
      id: t.id,
      type: t.type,
      completed: false,
      isGrowthFocused: growthType ? t.type === growthType : false,
      variant: randInt(maxVariants),
    };
  });
}

async function writeDayPlan(plan: DayPlan): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(DAY_PLAN_KEY, JSON.stringify(plan)),
    AsyncStorage.setItem(DAY_PLAN_DATE_KEY, plan.date),
  ]);
}

// ---------------- Public API ----------------
export async function getOrCreateDayPlan(params: { mainGrowth: TraitKey | null }): Promise<DayPlan> {
  const today = todayIso();

  try {
    const [storedDate, storedRaw] = await Promise.all([
      AsyncStorage.getItem(DAY_PLAN_DATE_KEY),
      AsyncStorage.getItem(DAY_PLAN_KEY),
    ]);

    if (storedDate === today && storedRaw) {
      const parsed = JSON.parse(storedRaw) as unknown;
      const plan = sanitizeDayPlan(parsed);

      if (plan && plan.date === today) {
        if (plan.mainGrowth !== params.mainGrowth) {
          const fixed: DayPlan = { ...plan, mainGrowth: params.mainGrowth };
          await writeDayPlan(fixed);
          return fixed;
        }

        if (!plan.challenges?.length || plan.challenges.length !== DAILY_CHALLENGES_COUNT) {
          const challenges = await getOrGenerateDailyChallenges({ mainGrowth: params.mainGrowth });
          const fixed: DayPlan = { ...plan, mainGrowth: params.mainGrowth, challenges };
          await writeDayPlan(fixed);
          return fixed;
        }

        if (!plan.tasks?.length) {
          const tasks = buildTodayTasks(params.mainGrowth);
          const fixed: DayPlan = { ...plan, mainGrowth: params.mainGrowth, tasks };
          await writeDayPlan(fixed);
          return fixed;
        }

        return plan;
      }
    }
  } catch {
    // rebuild below
  }

  const challenges = await getOrGenerateDailyChallenges({ mainGrowth: params.mainGrowth });
  const tasks = buildTodayTasks(params.mainGrowth);

  const plan: DayPlan = { date: today, mainGrowth: params.mainGrowth, tasks, challenges };
  await writeDayPlan(plan);
  return plan;
}

export async function setTaskCompleted(params: {
  taskId: string;
  completed: boolean;
  mainGrowth?: TraitKey | null;
}): Promise<TodayTask[]> {
  const plan = await getOrCreateDayPlan({ mainGrowth: params.mainGrowth ?? null });

  const updatedTasks = plan.tasks.map((t) => (t.id === params.taskId ? { ...t, completed: params.completed } : t));
  const updatedPlan: DayPlan = { ...plan, tasks: updatedTasks };
  await writeDayPlan(updatedPlan);

  return updatedTasks;
}

export async function completeTodayTask(params: {
  taskId: string;
  mainGrowth?: TraitKey | null;
  xpDelta?: number; // default 10
}): Promise<{ tasks: TodayTask[]; xp: XpState; didApply: boolean }> {
  const xpDelta = typeof params.xpDelta === 'number' ? Math.max(0, Math.floor(params.xpDelta)) : 10;
  const date = todayIso();

  const tasks = await setTaskCompleted({
    taskId: params.taskId,
    completed: true,
    mainGrowth: params.mainGrowth ?? null,
  });

  const eventId = `task:${date}:${params.taskId}`;
  const reg = await registerActionEvent({ eventId, xpDelta });

  return { tasks, xp: reg.xp, didApply: reg.didApply };
}

export async function regenerateTodayChallenges(params: { mainGrowth: TraitKey | null }): Promise<DayPlan> {
  const plan = await getOrCreateDayPlan({ mainGrowth: params.mainGrowth });
  const challenges = await regenerateDailyChallenges({ mainGrowth: params.mainGrowth });

  const updated: DayPlan = { ...plan, mainGrowth: params.mainGrowth, challenges };
  await writeDayPlan(updated);

  return updated;
}

export async function setTodayChallengeStatus(params: {
  id: string;
  status: ChallengeStatus;
  mainGrowth?: TraitKey | null;
}): Promise<DayPlan | null> {
  const plan = await getOrCreateDayPlan({ mainGrowth: params.mainGrowth ?? null });

  const updatedList = await setDailyChallengeStatus({ id: params.id, status: params.status });
  if (!updatedList) return null;

  const updated: DayPlan = { ...plan, challenges: updatedList };
  await writeDayPlan(updated);

  if (params.status === 'skipped') {
    const date = todayIso();
    await registerActionEvent({ eventId: `challenge_skip:${date}:${params.id}`, xpDelta: 0 });
  }

  return updated;
}

export async function completeChallenge(params: {
  id: string;
  mainGrowth?: TraitKey | null;
  xpDelta?: number; // default 20
}): Promise<{ dayPlan: DayPlan; xp: XpState; didApply: boolean } | null> {
  const xpDelta = typeof params.xpDelta === 'number' ? Math.max(0, Math.floor(params.xpDelta)) : 20;

  const updatedPlan = await setTodayChallengeStatus({
    id: params.id,
    status: 'completed',
    mainGrowth: params.mainGrowth ?? null,
  });

  if (!updatedPlan) return null;

  const date = todayIso();
  const reg = await registerActionEvent({ eventId: `challenge:${date}:${params.id}`, xpDelta });

  return { dayPlan: updatedPlan, xp: reg.xp, didApply: reg.didApply };
}

export { DAILY_CHALLENGES_COUNT, getChallengeDescription, getChallengeTitle };
export type { ChallengeStatus, DailyChallenge };

