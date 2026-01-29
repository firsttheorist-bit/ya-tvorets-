// app/(tabs)/challenges.tsx
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppLanguage } from '../LanguageContext';
import { getChallengesHeaderLine, type AppGender, type AppLanguage, type MentorId, type TraitKey } from '../mentorPhrases';

import {
  completeChallenge,
  DAILY_CHALLENGES_COUNT,
  getChallengeDescription,
  getChallengeTitle,
  getOrCreateDayPlan,
  regenerateTodayChallenges,
  setTodayChallengeStatus,
  type DailyChallenge,
  type DayPlan,
} from '../storage/dayPlanStore';

import { reconcileTodayXp } from '../storage/dayActionStore';
import { getOrCreateDaySnapshot, type DaySnapshot } from '../storage/daySnapshotStore';
import { appendChallengeJournalEntry } from '../storage/journalStore';

const XP_PER_CHALLENGE = 20;

// Локальная mentor-line для челенджа
function getChallengeMentorLineLocal(params: {
  mentor: MentorId;
  lang: AppLanguage;
  trait: TraitKey | null;
  succeeded: boolean;
  gender?: AppGender;
  name?: string;
}): string {
  const { mentor, lang, trait, succeeded } = params;
  const name = (params.name ?? '').trim() || (lang === 'ua' ? 'Творець' : 'Creator');

  const traitUa: Record<TraitKey, string> = {
    focus: 'фокус',
    calm: 'спокій',
    confidence: 'впевненість',
    discipline: 'дисципліну',
    creativity: 'креативність',
    empathy: 'емпатію',
  };

  const traitEn: Record<TraitKey, string> = {
    focus: 'focus',
    calm: 'calm',
    confidence: 'confidence',
    discipline: 'discipline',
    creativity: 'creativity',
    empathy: 'empathy',
  };

  const tUa = trait ? traitUa[trait] : 'обрану рису';
  const tEn = trait ? traitEn[trait] : 'the chosen trait';

  if (lang === 'ua') {
    if (succeeded) {
      if (mentor === 'lev') return `Лев: ${name}, крок зараховано. Ритм будується з повернень — тримай курс у ${tUa}.`;
      if (mentor === 'lana') return `Лана: ${name}, дбайливо і чесно. Закріплюємо прогрес у ${tUa}.`;
      if (mentor === 'bro') return `Bro: ${name}, done. Мінус одна відмазка, плюс один крок у ${tUa}.`;
      return `Катана: ${name}, точність збережено. Структура міцнішає у ${tUa}.`;
    }

    if (mentor === 'lev') return `Лев: ${name}, чесно сказати “не сьогодні” — теж стратегія. Завтра повернемося.`;
    if (mentor === 'lana') return `Лана: ${name}, твій стан важливіший за чекбокс. Дай собі простір без провини.`;
    if (mentor === 'bro') return `Bro: ${name}, окей, пропустили. Головне — не зливати весь день разом із цим.`;
    return `Катана: ${name}, чітке “ні” інколи економить сили. Повернемося у кращий момент.`;
  }

  if (succeeded) {
    if (mentor === 'lev') return `Lev: ${name}, small step registered. Rhythm is built from returns — keep course in ${tEn}.`;
    if (mentor === 'lana') return `Lana: ${name}, caring and honest. Lock the progress in ${tEn}.`;
    if (mentor === 'bro') return `Bro: ${name}, done. One excuse less, one step in ${tEn}.`;
    return `Katana: ${name}, precision preserved. The structure strengthens in ${tEn}.`;
  }

  if (mentor === 'lev') return `Lev: ${name}, saying “not today” is strategy, not defeat. We will return tomorrow.`;
  if (mentor === 'lana') return `Lana: ${name}, your state matters more than a checkbox. Give yourself room without guilt.`;
  if (mentor === 'bro') return `Bro: ${name}, okay, skipped. Just do not flush the whole day with it.`;
  return `Katana: ${name}, a clear “no” sometimes saves energy. Return at a better moment.`;
}

