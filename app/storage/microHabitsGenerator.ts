// app/storage/microHabitsGenerator.ts
import type { TraitKey } from '../mentorPhrases';

export type MicroHabit = {
  id: string;
  trait: TraitKey | null;
  titleUa: string;
  titleEn: string;
  descriptionUa: string;
  descriptionEn: string;
  intentUa: string;
  intentEn: string;
};

const HABITS: Record<TraitKey, MicroHabit[]> = {
  focus: [
    {
      id: 'focus_1',
      trait: 'focus',
      titleUa: '10 хвилин одного фокусу',
      titleEn: '10 minutes of single focus',
      descriptionUa: 'Постав таймер на 10 хвилин і роби лише одну дію.',
      descriptionEn: 'Set a 10-minute timer and do only one task.',
      intentUa: 'Повернути контроль над увагою',
      intentEn: 'Regain control over attention',
    },
  ],
  calm: [
    {
      id: 'calm_1',
      trait: 'calm',
      titleUa: '1 хвилина дихання',
      titleEn: '1 minute of breathing',
      descriptionUa: 'Повільний вдих на 4, видих на 6 — 6 разів.',
      descriptionEn: 'Slow inhale 4, exhale 6 — 6 times.',
      intentUa: 'Знизити напругу',
      intentEn: 'Lower tension',
    },
  ],
  confidence: [
    {
      id: 'confidence_1',
      trait: 'confidence',
      titleUa: 'Один сміливий мікрокрок',
      titleEn: 'One brave micro-step',
      descriptionUa: 'Зроби маленьку дію, яку зазвичай відкладаєш.',
      descriptionEn: 'Do one small action you usually postpone.',
      intentUa: 'Підкріпити відчуття спроможності',
      intentEn: 'Reinforce self-efficacy',
    },
  ],
  discipline: [
    {
      id: 'discipline_1',
      trait: 'discipline',
      titleUa: 'Мінімум, але сьогодні',
      titleEn: 'Minimum, but today',
      descriptionUa: 'Зроби найменшу версію корисної звички.',
      descriptionEn: 'Do the smallest version of a useful habit.',
      intentUa: 'Підтримати послідовність',
      intentEn: 'Maintain consistency',
    },
  ],
  creativity: [
    {
      id: 'creativity_1',
      trait: 'creativity',
      titleUa: '5 хвилин без мети',
      titleEn: '5 minutes without a goal',
      descriptionUa: 'Малюй, пиши або думай без результату.',
      descriptionEn: 'Draw, write, or think without outcome.',
      intentUa: 'Зняти внутрішній тиск',
      intentEn: 'Release inner pressure',
    },
  ],
  empathy: [
    {
      id: 'empathy_1',
      trait: 'empathy',
      titleUa: 'Тепле повідомлення',
      titleEn: 'Warm message',
      descriptionUa: 'Напиши коротке добре повідомлення людині.',
      descriptionEn: 'Send a short kind message to someone.',
      intentUa: 'Підсилити звʼязок',
      intentEn: 'Strengthen connection',
    },
  ],
};

export function generateMicroHabit(mainGrowth: TraitKey | null): MicroHabit {
  if (!mainGrowth || !HABITS[mainGrowth]?.length) {
    return {
      id: 'neutral_1',
      trait: null,
      titleUa: 'Мʼяка пауза',
      titleEn: 'Gentle pause',
      descriptionUa: 'Зроби 3 повільні вдихи.',
      descriptionEn: 'Take 3 slow breaths.',
      intentUa: 'Заземлитися',
      intentEn: 'Ground yourself',
    };
  }

  return HABITS[mainGrowth][0];
}
