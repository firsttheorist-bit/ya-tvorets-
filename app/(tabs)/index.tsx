// app/(tabs)/index.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { todayLocalIso } from '../utils/date';

import { useAppLanguage } from '../LanguageContext';
import {
  computeMentorMode,
  getEveningQuietCloseLine,
  getEveningReflectionMentorLine,
  getEveningReflectionQuestion,
  getJournalMoodLine,
  getMorningEntryHint,
  getMorningEntryLine,
  type AppGender,
  type AppLanguage,
  type MentorId,
  type TraitKey,
} from '../mentorPhrases';

import {
  completeChallenge,
  completeTodayTask,
  DAILY_CHALLENGES_COUNT,
  getChallengeDescription,
  getChallengeTitle,
  setTodayChallengeStatus,
  type DailyChallenge,
  type DayPlan,
  type TodayTask,
} from '../storage/dayPlanStore';

import { getOrCreateDaySnapshot, type DaySnapshot } from '../storage/daySnapshotStore';

import {
  ensureTodayGoal,
  getTodayGoal,
  isEveningDoneToday,
  isMorningDoneToday,
  markEveningDoneToday,
  markMorningDoneToday,
  setTodayGoal,
} from '../storage/dayRitualStore';

import { reconcileTodayXp, registerActionEvent, type DayActions } from '../storage/dayActionStore';
import { appendChallengeJournalEntry, prependJournalEntry } from '../storage/journalStore';
import { registerDailySuccess } from '../storage/xpStore';
import { mentorThemes, useMentorTheme } from '../design/mentorThemes';
import { getCurrentMentor } from '../storage/mentorStore';

// ---------- Types ----------
type JournalMood = 'low' | 'neutral' | 'high';

// ---------- Const ----------
const XP_PER_TASK = 10;
const XP_PER_CHALLENGE = 20;

const TRAIT_LABELS: Record<TraitKey, { ua: string; en: string }> = {
  focus: { ua: 'Фокус', en: 'Focus' },
  calm: { ua: 'Спокій', en: 'Calm' },
  confidence: { ua: 'Впевненість', en: 'Confidence' },
  discipline: { ua: 'Дисципліна', en: 'Discipline' },
  creativity: { ua: 'Креативність', en: 'Creativity' },
  empathy: { ua: 'Емпатія', en: 'Empathy' },
};

const TASK_TEXTS: Record<
  TodayTask['type'],
  {
    ua: { title: string; description: string }[];
    en: { title: string; description: string }[];
  }
> = {
  habit: {
    ua: [
      { title: 'Мікрозвичка', description: '1 хвилина спокійного дихання перед важливою справою.' },
      { title: 'Звичка 1%', description: 'Зроби на один крок більше, ніж учора, у маленькій звичці.' },
      { title: 'Маленький ритуал', description: 'Вода/розтяжка/вдих перед стартом — 60 секунд.' },
    ],
    en: [
      { title: 'Microhabit', description: '1 minute of calm breathing before an important task.' },
      { title: '1% habit', description: 'Do one tiny step more than yesterday in a small habit.' },
      { title: 'Small ritual', description: 'Water/stretch/breath before you start — 60 seconds.' },
    ],
  },
  exercise: {
    ua: [
      { title: 'Коротка вправа', description: '3 хвилини без екранів: подихай або пройдися.' },
      { title: 'Перезавантаження', description: '10 присідань / легка розтяжка / сходи — коротко.' },
      { title: 'Рух для розуму', description: '5 хвилин прогулянки без телефону, помічай відчуття.' },
    ],
    en: [
      { title: 'Short exercise', description: '3 minutes without screens: breathe or walk.' },
      { title: 'Reset', description: '10 squats / light stretch / stairs — short and simple.' },
      { title: 'Movement for mind', description: '5 minutes walking without phone, notice sensations.' },
    ],
  },
  reflection: {
    ua: [
      { title: 'Рефлексія дня', description: 'Що допомогло тобі трохи заспокоїтися сьогодні?' },
      { title: '3 рядки чесності', description: 'Що було ок / що забрало сили / що зробиш інакше завтра?' },
      { title: 'Мʼяке питання', description: '"Що я можу зробити сьогодні, щоб підтримати себе?"' },
    ],
    en: [
      { title: 'Day reflection', description: 'What helped you calm down a little today?' },
      { title: '3 lines of honesty', description: 'Ok / drained / do differently tomorrow — 3 lines.' },
      { title: 'Gentle question', description: '"What can I do today to support myself?"' },
    ],
  },
  focus: {
    ua: [
      { title: 'Фокус-сесія 10 хв', description: '10 хвилин на одну справу без перемикань і сповіщень.' },
      { title: 'Блок фокусу 15 хв', description: 'Постав таймер і роби лише одну задачу.' },
      { title: 'Анти-мультизадачність', description: 'Закрий зайве й дороби одну маленьку дію до кінця.' },
    ],
    en: [
      { title: 'Focus 10 min', description: '10 minutes on one thing without switching/notifications.' },
      { title: 'Focus block 15 min', description: 'Set a timer and do only one task.' },
      { title: 'No multitasking', description: 'Close the noise and finish one small thing.' },
    ],
  },
  body: {
    ua: [
      { title: 'Енергія тіла', description: 'Вода / розтяжка / 10 присідань / коротка прогулянка.' },
      { title: 'Турбота про тіло', description: 'Склянка води + 1 хвилина розтяжки шиї/плечей.' },
      { title: 'Маленький рух', description: '3–5 хвилин просто походи, зміни темп дихання.' },
    ],
    en: [
      { title: 'Body energy', description: 'Water / stretch / 10 squats / short walk.' },
      { title: 'Body care', description: 'Glass of water + 1 minute stretching neck/shoulders.' },
      { title: 'Small movement', description: '3–5 minutes walk, change breathing pace.' },
    ],
  },
};

