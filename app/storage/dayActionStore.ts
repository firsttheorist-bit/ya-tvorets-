// app/storage/dayActionStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayLocalIso } from '../utils/date';
import { loadXpState, rewardForAction, type XpState } from './xpStore';

function todayIso(): string {
  return todayLocalIso();
}

type DayActionsPayload = {
  date: string; // YYYY-MM-DD
  hasAnyAction: boolean;
  hardDayMarked: boolean;
  todayXpEarned: number; // >=0
  appliedXpEventIds: string[]; // event ids applied today (idempotency)
  lastActionAt: string | null; // ISO datetime
};

export type DayActions = {
  date: string;
  hasAnyAction: boolean;
  hardDayMarked: boolean;
  todayXpEarned: number;
  appliedXpEventIds: string[];
  lastActionAt: string | null;
};

const DAY_ACTIONS_KEY = '@ya_tvorets_day_actions_v1';

function sanitizePayload(raw: unknown): DayActionsPayload | null {
  const obj = raw as any;
  const date = String(obj?.date ?? '').slice(0, 10);
  if (!date) return null;

  const hasAnyAction = !!obj?.hasAnyAction;
  const hardDayMarked = !!obj?.hardDayMarked;

  const earnedRaw = Number(obj?.todayXpEarned);
  const todayXpEarned = Number.isFinite(earnedRaw) && earnedRaw >= 0 ? Math.floor(earnedRaw) : 0;

  const idsRaw = obj?.appliedXpEventIds;
  const appliedXpEventIds: string[] = Array.isArray(idsRaw)
    ? idsRaw
        .map((x: any) => String(x ?? '').trim())
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i) // dedupe
    : [];

  const lastActionAt = obj?.lastActionAt == null ? null : String(obj.lastActionAt);

  return { date, hasAnyAction, hardDayMarked, todayXpEarned, appliedXpEventIds, lastActionAt };
}

function makeEmptyPayload(date: string): DayActionsPayload {
  return {
    date,
    hasAnyAction: false,
    hardDayMarked: false,
    todayXpEarned: 0,
    appliedXpEventIds: [],
    lastActionAt: null,
  };
}

async function readPayloadForToday(): Promise<DayActionsPayload> {
  const today = todayIso();

  try {
    const raw = await AsyncStorage.getItem(DAY_ACTIONS_KEY);
    if (!raw) return makeEmptyPayload(today);

    const parsed = JSON.parse(raw) as unknown;
    const payload = sanitizePayload(parsed);

    if (!payload || payload.date !== today) return makeEmptyPayload(today);
    return payload;
  } catch {
    return makeEmptyPayload(today);
  }
}

async function writePayload(payload: DayActionsPayload): Promise<void> {
  await AsyncStorage.setItem(DAY_ACTIONS_KEY, JSON.stringify(payload));
}

export async function getDayActions(): Promise<DayActions> {
  const p = await readPayloadForToday();
  return {
    date: p.date,
    hasAnyAction: p.hasAnyAction,
    hardDayMarked: p.hardDayMarked,
    todayXpEarned: p.todayXpEarned,
    appliedXpEventIds: p.appliedXpEventIds,
    lastActionAt: p.lastActionAt,
  };
}

export async function registerActionEvent(params: {
  eventId: string; // уникальный ID события на день
  xpDelta?: number; // 0|undefined => только действие, без XP
}): Promise<{ didApply: boolean; xp: XpState; actions: DayActions }> {
  const eventId = String(params.eventId ?? '').trim();
  const xpDeltaRaw = Number(params.xpDelta);
  const xpDelta = Number.isFinite(xpDeltaRaw) && xpDeltaRaw > 0 ? Math.floor(xpDeltaRaw) : 0;

  const payload = await readPayloadForToday();

  const isHardDayEvent = eventId.toLowerCase().startsWith('hard_day');
  const shouldCountAsAction = eventId.length > 0; // FIX: пустой eventId не должен "разблокировать" вечер

  const nowIso = new Date().toISOString();
  const baseNext: DayActionsPayload = {
    ...payload,
    hasAnyAction: payload.hasAnyAction || shouldCountAsAction,
    hardDayMarked: payload.hardDayMarked || isHardDayEvent,
    lastActionAt: shouldCountAsAction ? nowIso : payload.lastActionAt,
  };

  // если id пустой или XP не начисляем — просто сохраняем факт действия/времени (если был валидный eventId)
  if (!eventId || xpDelta <= 0) {
    await writePayload(baseNext);
    const xp = await loadXpState();
    return { didApply: false, xp, actions: await getDayActions() };
  }

  // идемпотентность XP по eventId
  if (payload.appliedXpEventIds.includes(eventId)) {
    await writePayload(baseNext);
    const xp = await loadXpState();
    return { didApply: false, xp, actions: await getDayActions() };
  }

  const xp = await rewardForAction({ xpDelta });

  const next: DayActionsPayload = {
    ...baseNext,
    todayXpEarned: baseNext.todayXpEarned + xpDelta,
    appliedXpEventIds: [...baseNext.appliedXpEventIds, eventId],
  };

  await writePayload(next);

  return { didApply: true, xp, actions: await getDayActions() };
}

export async function reconcileTodayXp(): Promise<{ xp: XpState; actions: DayActions }> {
  const [xp, actions] = await Promise.all([loadXpState(), getDayActions()]);
  return { xp, actions };
}

export async function unsafeSetTodayXpEarned(value: number): Promise<DayActions> {
  const n = Number(value);
  const earned = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;

  const payload = await readPayloadForToday();
  const next: DayActionsPayload = { ...payload, todayXpEarned: earned };
  await writePayload(next);
  return getDayActions();
}

export async function unsafeResetDayActions(): Promise<void> {
  await AsyncStorage.removeItem(DAY_ACTIONS_KEY);
}
