// app/traits-test.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppLanguage } from './LanguageContext';

type AppLanguage = 'ua' | 'en';
type TraitKey =
  | 'focus'
  | 'calm'
  | 'confidence'
  | 'discipline'
  | 'creativity'
  | 'empathy';

type TraitsResult = {
  strengths: TraitKey[];
  growthZones: TraitKey[];
  scores: Record<TraitKey, number>;
  completedAt: string;
  version: number;
};

const STORAGE_KEYS = {
  traits: '@ya_tvorets_traits',
};

type AnswerValue = 1 | 2 | 3 | 4 | 5; // 1=не согласен, 5=полностью согласен

type Question = {
  id: string;
  trait: TraitKey;
  ua: string;
  en: string;
  // reverse = если утверждение “негативное”, то инвертируем балл
  reverse?: boolean;
};

const TEST_VERSION = 1;

// 12 вопросов: по 2 на каждую рису (сбалансировано и достаточно “умно”, но не перегружает)
const QUESTIONS: Question[] = [
  // focus
  {
    id: 'q1',
    trait: 'focus',
    ua: 'Коли я починаю задачу, мені відносно легко тримати увагу на одному.',
    en: 'When I start a task, it is relatively easy to keep attention on one thing.',
  },
  {
    id: 'q2',
    trait: 'focus',
    ua: 'Мене часто “розриває” між справами, і я втрачаю нитку.',
    en: 'I often bounce between tasks and lose the thread.',
    reverse: true,
  },

  // discipline
  {
    id: 'q3',
    trait: 'discipline',
    ua: 'Я зазвичай доводжу до кінця хоча б мінімальну версію запланованого.',
    en: 'I usually finish at least a minimal version of what I planned.',
  },
  {
    id: 'q4',
    trait: 'discipline',
    ua: 'Мені важко тримати обіцянки собі, навіть маленькі.',
    en: 'It is hard for me to keep promises to myself, even small ones.',
    reverse: true,
  },

  // calm
  {
    id: 'q5',
    trait: 'calm',
    ua: 'Коли стає напружено, я вмію робити паузу й заземлятись.',
    en: 'When things get tense, I can pause and ground myself.',
  },
  {
    id: 'q6',
    trait: 'calm',
    ua: 'Мій стан легко “розганяється”, і мені важко заспокоїтися.',
    en: 'My state escalates easily and it is hard to calm down.',
    reverse: true,
  },

  // confidence
  {
    id: 'q7',
    trait: 'confidence',
    ua: 'Я можу діяти, навіть якщо відчуваю сумніви або страх.',
    en: 'I can act even when I feel doubt or fear.',
  },
  {
    id: 'q8',
    trait: 'confidence',
    ua: 'Я часто зупиняюсь, бо боюсь виглядати “неідеально”.',
    en: 'I often stop because I fear looking “not perfect”.',
    reverse: true,
  },

  // creativity
  {
    id: 'q9',
    trait: 'creativity',
    ua: 'Я легко генерую варіанти, навіть якщо вони не всі ідеальні.',
    en: 'I can generate options easily, even if they are not all perfect.',
  },
  {
    id: 'q10',
    trait: 'creativity',
    ua: 'Коли потрібно вигадати щось нове, я швидко “застигаю”.',
    en: 'When I need to come up with something new, I freeze quickly.',
    reverse: true,
  },

  // empathy
  {
    id: 'q11',
    trait: 'empathy',
    ua: 'Я зазвичай розмовляю з собою більш-менш підтримуюче, а не жорстко.',
    en: 'I generally talk to myself in a supportive way rather than harshly.',
  },
  {
    id: 'q12',
    trait: 'empathy',
    ua: 'Після помилок я часто “добиваю” себе самокритикою.',
    en: 'After mistakes, I often beat myself up with self-criticism.',
    reverse: true,
  },
];

const ALL_TRAITS: TraitKey[] = [
  'focus',
  'calm',
  'confidence',
  'discipline',
  'creativity',
  'empathy',
];