export default function ChallengesScreen() {
  const { language } = useAppLanguage();
  const lang = language as AppLanguage;

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [todayXpEarned, setTodayXpEarned] = useState(0);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [regenBusy, setRegenBusy] = useState(false);

  const mentor = (snapshot?.mentor ?? 'lev') as MentorId;
  const gender = (snapshot?.gender ?? 'neutral') as AppGender;

  const displayName = useMemo(() => {
    const t = (snapshot?.name ?? '').trim();
    return t.length ? t : lang === 'ua' ? 'Творець' : 'Creator';
  }, [snapshot, lang]);

  const mainGrowth: TraitKey | null = useMemo(() => snapshot?.mainGrowth ?? null, [snapshot]);

  const daily: DailyChallenge[] = useMemo(() => dayPlan?.challenges ?? [], [dayPlan]);
  const doneCount = useMemo(() => daily.filter((c) => c.status === 'completed').length, [daily]);

  const headerLine = useMemo(() => getChallengesHeaderLine({ mentor, lang, growth: mainGrowth }), [mentor, lang, mainGrowth]);

  const refresh = useCallback(async () => {
    try {
      const snap = await getOrCreateDaySnapshot({ lang });
      setSnapshot(snap);

      const plan = await getOrCreateDayPlan({ mainGrowth: snap.mainGrowth ?? null });
      setDayPlan(plan);

      const recon = await reconcileTodayXp();
      setXp(recon.xp.xp);
      setLevel(recon.xp.level);
      setStreak(recon.xp.streak);
      setTodayXpEarned(recon.actions.todayXpEarned);
    } catch (e) {
      console.log('Challenges refresh error', e);
      setSnapshot(null);
      setDayPlan(null);
      setXp(0);
      setLevel(1);
      setStreak(0);
      setTodayXpEarned(0);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const handleRegenerate = async () => {
    if (regenBusy) return;
    setRegenBusy(true);
    try {
      await regenerateTodayChallenges({ mainGrowth });
      await refresh();
      Alert.alert(
        lang === 'ua' ? 'Оновлено' : 'Updated',
        lang === 'ua' ? 'Згенеровано нову підбірку з 3 челенджів на сьогодні.' : 'Generated a new set of 3 challenges for today.'
      );
    } catch (e) {
      console.log('handleRegenerate error', e);
    } finally {
      setRegenBusy(false);
    }
  };

  const confirmComplete = (ch: DailyChallenge) => {
    if (busyId) return;

    Alert.alert(
      lang === 'ua' ? 'Виконати цей челендж?' : 'Mark this challenge as done?',
      lang === 'ua' ? 'Будь чесним(ою): ти справді зробив(ла) цю дію до кінця?' : 'Be honest: did you really complete this action?',
      [
        { text: lang === 'ua' ? 'Ще ні' : 'Not yet', style: 'cancel' },
        { text: lang === 'ua' ? 'Так, виконав(ла)' : 'Yes, I did', onPress: () => void doCompleteChallenge(ch) },
      ]
    );
  };

  const doCompleteChallenge = async (ch: DailyChallenge) => {
    if (ch.status === 'completed') return;
    setBusyId(ch.id);

    try {
      const res = await completeChallenge({ id: ch.id, mainGrowth, xpDelta: XP_PER_CHALLENGE });
      if (!res) return;

      const title = getChallengeTitle(ch, lang);
      await appendChallengeJournalEntry({ succeeded: true, challengeId: ch.id, challengeTitle: title, lang });

      const line = getChallengeMentorLineLocal({ mentor, lang, trait: ch.trait, succeeded: true, gender, name: displayName });

      await refresh();

      const baseMsg = lang === 'ua' ? `+${XP_PER_CHALLENGE} XP за чесний челендж.` : `+${XP_PER_CHALLENGE} XP for an honest challenge.`;
      const meta =
        lang === 'ua'
          ? `\n\nXP: ${res.xp.xp} • Рівень: ${res.xp.level} • Серія: ${res.xp.streak}`
          : `\n\nXP: ${res.xp.xp} • Level: ${res.xp.level} • Streak: ${res.xp.streak}`;

      Alert.alert(lang === 'ua' ? 'Челендж виконано' : 'Challenge completed', (line ? `${baseMsg}\n\n${line}` : baseMsg) + meta);
    } catch (e) {
      console.log('doCompleteChallenge error', e);
    } finally {
      setBusyId(null);
    }
  };

  const confirmSkip = (ch: DailyChallenge) => {
    if (busyId) return;

    Alert.alert(
      lang === 'ua' ? 'Пропустити цей челендж?' : 'Skip this challenge for today?',
      lang === 'ua'
        ? 'Можна чесно сказати “сьогодні це забагато”. Головне — не зникати із системи.'
        : 'You can honestly say “this is too much today”. The point is not to disappear from your system.',
      [
        { text: lang === 'ua' ? 'Повернутися' : 'Go back', style: 'cancel' },
        { text: lang === 'ua' ? 'Пропустити' : 'Skip', onPress: () => void skipChallenge(ch) },
      ]
    );
  };

  const skipChallenge = async (ch: DailyChallenge) => {
    if (ch.status === 'completed' || ch.status === 'skipped') return;
    setBusyId(ch.id);

    try {
      await setTodayChallengeStatus({ id: ch.id, status: 'skipped', mainGrowth });

      const title = getChallengeTitle(ch, lang);
      await appendChallengeJournalEntry({ succeeded: false, challengeId: ch.id, challengeTitle: title, lang });

      const line = getChallengeMentorLineLocal({ mentor, lang, trait: ch.trait, succeeded: false, gender, name: displayName });

      await refresh();
      Alert.alert(lang === 'ua' ? 'Зафіксовано' : 'Noted', line || (lang === 'ua' ? 'Зафіксовано.' : 'Noted.'));
    } catch (e) {
      console.log('skipChallenge error', e);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{lang === 'ua' ? 'Завантаження челенджів...' : 'Loading challenges...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{lang === 'ua' ? 'Челенджі' : 'Challenges'}</Text>
      <Text style={styles.subtitle}>{headerLine}</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Підбірка дня' : 'Daily set'}</Text>
          <Pressable onPress={() => void handleRegenerate()} disabled={regenBusy} style={[styles.smallOutline, regenBusy && { opacity: 0.7 }]}>
            <Text style={styles.smallOutlineText}>
              {regenBusy ? (lang === 'ua' ? 'Оновлення...' : 'Updating...') : lang === 'ua' ? 'Перегенерувати' : 'Regenerate'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.mutedText}>
          {lang === 'ua'
            ? `Сьогодні: ${doneCount}/${DAILY_CHALLENGES_COUNT} виконано • XP сьогодні: +${todayXpEarned}`
            : `Today: ${doneCount}/${DAILY_CHALLENGES_COUNT} done • XP today: +${todayXpEarned}`}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {daily.map((ch) => {
          const title = getChallengeTitle(ch, lang);
          const desc = getChallengeDescription(ch, lang);

          const statusLabel =
            ch.status === 'completed'
              ? lang === 'ua'
                ? 'Виконано'
                : 'Done'
              : ch.status === 'skipped'
              ? lang === 'ua'
                ? 'Пропущено'
                : 'Skipped'
              : lang === 'ua'
              ? 'Очікує'
              : 'Pending';

          const isBusy = busyId === ch.id;
          const lockDone = ch.status === 'completed' || isBusy;
          const lockSkip = ch.status !== 'pending' || isBusy;

          return (
            <View
              key={ch.id}
              style={[
                styles.challengeCard,
                ch.status === 'completed' && styles.challengeCardDone,
                ch.status === 'skipped' && styles.challengeCardSkipped,
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.challengeTitle}>{title}</Text>
                <Text style={styles.challengeStatus}>{statusLabel}</Text>
              </View>

              <Text style={styles.challengeDesc}>{desc}</Text>

              <View style={styles.actionsRow}>
                <Pressable onPress={() => void confirmComplete(ch)} disabled={lockDone} style={[styles.primaryButtonSmall, lockDone && { opacity: 0.6 }]}>
                  <Text style={styles.primaryButtonSmallText}>{isBusy ? '...' : lang === 'ua' ? 'Виконав(ла)' : 'Done'}</Text>
                </Pressable>

                <Pressable onPress={() => void confirmSkip(ch)} disabled={lockSkip} style={[styles.secondaryButtonSmall, lockSkip && { opacity: 0.6 }]}>
                  <Text style={styles.secondaryButtonSmallText}>{lang === 'ua' ? 'Пропустити' : 'Skip'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{lang === 'ua' ? 'Прогрес' : 'Progress'}</Text>
        <Text style={styles.lineText}>{lang === 'ua' ? 'Рівень: ' : 'Level: '}{level}</Text>
        <Text style={styles.lineText}>{lang === 'ua' ? 'XP: ' : 'XP: '}{xp}</Text>
        <Text style={styles.lineText}>{lang === 'ua' ? 'Серія: ' : 'Streak: '}{streak}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F0E8' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 24 },

  loadingContainer: { flex: 1, backgroundColor: '#F3F0E8', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#7C7365' },

  title: { fontSize: 24, fontWeight: '700', color: '#2B2620', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#857A6A', marginBottom: 16 },

  card: {
    backgroundColor: '#FFFEFA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1D6C5',
  },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#2B2620', marginBottom: 6 },
  lineText: { fontSize: 13, color: '#4E4537', marginBottom: 4 },
  mutedText: { fontSize: 13, color: '#9B8F7C' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },

  smallOutline: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F7F2E7',
  },
  smallOutlineText: { fontSize: 12, color: '#6C6255', fontWeight: '600' },

  challengeCard: {
    backgroundColor: '#FFFEFA',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1D6C5',
  },
  challengeCardDone: { backgroundColor: '#E7F2E7', borderColor: '#B9D6B9' },
  challengeCardSkipped: { backgroundColor: '#EFE9E1', borderColor: '#D9CCB8' },

  challengeTitle: { fontSize: 14, fontWeight: '700', color: '#2B2620', flex: 1, paddingRight: 10 },
  challengeStatus: { fontSize: 12, color: '#7C7365', fontWeight: '600' },
  challengeDesc: { fontSize: 13, color: '#4E4537', marginTop: 6 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },

  primaryButtonSmall: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#2B2620' },
  primaryButtonSmallText: { fontSize: 12, color: '#FFF7E8', fontWeight: '600' },

  secondaryButtonSmall: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7F2E7',
    borderWidth: 1,
    borderColor: '#D9CCB8',
  },
  secondaryButtonSmallText: { fontSize: 12, color: '#6C6255', fontWeight: '600' },
});
