// app/storage/daySnapshotStore.ts
import type { AppGender, AppLanguage, MentorId, MentorMode, TraitKey } from '../mentorPhrases';
import {
  computeMentorMode,
  getChallengesHeaderLine,
  getDailyMentorLine,
  getMorningEntryLine,
} from '../mentorPhrases';

import { todayLocalIso } from '../utils/date';

function todayIso(): string {
  return todayLocalIso();
}


import { getOrCreateDayPlan, type DayPlan } from './dayPlanStore';
import { loadProfile } from './profileStore';
import { loadTraits } from './traitsStore';
import { loadXpState, type XpState } from './xpStore';


export type DaySnapshot = {
  date: string; // YYYY-MM-DD

  // profile
  mentor: MentorId;
  gender: AppGender;
  name: string;

  // traits
  mainGrowth: TraitKey | null;

  // progress
  xp: XpState;

  // plan
  dayPlan: DayPlan;

  // computed
  mentorMode: MentorMode;
  mentorLine: string;
  challengesHeaderLine: string;

  // NEW
  morningLine: string;
};

export async function getOrCreateDaySnapshot(params: { lang: AppLanguage }): Promise<DaySnapshot> {
  const date = todayIso();

  const [profile, traits, xp] = await Promise.all([loadProfile(), loadTraits(), loadXpState()]);

  const mainGrowth: TraitKey | null = traits?.growthZones?.length ? traits.growthZones[0] : null;

  const dayPlan = await getOrCreateDayPlan({ mainGrowth });

  const mentorMode: MentorMode = computeMentorMode({
    streak: xp.streak,
    lastSuccessDate: xp.lastSuccessDate,
  });

  const safeName = (profile.name ?? '').trim();

  const mentorLine = getDailyMentorLine({
    mentor: profile.mentor,
    lang: params.lang,
    growth: mainGrowth,
    mode: mentorMode,
    gender: profile.gender,
    name: safeName,
  });

  const challengesHeaderLine = getChallengesHeaderLine({
    mentor: profile.mentor,
    lang: params.lang,
    growth: mainGrowth,
  });

  const morningLine = getMorningEntryLine({
    mentor: profile.mentor,
    lang: params.lang,
    growth: mainGrowth,
    mode: mentorMode,
    gender: profile.gender,
    name: safeName,
  });

  return {
    date,
    mentor: profile.mentor,
    gender: profile.gender,
    name: safeName,

    mainGrowth,

    xp,
    dayPlan,

    mentorMode,
    mentorLine,
    challengesHeaderLine,

    morningLine,
  };
}