const TRAIT_LABELS: Record<TraitKey, { ua: string; en: string }> = {
  focus: { ua: 'Фокус', en: 'Focus' },
  calm: { ua: 'Спокій', en: 'Calm' },
  confidence: { ua: 'Впевненість', en: 'Confidence' },
  discipline: { ua: 'Дисципліна', en: 'Discipline' },
  creativity: { ua: 'Креативність', en: 'Creativity' },
  empathy: { ua: 'Емпатія', en: 'Empathy' },
};

function traitLabel(trait: TraitKey, lang: AppLanguage): string {
  return TRAIT_LABELS[trait][lang];
}

function invert(v: AnswerValue): AnswerValue {
  // 1<->5, 2<->4, 3 stays
  if (v === 1) return 5;
  if (v === 2) return 4;
  if (v === 3) return 3;
  if (v === 4) return 2;
  return 1;
}

function clampTop<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n));
}

export default function TraitsTestScreen() {
  const router = useRouter();
  const { language, loading: langLoading } = useAppLanguage();
  const lang = (language as AppLanguage) ?? 'ua';

  const [loading, setLoading] = useState<boolean>(true);

  // answers: questionId -> 1..5
  const [answers, setAnswers] = useState<Record<string, AnswerValue | undefined>>(
    {}
  );

  const [existingResult, setExistingResult] = useState<TraitsResult | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.traits);
        if (!raw) {
          setExistingResult(null);
          return;
        }
        const parsed = JSON.parse(raw) as Partial<TraitsResult>;
        if (
          parsed &&
          Array.isArray(parsed.strengths) &&
          Array.isArray(parsed.growthZones) &&
          parsed.scores &&
          typeof parsed.completedAt === 'string'
        ) {
          // мягкая валидация
          setExistingResult(parsed as TraitsResult);
        } else {
          setExistingResult(null);
        }
      } catch (e) {
        console.log('Error loading traits result', e);
        setExistingResult(null);
      } finally {
        setLoading(false);
      }
    };

    loadExisting();
  }, []);

  const answeredCount = useMemo(() => {
    return QUESTIONS.reduce((acc, q) => (answers[q.id] ? acc + 1 : acc), 0);
  }, [answers]);

  const canCompute = answeredCount === QUESTIONS.length;

  const computedResult: TraitsResult | null = useMemo(() => {
    if (!canCompute) return null;

    const scores: Record<TraitKey, number> = {
      focus: 0,
      calm: 0,
      confidence: 0,
      discipline: 0,
      creativity: 0,
      empathy: 0,
    };

    // суммируем по вопросам
    for (const q of QUESTIONS) {
      const raw = answers[q.id];
      if (!raw) return null; // перестраховка
      const value = q.reverse ? invert(raw) : raw;
      scores[q.trait] += value;
    }

    // сортируем по score
    const sorted = [...ALL_TRAITS].sort((a, b) => scores[b] - scores[a]);

    // strengths: top-2
    const strengths = clampTop(sorted, 2);

    // growth: bottom-2 (но не пересекаем с strengths)
    const reversed = [...sorted].reverse();
    const growthZones: TraitKey[] = [];
    for (const t of reversed) {
      if (growthZones.length >= 2) break;
      if (!strengths.includes(t)) growthZones.push(t);
    }

    return {
      strengths,
      growthZones,
      scores,
      completedAt: new Date().toISOString(),
      version: TEST_VERSION,
    };
  }, [answers, canCompute]);

  const resultToShow = showResult ? computedResult : existingResult;

  const handleSelect = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleComputeNow = () => {
    if (!canCompute) {
      Alert.alert(
        lang === 'ua' ? 'Заповни тест' : 'Complete the test',
        lang === 'ua'
          ? 'Дай відповіді на всі питання, щоб ми змогли порахувати результат.'
          : 'Answer all questions so we can calculate your result.'
      );
      return;
    }
    setShowResult(true);
  };

  const handleSaveResult = async () => {
    if (!computedResult) {
      Alert.alert(
        lang === 'ua' ? 'Немає результату' : 'No result',
        lang === 'ua'
          ? 'Спочатку заповни тест і порахуй результат.'
          : 'First complete the test and calculate the result.'
      );
      return;
    }

    try {
      setSaving(true);
      await AsyncStorage.setItem(STORAGE_KEYS.traits, JSON.stringify(computedResult));
      setExistingResult(computedResult);

      Alert.alert(
        lang === 'ua' ? 'Збережено' : 'Saved',
        lang === 'ua'
          ? 'Результат тесту збережено. Він впливатиме на “Сьогодні” та челенджі.'
          : 'Your test result has been saved. It will affect “Today” and challenges.'
      );

      // Можно сразу вернуться в профиль (по желанию)
      // router.back();
    } catch (e) {
      console.log('Error saving traits result', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      lang === 'ua' ? 'Перепройти тест?' : 'Retake the test?',
      lang === 'ua'
        ? 'Ми очистимо поточні відповіді. Збережений результат у профілі не зникне, поки ти не натиснеш “Зберегти”.'
        : 'We will clear current answers. The saved result will remain until you press “Save”.',
      [
        { text: lang === 'ua' ? 'Скасувати' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'ua' ? 'Очистити' : 'Clear',
          style: 'destructive',
          onPress: () => {
            setAnswers({});
            setShowResult(false);
          },
        },
      ]
    );
  };

  const explainTrait = (trait: TraitKey, langKey: AppLanguage): string => {
    const ua: Record<TraitKey, string> = {
      focus:
        'Вміння утримувати увагу й працювати з однією задачею без постійних перемикань.',
      discipline:
        'Здатність робити кроки навіть без настрою та доводити “мінімальну версію” до кінця.',
      calm:
        'Навичка заземлятися, знижувати напругу та відновлювати керованість стану.',
      confidence:
        'Готовність діяти попри сумніви, робити кроки в “неідеальності”.',
      creativity:
        'Гнучкість мислення, генерація варіантів і сміливість пробувати різне.',
      empathy:
        'Тон ставлення до себе й інших: підтримка замість самобичування.',
    };

    const en: Record<TraitKey, string> = {
      focus:
        'Ability to sustain attention and work on one task without constant switching.',
      discipline:
        'Capacity to act without mood and finish a “minimal viable” version.',
      calm:
        'Skill of grounding, reducing tension, and regaining control over your state.',
      confidence:
        'Willingness to act despite doubts and take steps without perfection.',
      creativity:
        'Flexibility of thinking, generating options, and experimenting.',
      empathy:
        'Your inner tone and attitude: support instead of self-punishment.',
    };

    return langKey === 'ua' ? ua[trait] : en[trait];
  };

  if (loading || langLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {lang === 'ua' ? 'Завантаження тесту...' : 'Loading test...'}
        </Text>
      </View>
    );
  }

  const title = lang === 'ua' ? 'Тест рис' : 'Traits test';
  const subtitle =
    lang === 'ua'
      ? 'Відповідай чесно. Це не оцінка “добре/погано”, це налаштування під тебе.'
      : 'Answer honestly. This is not “good/bad”, it is calibration for you.';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.backButtonText}>
            {lang === 'ua' ? 'Назад' : 'Back'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.resetButtonText}>
            {lang === 'ua' ? 'Очистити' : 'Clear'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {existingResult && !showResult && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {lang === 'ua' ? 'Збережений результат' : 'Saved result'}
          </Text>

          <Text style={styles.lineText}>
            {lang === 'ua' ? 'Сильні сторони: ' : 'Strengths: '}
            <Text style={styles.boldText}>
              {existingResult.strengths
                .map((t) => traitLabel(t, lang))
                .join(', ')}
            </Text>
          </Text>

          <Text style={styles.lineText}>
            {lang === 'ua' ? 'Зони росту: ' : 'Growth zones: '}
            <Text style={styles.boldText}>
              {existingResult.growthZones
                .map((t) => traitLabel(t, lang))
                .join(', ')}
            </Text>
          </Text>

          <Text style={styles.mutedText}>
            {lang === 'ua'
              ? 'Можеш пройти тест ще раз — але результат зміниться тільки після натискання “Зберегти”.'
              : 'You can retake the test — the saved result changes only after you press “Save”.'}
          </Text>
        </View>
      )}

      {/* Questions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {lang === 'ua'
            ? `Питання (${answeredCount}/${QUESTIONS.length})`
            : `Questions (${answeredCount}/${QUESTIONS.length})`}
        </Text>

        {QUESTIONS.map((q) => {
          const text = lang === 'ua' ? q.ua : q.en;
          const selected = answers[q.id];

          return (
            <View key={q.id} style={styles.questionBlock}>
              <Text style={styles.questionText}>{text}</Text>

              <View style={styles.scaleRow}>
                {([1, 2, 3, 4, 5] as AnswerValue[]).map((v) => {
                  const active = selected === v;
                  return (
                    <Pressable
                      key={`${q.id}_${v}`}
                      onPress={() => handleSelect(q.id, v)}
                      style={[
                        styles.scaleChip,
                        active && styles.scaleChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.scaleChipText,
                          active && styles.scaleChipTextActive,
                        ]}
                      >
                        {String(v)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.scaleHint}>
                {lang === 'ua'
                  ? '1 — не згоден(на) · 5 — повністю згоден(на)'
                  : '1 — disagree · 5 — strongly agree'}
              </Text>
            </View>
          );
        })}

        <Pressable
          onPress={handleComputeNow}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.9 },
            !canCompute && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {lang === 'ua' ? 'Порахувати результат' : 'Calculate result'}
          </Text>
        </Pressable>
      </View>

      {/* Result */}
      {computedResult && showResult && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {lang === 'ua' ? 'Твій результат' : 'Your result'}
          </Text>

          <Text style={styles.resultLabel}>
            {lang === 'ua' ? 'Сильні сторони' : 'Strengths'}
          </Text>
          {computedResult.strengths.map((t) => (
            <View key={`s_${t}`} style={styles.resultRow}>
              <Text style={styles.resultTitle}>• {traitLabel(t, lang)}</Text>
              <Text style={styles.mutedText}>{explainTrait(t, lang)}</Text>
            </View>
          ))}

          <View style={{ height: 8 }} />

          <Text style={styles.resultLabel}>
            {lang === 'ua' ? 'Зони росту' : 'Growth zones'}
          </Text>
          {computedResult.growthZones.map((t) => (
            <View key={`g_${t}`} style={styles.resultRow}>
              <Text style={styles.resultTitle}>• {traitLabel(t, lang)}</Text>
              <Text style={styles.mutedText}>{explainTrait(t, lang)}</Text>
            </View>
          ))}

          <View style={{ height: 10 }} />

          <Pressable
            onPress={handleSaveResult}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.9 },
              saving && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {saving
                ? lang === 'ua'
                  ? 'Збереження...'
                  : 'Saving...'
                : lang === 'ua'
                ? 'Зберегти результат'
                : 'Save result'}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F0E8' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 16, color: '#7C7365' },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  backButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F7F2E7',
    borderWidth: 1,
    borderColor: '#D9CCB8',
  },
  backButtonText: { fontSize: 12, color: '#6C6255', fontWeight: '600' },

  resetButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E4C4C4',
  },
  resetButtonText: { fontSize: 12, color: '#5C2A2A', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#2B2620', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#857A6A', marginBottom: 14 },

  card: {
    backgroundColor: '#FFFEFA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1D6C5',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2620',
    marginBottom: 8,
  },

  lineText: { fontSize: 13, color: '#4E4537', marginBottom: 4 },
  boldText: { fontWeight: '700', color: '#2B2620' },
  mutedText: { fontSize: 12, color: '#9B8F7C', marginTop: 4 },

  questionBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE6D7',
  },
  questionText: { fontSize: 13, color: '#2B2620', marginBottom: 8 },

  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scaleChip: {
    width: 38,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9CCB8',
    backgroundColor: '#F7F2E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleChipActive: { backgroundColor: '#2B2620', borderColor: '#2B2620' },
  scaleChipText: { fontSize: 13, color: '#6C6255', fontWeight: '600' },
  scaleChipTextActive: { color: '#FFF7E8' },

  scaleHint: { fontSize: 11, color: '#9B8F7C', marginTop: 6 },

  primaryButton: {
    marginTop: 12,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2B2620',
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 14, color: '#FFF7E8', fontWeight: '600' },

  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2620',
    marginBottom: 4,
  },
  resultRow: { marginBottom: 6 },
  resultTitle: { fontSize: 13, color: '#4E4537', fontWeight: '600' },
});