function getTraitLabel(trait: TraitKey, lang: AppLanguage): string {
  return TRAIT_LABELS[trait][lang];
}

function getTaskText(task: TodayTask, lang: AppLanguage) {
  const pack = TASK_TEXTS[task.type];
  const key = lang === 'ua' ? 'ua' : 'en';
  const list = pack?.[key] ?? [];
  if (!list.length) return { title: task.type, description: '' };
  const idx = Math.max(0, Math.min(task.variant ?? 0, list.length - 1));
  return list[idx];
}

function todayIso(): string {
  return todayLocalIso();
}

// ---- Time windows (UX) ----
function getLocalHour(): number {
  return new Date().getHours();
}
function isMorningWindow(): boolean {
  const h = getLocalHour();
  return h >= 4 && h <= 13;
}
function isEveningWindow(): boolean {
  const h = getLocalHour();
  return h >= 18 || h <= 3;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildDefaultGoal(params: { lang: AppLanguage; growth: TraitKey | null }): string {
  const { lang, growth } = params;

  if (lang === 'ua') {
    if (growth === 'focus') return rand(['Одна справа до кінця, без перемикань.', '10 хв фокусу на одній дії.']);
    if (growth === 'calm') return rand(['Тримати повільний темп у дрібницях.', 'Зробити паузу перед реакцією.']);
    if (growth === 'confidence') return rand(['Один крок, який трохи лякає — але реальний.', 'Сказати одне "так" собі.']);
    if (growth === 'discipline') return rand(['Одна дія за планом — без торгу.', 'Зробити мінімум і зарахувати.']);
    if (growth === 'creativity') return rand(['10 хв створення без оцінки.', 'Один маленький експеримент.']);
    if (growth === 'empathy') return rand(['Один теплий жест до себе.', 'Помітити почуття без критики.']);

    return rand(['Один маленький чесний крок — і день вже не нуль.', 'Одна дія до кінця. Без шуму.']);
  }

  if (growth === 'focus') return rand(['One thing to completion. No switching.', '10 minutes of focus on one action.']);
  if (growth === 'calm') return rand(['Keep a slower pace in small things.', 'Pause before reacting.']);
  if (growth === 'confidence') return rand(['One slightly scary but real step.', 'Say one "yes" to yourself.']);
  if (growth === 'discipline') return rand(['One planned action — no bargaining.', 'Do the minimum and count it.']);
  if (growth === 'creativity') return rand(['10 minutes of creating without judging.', 'One small experiment.']);
  if (growth === 'empathy') return rand(['One caring gesture to yourself.', 'Notice feelings without criticism.']);

  return rand(['One small honest step — and the day is not zero.', 'One action to completion. No noise.']);
}

function buildAutoEveningText(params: { lang: AppLanguage; goal: string; hasAnyAction: boolean }): string {
  const goal = (params.goal ?? '').trim();

  if (params.lang === 'ua') {
    const head = goal.length ? `Ціль дня: "${goal}".` : 'Ціль дня: —';
    const body = params.hasAnyAction
      ? 'Я зробив(ла) хоча б один крок. Це рахується.'
      : 'Сьогодні було важко. Але я зафіксував(ла) день.';
    const tail = goal.length
      ? 'Не ідеально — нормально. Напрям важливіший за оцінку.'
      : 'Без оцінки. Просто закриваю день.';
    return `${head}\n${body}\n${tail}`;
  }

  const head = goal.length ? `Intention: "${goal}".` : 'Intention: —';
  const body = params.hasAnyAction ? 'I made at least one step. That counts.' : 'Today was heavy. But I closed the day.';
  const tail = goal.length ? 'Not perfect is fine. Direction matters more than judging.' : 'No judging. Just closing.';
  return `${head}\n${body}\n${tail}`;
}

export default function TodayScreen() {
  const router = useRouter();
  const { language, loading: langLoading } = useAppLanguage();
  const lang = language as AppLanguage;

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null);

  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [tasks, setTasks] = useState<TodayTask[]>([]);

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [lastSuccessDate, setLastSuccessDate] = useState<string | null>(null);

  const [actions, setActions] = useState<DayActions | null>(null);
  const [todayXpEarned, setTodayXpEarnedState] = useState<number>(0);

  const [badDayEditorOpen, setBadDayEditorOpen] = useState(false);
  const [badDayText, setBadDayText] = useState('');
  const [savingBadDay, setSavingBadDay] = useState(false);

  const [morningDone, setMorningDone] = useState<boolean>(true);

  const [eveningDone, setEveningDone] = useState<boolean>(true);
  const [eveningText, setEveningText] = useState('');
  const [savingEvening, setSavingEvening] = useState(false);

  const [dayGoal, setDayGoalState] = useState<string>('');

  // NEW: busy state for inline challenge actions
  const [busyChallengeId, setBusyChallengeId] = useState<string | null>(null);

  // Ментор из настроек (а не из снапшота)
  const [currentMentor, setCurrentMentor] = useState<MentorId>('lev');
  
  // Получаем тему текущего ментора
  const { colors: mentorColors } = useMentorTheme(currentMentor);

  // Загружаем сохраненного ментора
  useEffect(() => {
    const loadMentor = async () => {
      const mentor = await getCurrentMentor();
      setCurrentMentor(mentor);
    };
    void loadMentor();
  }, []);

  const gender = (snapshot?.gender ?? 'neutral') as AppGender;
  const mainGrowth: TraitKey | null = useMemo(() => snapshot?.mainGrowth ?? null, [snapshot]);

  const displayName = useMemo(() => {
    const t = (snapshot?.name ?? '').trim();
    return t.length ? t : lang === 'ua' ? 'Творець' : 'Creator';
  }, [snapshot, lang]);

  const mentorMode = useMemo(() => computeMentorMode({ streak, lastSuccessDate }), [streak, lastSuccessDate]);
  const mentorLine = useMemo(() => snapshot?.mentorLine ?? '', [snapshot]);

  const morningLine = useMemo(() => {
    const fromSnap = (snapshot as any)?.morningLine as string | undefined;
    if (fromSnap && fromSnap.trim().length) return fromSnap;

    return getMorningEntryLine({
      mentor: currentMentor, // Используем currentMentor вместо mentor из снапшота
      lang,
      growth: mainGrowth,
      mode: mentorMode,
      gender,
      name: displayName,
    });
  }, [snapshot, currentMentor, lang, mainGrowth, mentorMode, gender, displayName]);

  const morningHint = useMemo(() => getMorningEntryHint({ lang }), [lang]);

  const dailyChallenges = useMemo(() => dayPlan?.challenges ?? [], [dayPlan]);
  const dailyDone = useMemo(() => dailyChallenges.filter((c) => c.status === 'completed').length, [dailyChallenges]);

  const tasksDoneCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const challengesTouchedCount = useMemo(
    () => dailyChallenges.filter((c) => c.status === 'completed' || c.status === 'skipped').length,
    [dailyChallenges]
  );

  const hasAnyActionToday = actions?.hasAnyAction ?? false;
  const hardDayMarked = actions?.hardDayMarked ?? false;

  const allTasksDone = useMemo(() => tasks.length > 0 && tasksDoneCount === tasks.length, [tasks.length, tasksDoneCount]);

  const goalPulseLine = useMemo(() => {
    const g = (dayGoal ?? '').trim();
    if (!g.length) return '';
    if (hasAnyActionToday) {
      return lang === 'ua'
        ? 'Є крок. Ціль — про напрям, не про ідеально.'
        : 'A step is done. Intention is about direction, not perfection.';
    }
    return lang === 'ua' ? 'Якщо важко — зроби мінімум.' : 'If it is hard — do the minimum.';
  }, [dayGoal, hasAnyActionToday, lang]);

  const eveningQuestion = useMemo(() => {
    const g = (dayGoal ?? '').trim();
    if (g.length) {
      return lang === 'ua' ? `Як вийшло з ціллю: "${g}"?` : `How did it go with: "${g}"?`;
    }
    return getEveningReflectionQuestion({ mentor: currentMentor, lang, growth: mainGrowth });
  }, [dayGoal, currentMentor, lang, mainGrowth]);

  const eveningPlaceholder = useMemo(() => {
    return lang === 'ua' ? 'Можеш лишити пустим — я заповню автоматично.' : 'You can leave it empty — I will auto-fill.';
  }, [lang]);

  const daySummaryLine = useMemo(() => {
    const xpToday = todayXpEarned > 0 ? `+${todayXpEarned} XP` : '+0 XP';
    if (lang === 'ua') {
      return `Підсумок: ${xpToday}. Задачі ${tasksDoneCount}/${tasks.length}, челенджі ${challengesTouchedCount}/${DAILY_CHALLENGES_COUNT}. Рівень ${level}, серія ${streak}.`;
    }
    return `Summary: ${xpToday}. Tasks ${tasksDoneCount}/${tasks.length}, challenges ${challengesTouchedCount}/${DAILY_CHALLENGES_COUNT}. Level ${level}, streak ${streak}.`;
  }, [lang, todayXpEarned, tasksDoneCount, tasks.length, challengesTouchedCount, level, streak]);

  const refreshSnapshot = useCallback(async () => {
    try {
      const [snap, mDone, eDone, goalExisting, recon] = await Promise.all([
        getOrCreateDaySnapshot({ lang }),
        isMorningDoneToday(),
        isEveningDoneToday(),
        getTodayGoal(),
        reconcileTodayXp(),
      ]);

      setSnapshot(snap);

      setDayPlan(snap.dayPlan);
      setTasks(snap.dayPlan.tasks);

      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setLastSuccessDate(recon.xp.lastSuccessDate);

      setMorningDone(mDone);
      setEveningDone(eDone);

      setActions(recon.actions);
      setTodayXpEarnedState(recon.actions.todayXpEarned);

      if (goalExisting && goalExisting.trim().length) {
        setDayGoalState(goalExisting);
      } else {
        const ensured = await ensureTodayGoal(() => buildDefaultGoal({ lang, growth: snap.mainGrowth ?? null }));
        setDayGoalState(ensured);
      }
    } catch (e) {
      console.log('refreshSnapshot error', e);
      setSnapshot(null);
      setDayPlan(null);
      setTasks([]);
      setMorningDone(true);
      setEveningDone(true);
      setDayGoalState('');
      setTodayXpEarnedState(0);
      setActions(null);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void refreshSnapshot();
    }, [refreshSnapshot])
  );

  const regenerateGoal = async () => {
    try {
      const next = buildDefaultGoal({ lang, growth: mainGrowth });
      await setTodayGoal(next);
      setDayGoalState(next);
    } catch (e) {
      console.log('regenerateGoal error', e);
    }
  };

  const handleMorningStart = async (ritualLabel?: string) => {
    try {
      await markMorningDoneToday();
      setMorningDone(true);

      const g = (dayGoal ?? '').trim();
      const goalLine = g.length > 0 ? (lang === 'ua' ? `Ціль дня: ${g}` : `Intention: ${g}`) : '';

      const ritualLine =
        ritualLabel && ritualLabel.trim().length ? ritualLabel : lang === 'ua' ? 'Старт зафіксовано.' : 'Start is marked.';

      Alert.alert(lang === 'ua' ? 'Старт дня' : 'Day started', goalLine ? `${ritualLine}\n\n${goalLine}` : ritualLine);
    } catch (e) {
      console.log('handleMorningStart error', e);
    }
  };

  const openMorningStartPicker = () => {
    Alert.alert(
      lang === 'ua' ? 'Мікро-ритуал входу' : 'Morning micro ritual',
      lang === 'ua' ? 'Обери один простий ритуал. Це лише старт.' : 'Pick one simple ritual. This is just the start.',
      [
        { text: lang === 'ua' ? 'Скасувати' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'ua' ? '60 сек дихання' : '60s breathing',
          onPress: () => void handleMorningStart(lang === 'ua' ? 'Дихання зроблено. Старт.' : 'Breathing done. Started.'),
        },
        {
          text: lang === 'ua' ? 'Склянка води' : 'Glass of water',
          onPress: () => void handleMorningStart(lang === 'ua' ? 'Вода випита. Старт.' : 'Water done. Started.'),
        },
        { text: lang === 'ua' ? 'Просто старт' : 'Just start', onPress: () => void handleMorningStart(undefined) },
      ]
    );
  };

  const confirmCompleteTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.completed) return;

    Alert.alert(
      lang === 'ua' ? 'Будь чесним(ою) із собою' : 'Be honest with yourself',
      lang === 'ua' ? 'Ти справді виконав(ла) цю дію?' : 'Did you really do this action?',
      [
        { text: lang === 'ua' ? 'Ще ні' : 'Not yet', style: 'cancel' },
        { text: lang === 'ua' ? 'Так' : 'Yes', onPress: () => void doCompleteTask(id) },
      ]
    );
  };

  const doCompleteTask = async (id: string) => {
    try {
      const res = await completeTodayTask({
        taskId: id,
        mainGrowth,
        xpDelta: XP_PER_TASK,
      });

      setTasks(res.tasks);
      setDayPlan((prev) => (prev ? { ...prev, tasks: res.tasks } : prev));

      // синхронизация прогресса после любых действий
      const recon = await reconcileTodayXp();
      setActions(recon.actions);
      setTodayXpEarnedState(recon.actions.todayXpEarned);

      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setLastSuccessDate(recon.xp.lastSuccessDate);

      if (res.didApply) {
        Alert.alert(lang === 'ua' ? 'Готово' : 'Done', `+${XP_PER_TASK} XP.`);
      }
    } catch (e) {
      console.log('doCompleteTask error', e);
    }
  };

  // ---------- NEW: inline challenge actions ----------
  const confirmCompleteChallenge = (ch: DailyChallenge) => {
    if (busyChallengeId) return;
    if (ch.status !== 'pending') return;

    Alert.alert(
      lang === 'ua' ? 'Виконати цей челендж?' : 'Mark this challenge as done?',
      lang === 'ua' ? 'Будь чесним(ою): ти справді зробив(ла) цю дію до кінця?' : 'Be honest: did you really complete this action?',
      [
        { text: lang === 'ua' ? 'Ще ні' : 'Not yet', style: 'cancel' },
        { text: lang === 'ua' ? 'Так' : 'Yes', onPress: () => void doCompleteChallenge(ch) },
      ]
    );
  };

  const doCompleteChallenge = async (ch: DailyChallenge) => {
    if (ch.status !== 'pending') return;
    setBusyChallengeId(ch.id);

    try {
      const res = await completeChallenge({ id: ch.id, mainGrowth, xpDelta: XP_PER_CHALLENGE });
      if (!res) return;

      // journal
      const title = getChallengeTitle(ch, lang);
      await appendChallengeJournalEntry({ succeeded: true, challengeId: ch.id, challengeTitle: title, lang });

      // update plan immediately
      setDayPlan(res.dayPlan);

      // sync XP/actions
      const recon = await reconcileTodayXp();
      setActions(recon.actions);
      setTodayXpEarnedState(recon.actions.todayXpEarned);

      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setLastSuccessDate(recon.xp.lastSuccessDate);

      Alert.alert(lang === 'ua' ? 'Зараховано' : 'Counted', `+${XP_PER_CHALLENGE} XP.`);
    } catch (e) {
      console.log('doCompleteChallenge error', e);
    } finally {
      setBusyChallengeId(null);
    }
  };

  const confirmSkipChallenge = (ch: DailyChallenge) => {
    if (busyChallengeId) return;
    if (ch.status !== 'pending') return;

    Alert.alert(
      lang === 'ua' ? 'Пропустити цей челендж?' : 'Skip this challenge for today?',
      lang === 'ua'
        ? 'Можна чесно сказати "сьогодні це забагато". Головне — не зникати із системи.'
        : 'You can honestly say "this is too much today". The point is not to disappear from your system.',
      [
        { text: lang === 'ua' ? 'Повернутися' : 'Go back', style: 'cancel' },
        { text: lang === 'ua' ? 'Пропустити' : 'Skip', onPress: () => void doSkipChallenge(ch) },
      ]
    );
  };

  const doSkipChallenge = async (ch: DailyChallenge) => {
    if (ch.status !== 'pending') return;
    setBusyChallengeId(ch.id);

    try {
      const updated = await setTodayChallengeStatus({ id: ch.id, status: 'skipped', mainGrowth });
      if (updated) setDayPlan(updated);

      // journal
      const title = getChallengeTitle(ch, lang);
      await appendChallengeJournalEntry({ succeeded: false, challengeId: ch.id, challengeTitle: title, lang });

      // sync XP/actions (skip gives 0 XP but we keep state consistent)
      const recon = await reconcileTodayXp();
      setActions(recon.actions);
      setTodayXpEarnedState(recon.actions.todayXpEarned);

      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setLastSuccessDate(recon.xp.lastSuccessDate);

      Alert.alert(lang === 'ua' ? 'Зафіксовано' : 'Noted', lang === 'ua' ? 'Пропущено.' : 'Skipped.');
    } catch (e) {
      console.log('doSkipChallenge error', e);
    } finally {
      setBusyChallengeId(null);
    }
  };

  const handleQuickMicroStep = async () => {
    const pending = tasks.filter((t) => !t.completed);
    if (!pending.length) {
      Alert.alert(lang === 'ua' ? 'Немає задач' : 'No tasks', lang === 'ua' ? 'Всі задачі вже виконані.' : 'All tasks are completed.');
      return;
    }

    const pickTask = (preferredType: TodayTask['type']): TodayTask => {
      return pending.find((t) => t.type === preferredType) || pending.find((t) => t.isGrowthFocused) || pending[0];
    };

    const applyTask = async (task: TodayTask, ritualLabel: string) => {
      const res = await completeTodayTask({
        taskId: task.id,
        mainGrowth,
        xpDelta: XP_PER_TASK,
      });

      setTasks(res.tasks);
      setDayPlan((prev) => (prev ? { ...prev, tasks: res.tasks } : prev));

      const recon = await reconcileTodayXp();
      setActions(recon.actions);
      setTodayXpEarnedState(recon.actions.todayXpEarned);

      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setLastSuccessDate(recon.xp.lastSuccessDate);

      Alert.alert(lang === 'ua' ? 'Зараховано' : 'Counted', `${ritualLabel} (+${XP_PER_TASK} XP).`);
    };

    Alert.alert(
      lang === 'ua' ? 'Мікро-крок' : 'Micro step',
      lang === 'ua' ? 'Обери один ритуал — це зарахує 1 задачу.' : 'Pick one ritual — it will count as 1 task.',
      [
        { text: lang === 'ua' ? 'Скасувати' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'ua' ? '60 сек дихання' : '60s breathing',
          onPress: () => {
            const t = pickTask('habit');
            void applyTask(t, lang === 'ua' ? 'Дихання зараховано' : 'Breathing counted');
          },
        },
        {
          text: lang === 'ua' ? '10 присідань' : '10 squats',
          onPress: () => {
            const t = pickTask('body');
            void applyTask(t, lang === 'ua' ? 'Присідання зараховано' : 'Squats counted');
          },
        },
      ]
    );
  };

  const handleEveningClose = async () => {
    if (savingEvening) return;
    setSavingEvening(true);

    try {
      const trimmed = eveningText.trim();
      const autoText = buildAutoEveningText({
        lang,
        goal: dayGoal,
        hasAnyAction: hasAnyActionToday,
      });

      const text = trimmed.length > 0 ? trimmed : autoText;

      await prependJournalEntry({
        title: lang === 'ua' ? 'Вечірня рефлексія' : 'Evening reflection',
        text,
        source: 'reflection',
        meta: { idempotencyKey: `evening_reflection:${todayIso()}` },
      });

      await markEveningDoneToday();
      setEveningDone(true);

      if (hasAnyActionToday && !hardDayMarked) {
        const after = await registerDailySuccess();
        setStreak(after.streak);
        setLastSuccessDate(after.lastSuccessDate);
      }

      const recon = await reconcileTodayXp();
      setActions(recon.actions);
      setTodayXpEarnedState(recon.actions.todayXpEarned);

      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setLastSuccessDate(recon.xp.lastSuccessDate);

      const mentorMsg = getEveningReflectionMentorLine({
        mentor: currentMentor, // Используем currentMentor
        lang,
        growth: mainGrowth,
        gender,
        name: displayName,
      });

      Alert.alert(lang === 'ua' ? 'День закрито' : 'Day closed', `${mentorMsg}\n\n${daySummaryLine}`);
      setEveningText('');
    } catch (e) {
      console.log('handleEveningClose error', e);
    } finally {
      setSavingEvening(false);
    }
  };

  const handleSaveBadDay = async () => {
    if (savingBadDay) return;
    setSavingBadDay(true);

    try {
      const trimmed = badDayText.trim();
      const isQuiet = trimmed.length === 0;

      const text = isQuiet
        ? lang === 'ua'
          ? 'Тихе закриття дня. Без слів — але я тут.'
          : 'Quiet day close. No words — but I am here.'
        : trimmed;

      await prependJournalEntry({
        title: lang === 'ua' ? 'Важкий день' : 'Hard day',
        text,
        mood: 'low',
        source: 'bad_day',
        meta: { idempotencyKey: `hard_day:${todayIso()}` },
      });

      // mark hard day + close day
      await registerActionEvent({ eventId: `hard_day:${todayIso()}`, xpDelta: 0 });
      await markEveningDoneToday();
      setEveningDone(true);

      const line = isQuiet
        ? getEveningQuietCloseLine({
            mentor: currentMentor, // Используем currentMentor
            lang,
            growth: mainGrowth,
            gender,
            name: displayName,
          })
        : getEveningReflectionMentorLine({
            mentor: currentMentor, // Используем currentMentor
            lang,
            growth: mainGrowth,
            gender,
            name: displayName,
          });

      const moodLine = getJournalMoodLine({
        mentor: currentMentor, // Используем currentMentor
        lang,
        mood: 'low' as JournalMood,
        gender,
        name: displayName,
      });

      const recon = await reconcileTodayXp();
      setActions(recon.actions);
      setTodayXpEarnedState(recon.actions.todayXpEarned);

      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setLastSuccessDate(recon.xp.lastSuccessDate);

      const baseMsg = lang === 'ua' ? 'Збережено.' : 'Saved.';
      const msg = line ? `${baseMsg}\n\n${line}` : baseMsg;

      const moodBlock = (moodLine ?? '').trim().length ? `\n\n${moodLine}` : '';

      Alert.alert(lang === 'ua' ? 'Зафіксовано' : 'Saved', `${msg}${moodBlock}\n\n${daySummaryLine}`);

      setBadDayText('');
      setBadDayEditorOpen(false);
    } catch (e) {
      console.log('handleSaveBadDay error', e);
    } finally {
      setSavingBadDay(false);
    }
  };

  if (loading || langLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: mentorColors.background }]}>
        <Text style={[styles.loadingText, { color: mentorColors.text3 }]}>
          {lang === 'ua' ? 'Завантаження...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // ---------- Visibility rules (minimalism) ----------
  const inMorning = isMorningWindow();
  const inEvening = isEveningWindow();

  const showMorning = !morningDone && inMorning;

  const showEvening = !eveningDone && inEvening && hasAnyActionToday;
  const showEveningLocked = !eveningDone && inEvening && !hasAnyActionToday;

  const showGoalCardAfterMorning = !showMorning && dayGoal.trim().length > 0 && (!hasAnyActionToday || todayXpEarned === 0);

  // показываем только пока есть pending
  const showChallengesSummary = dailyChallenges.length > 0 && challengesTouchedCount < DAILY_CHALLENGES_COUNT;

  const showHardDay = showEveningLocked; // "Важкий день" показываем только когда вечерний выход заблокирован

  const showTasks = tasks.length > 0 && !allTasksDone;

  const showMentorNote = (mentorLine ?? '').trim().length > 0 && !showTasks && !showChallengesSummary;
  const showFocus = !!mainGrowth && !showTasks && !showChallengesSummary;

  const showProgress =
    !showMorning &&
    !showGoalCardAfterMorning &&
    !showChallengesSummary &&
    !showTasks &&
    !showEvening &&
    !showEveningLocked &&
    (hasAnyActionToday || todayXpEarned > 0);

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: mentorColors.background }]} contentContainerStyle={styles.scrollContent}>
      {showMorning ? (
        <View style={[
          styles.morningCard,
          {
            backgroundColor: mentorColors.background3,
            borderColor: mentorColors.secondary + '40',
          }
        ]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
              {lang === 'ua' ? 'Ранковий вхід' : 'Morning entry'}
            </Text>
            <Pressable onPress={() => void regenerateGoal()} style={[
              styles.smallOutline,
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background2 }
            ]}>
              <Text style={[styles.smallOutlineText, { color: mentorColors.text2 }]}>
                {lang === 'ua' ? 'Змінити ціль' : 'New goal'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.morningText, { color: mentorColors.text }]}>{morningLine}</Text>
          <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>{morningHint}</Text>

          {dayGoal.trim().length ? (
            <View style={[
              styles.goalBox,
              {
                backgroundColor: mentorColors.background2,
                borderColor: mentorColors.secondary + '40',
              }
            ]}>
              <Text style={[styles.goalLabel, { color: mentorColors.text2 }]}>{lang === 'ua' ? 'Ціль дня' : 'Intention'}</Text>
              <Text style={[styles.goalText, { color: mentorColors.text }]}>{dayGoal}</Text>
              {goalPulseLine ? <Text style={[styles.goalPulse, { color: mentorColors.text2 }]}>{goalPulseLine}</Text> : null}
            </View>
          ) : null}

          <Pressable
            onPress={() => void openMorningStartPicker()}
            style={({ pressed }) => [
              styles.primaryButtonSmall, 
              pressed && { opacity: 0.9 },
              { backgroundColor: mentorColors.primary }
            ]}
          >
            <Text style={styles.primaryButtonSmallText}>{lang === 'ua' ? 'Почати день' : 'Start day'}</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.greetingText, { color: mentorColors.text }]}>
        {lang === 'ua' ? `Привіт, ${displayName}` : `Hi, ${displayName}`}
      </Text>
      <Text style={[styles.title, { color: mentorColors.text }]}>{lang === 'ua' ? 'Сьогодні' : 'Today'}</Text>

      {showGoalCardAfterMorning ? (
        <View style={[
          styles.goalCard,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.goalLabel, { color: mentorColors.text2 }]}>{lang === 'ua' ? 'Ціль дня' : 'Intention'}</Text>
            <Pressable onPress={() => void regenerateGoal()} style={[
              styles.smallOutline,
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background3 }
            ]}>
              <Text style={[styles.smallOutlineText, { color: mentorColors.text2 }]}>{lang === 'ua' ? 'Змінити' : 'Change'}</Text>
            </Pressable>
          </View>
          <Text style={[styles.goalText, { color: mentorColors.text }]}>{dayGoal}</Text>
          {goalPulseLine ? <Text style={[styles.goalPulse, { color: mentorColors.text2 }]}>{goalPulseLine}</Text> : null}
          <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
            {lang === 'ua' ? `XP сьогодні: +${todayXpEarned}` : `XP today: +${todayXpEarned}`}
          </Text>
        </View>
      ) : null}

      {showEveningLocked ? (
        <View style={[
          styles.softInfoCard,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          <Text style={[styles.softInfoText, { color: mentorColors.text2 }]}>
            {lang === 'ua'
              ? 'Вечірній вихід зʼявиться після одного маленького кроку. Навіть 1 хвилина — рахується.'
              : 'Evening exit unlocks after one small action. Even 1 minute counts.'}
          </Text>

          <Pressable 
            onPress={() => void handleQuickMicroStep()} 
            style={({ pressed }) => [
              styles.softInfoButton, 
              pressed && { opacity: 0.9 },
              { backgroundColor: mentorColors.primary }
            ]}
          >
            <Text style={styles.softInfoButtonText}>{lang === 'ua' ? 'Зробити мікро-крок' : 'Do a micro step'}</Text>
          </Pressable>
        </View>
      ) : null}

      {showChallengesSummary ? (
        <View style={[
          styles.card,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
              {lang === 'ua' ? 'Челенджі дня' : 'Daily challenges'}
            </Text>
            <Pressable onPress={() => router.push('/challenges')} style={[
              styles.smallOutline,
              { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background3 }
            ]}>
              <Text style={[styles.smallOutlineText, { color: mentorColors.text2 }]}>{lang === 'ua' ? 'Відкрити' : 'Open'}</Text>
            </Pressable>
          </View>

          <Text style={[styles.lineText, { color: mentorColors.text }]}>
            {lang === 'ua' ? 'Прогрес: ' : 'Progress: '}
            {dailyDone}/{DAILY_CHALLENGES_COUNT}
          </Text>

          <View style={{ marginTop: 8, gap: 8 }}>
            {dailyChallenges.map((ch) => {
              if (ch.status !== 'pending') return null;

              const title = getChallengeTitle(ch, lang);
              const desc = getChallengeDescription(ch, lang);
              const isBusy = busyChallengeId === ch.id;

              return (
                <View key={ch.id} style={[
                  styles.challengeMiniCard,
                  {
                    backgroundColor: mentorColors.background3,
                    borderColor: mentorColors.secondary + '40',
                  }
                ]}>
                  <Text style={[styles.challengeMiniTitle, { color: mentorColors.text }]} numberOfLines={2}>
                    {title}
                  </Text>
                  <Text style={[styles.challengeMiniDesc, { color: mentorColors.text2 }]} numberOfLines={3}>
                    {desc}
                  </Text>

                  <View style={styles.challengeMiniActionsRow}>
                    <Pressable
                      onPress={() => void confirmCompleteChallenge(ch)}
                      disabled={!!busyChallengeId}
                      style={({ pressed }) => [
                        styles.challengeMiniPrimary,
                        pressed && { opacity: 0.9 },
                        (!!busyChallengeId) && { opacity: 0.6 },
                        { backgroundColor: mentorColors.primary }
                      ]}
                    >
                      <Text style={styles.challengeMiniPrimaryText}>
                        {isBusy ? '...' : lang === 'ua' ? 'Виконав(ла)' : 'Done'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => void confirmSkipChallenge(ch)}
                      disabled={!!busyChallengeId}
                      style={({ pressed }) => [
                        styles.challengeMiniSecondary,
                        pressed && { opacity: 0.9 },
                        (!!busyChallengeId) && { opacity: 0.6 },
                        { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background2 }
                      ]}
                    >
                      <Text style={[styles.challengeMiniSecondaryText, { color: mentorColors.text2 }]}>
                        {lang === 'ua' ? 'Пропустити' : 'Skip'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {showHardDay ? (
        <View style={[
          styles.card,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          {!badDayEditorOpen ? (
            <>
              <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>{lang === 'ua' ? 'Важкий день?' : 'Hard day?'}</Text>
              <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
                {lang === 'ua' ? 'Одна коротка нотатка — і день можна закрити.' : 'One short note — and you can close the day.'}
              </Text>
              <Pressable 
                onPress={() => setBadDayEditorOpen(true)} 
                style={({ pressed }) => [
                  styles.badDayButton, 
                  pressed && { opacity: 0.9 },
                  { backgroundColor: mentorColors.error + '30' }
                ]}
              >
                <Text style={[styles.badDayButtonText, { color: mentorColors.error }]}>
                  {lang === 'ua' ? 'Зафіксувати' : 'Mark it'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>{eveningQuestion}</Text>

              <TextInput
                value={badDayText}
                onChangeText={setBadDayText}
                placeholder={lang === 'ua' ? '1–2 рядки або нічого' : '1–2 lines or nothing'}
                placeholderTextColor={mentorColors.text3}
                style={[
                  styles.badDayInput,
                  {
                    borderColor: mentorColors.secondary,
                    color: mentorColors.text,
                    backgroundColor: mentorColors.background3
                  }
                ]}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.badDayButtonsRow}>
                <Pressable
                  onPress={() => void handleSaveBadDay()}
                  disabled={savingBadDay}
                  style={({ pressed }) => [
                    styles.badDayPrimaryButton, 
                    pressed && { opacity: 0.9 }, 
                    savingBadDay && { opacity: 0.7 },
                    { backgroundColor: mentorColors.primary }
                  ]}
                >
                  <Text style={styles.badDayPrimaryButtonText}>
                    {savingBadDay
                      ? lang === 'ua'
                        ? 'Збереження...'
                        : 'Saving...'
                      : badDayText.trim().length
                      ? lang === 'ua'
                        ? 'Зберегти'
                        : 'Save'
                      : lang === 'ua'
                      ? 'Закрити день'
                      : 'Close day'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setBadDayEditorOpen(false);
                    setBadDayText('');
                  }}
                  style={({ pressed }) => [
                    styles.badDaySecondaryButton, 
                    pressed && { opacity: 0.9 },
                    { borderColor: mentorColors.secondary, backgroundColor: mentorColors.background2 }
                  ]}
                >
                  <Text style={[styles.badDaySecondaryButtonText, { color: mentorColors.text2 }]}>
                    {lang === 'ua' ? 'Скасувати' : 'Cancel'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : null}

      {showMentorNote ? (
        <View style={[
          styles.mentorCard,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
            {lang === 'ua' ? 'Нотатка наставника' : "Mentor's note"}
          </Text>
          <Text style={[styles.mentorText, { color: mentorColors.text2 }]}>{mentorLine}</Text>
        </View>
      ) : null}

      {showFocus ? (
        <View style={[
          styles.card,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>{lang === 'ua' ? 'Фокус' : 'Focus'}</Text>
          <Text style={[styles.lineText, { color: mentorColors.text }]}>
            {lang === 'ua' ? 'Зона росту: ' : 'Growth: '}
            {getTraitLabel(mainGrowth as TraitKey, lang)}
          </Text>
        </View>
      ) : null}

      {showTasks ? (
        <View style={[
          styles.card,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>{lang === 'ua' ? 'Кроки' : 'Steps'}</Text>

          <View style={{ gap: 8, marginTop: 8 }}>
            {tasks.map((t) => {
              if (t.completed) return null;
              const texts = getTaskText(t, lang);
              return (
                <Pressable 
                  key={t.id} 
                  onPress={() => confirmCompleteTask(t.id)} 
                  style={[
                    styles.taskCard,
                    {
                      backgroundColor: mentorColors.background3,
                      borderColor: mentorColors.secondary + '40',
                    }
                  ]}
                >
                  <View style={styles.taskHeader}>
                    <View style={[styles.checkbox, { borderColor: mentorColors.secondary }]} />
                    <Text style={[styles.taskTitle, { color: mentorColors.text }]}>{texts.title}</Text>
                  </View>
                  <Text style={[styles.taskDescription, { color: mentorColors.text2 }]}>{texts.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {showEvening ? (
        <View style={[
          styles.eveningCard,
          {
            backgroundColor: mentorColors.info + '15',
            borderColor: mentorColors.info + '40',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>
            {lang === 'ua' ? 'Вечірній вихід' : 'Evening exit'}
          </Text>

          <Text style={[styles.eveningQuestion, { color: mentorColors.text }]}>{eveningQuestion}</Text>
          <Text style={[styles.eveningHint, { color: mentorColors.text3 }]}>
            {lang === 'ua'
              ? 'Можеш нічого не писати — я згенерую коротке закриття.'
              : 'You can write nothing — I will generate a short close.'}
          </Text>

          <TextInput
            value={eveningText}
            onChangeText={setEveningText}
            placeholder={eveningPlaceholder}
            placeholderTextColor={mentorColors.text3}
            style={[
              styles.eveningInput,
              {
                borderColor: mentorColors.secondary,
                color: mentorColors.text,
                backgroundColor: mentorColors.background2
              }
            ]}
            multiline
            textAlignVertical="top"
          />

          <Pressable
            onPress={() => void handleEveningClose()}
            disabled={savingEvening}
            style={({ pressed }) => [
              styles.primaryButtonSmall, 
              pressed && { opacity: 0.9 }, 
              savingEvening && { opacity: 0.7 },
              { backgroundColor: mentorColors.primary }
            ]}
          >
            <Text style={styles.primaryButtonSmallText}>
              {savingEvening ? (lang === 'ua' ? 'Збереження...' : 'Saving...') : lang === 'ua' ? 'Закрити' : 'Close'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {showProgress ? (
        <View style={[
          styles.card,
          {
            backgroundColor: mentorColors.background2,
            borderColor: mentorColors.secondary + '20',
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: mentorColors.text }]}>{lang === 'ua' ? 'Прогрес' : 'Progress'}</Text>
          <Text style={[styles.lineText, { color: mentorColors.text }]}>
            {lang === 'ua' ? 'Рівень: ' : 'Level: '}
            {level}
          </Text>
          <Text style={[styles.lineText, { color: mentorColors.text }]}>
            {lang === 'ua' ? 'XP: ' : 'XP: '}
            {xp}
          </Text>
          <Text style={[styles.lineText, { color: mentorColors.text }]}>
            {lang === 'ua' ? 'Серія: ' : 'Streak: '}
            {streak}
          </Text>
          <Text style={[styles.mutedText, { color: mentorColors.text3 }]}>
            {lang === 'ua' ? `XP сьогодні: +${todayXpEarned}` : `XP today: +${todayXpEarned}`}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// Стили остаются без изменений в структуре, но цвета будут заменяться динамически через mentorColors
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 24 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16 },

  greetingText: { fontSize: 18, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },

  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },

  morningCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  morningText: { fontSize: 13, marginBottom: 6 },

  goalCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  goalBox: {
    marginTop: 8,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  goalLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  goalText: { fontSize: 13, fontWeight: '600' },
  goalPulse: { marginTop: 6, fontSize: 12 },

  softInfoCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  softInfoText: { fontSize: 12 },
  softInfoButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  softInfoButtonText: { fontSize: 12, color: '#FFF7E8', fontWeight: '600' },

  eveningCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  eveningQuestion: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  eveningHint: { fontSize: 12, marginBottom: 8 },
  eveningInput: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 80,
  },

  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  lineText: { fontSize: 13, marginBottom: 4 },
  mutedText: { fontSize: 13, marginBottom: 4 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },

  smallOutline: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallOutlineText: { fontSize: 12, fontWeight: '600' },

  primaryButtonSmall: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  primaryButtonSmallText: { fontSize: 12, color: '#FFF7E8', fontWeight: '600' },

  challengeMiniCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  challengeMiniCardSkipped: { borderColor: '#D9CCB8' },
  challengeMiniTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  challengeMiniStatus: { fontSize: 12 },

  // NEW: challenge mini description + actions
  challengeMiniDesc: { fontSize: 12 },
  challengeMiniActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },

  challengeMiniPrimary: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  challengeMiniPrimaryText: { fontSize: 12, color: '#FFF7E8', fontWeight: '600' },

  challengeMiniSecondary: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  challengeMiniSecondaryText: { fontSize: 12, fontWeight: '600' },

  mentorCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  mentorText: { fontSize: 13 },

  taskCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  taskHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, marginRight: 8 },
  taskTitle: { fontSize: 14, fontWeight: '700' },
  taskDescription: { fontSize: 13 },

  badDayButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badDayButtonText: { fontSize: 13, fontWeight: '600' },

  badDayInput: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 80,
  },
  badDayButtonsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 },
  badDayPrimaryButton: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  badDayPrimaryButtonText: { fontSize: 13, color: '#FFF7E8', fontWeight: '600' },
  badDaySecondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  badDaySecondaryButtonText: { fontSize: 13, fontWeight: '600' },
});
