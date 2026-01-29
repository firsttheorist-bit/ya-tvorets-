// app/data/challengesCatalog.ts
import type { TraitKey } from '../mentorPhrases';

export type ChallengeComplexity = 'easy' | 'medium' | 'hard';

export type ChallengeDefinition = {
  id: string;
  trait: TraitKey | null;
  titleUa: string;
  titleEn: string;
  descriptionUa: string;
  descriptionEn: string;
  complexity: ChallengeComplexity;
};

export const BASE_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'ch_focus_1',
    trait: 'focus',
    titleUa: '10 хвилин чистого фокусу',
    titleEn: '10 minutes of pure focus',
    descriptionUa:
      'Обери одну справу й працюй над нею 10 хвилин без телефону, сповіщень і перемикань.',
    descriptionEn:
      'Pick one task and work on it for 10 minutes without phone, notifications, or switching.',
    complexity: 'easy',
  },
  {
    id: 'ch_focus_2',
    trait: 'focus',
    titleUa: 'Зачистка вкладок',
    titleEn: 'Tab clean-up',
    descriptionUa:
      'Закрий 3–5 зайвих вкладок або додатків, які крадуть твою увагу, і доведи одну справу до кінця.',
    descriptionEn:
      'Close 3–5 unnecessary tabs/apps that steal your attention and finish one task to the end.',
    complexity: 'medium',
  },
  {
    id: 'ch_calm_1',
    trait: 'calm',
    titleUa: 'Мʼяка пауза для нервової системи',
    titleEn: 'Soft pause for your nervous system',
    descriptionUa:
      'Зроби 5 глибоких повільних вдихів і видихів, спостерігаючи за тілом, а не за думками.',
    descriptionEn:
      'Take 5 deep, slow breaths, watching your body instead of your thoughts.',
    complexity: 'easy',
  },
  {
    id: 'ch_confidence_1',
    trait: 'confidence',
    titleUa: 'Маленький крок у “стрьомну” зону',
    titleEn: 'Small step into the “scary” zone',
    descriptionUa:
      'Зроби одну дію, яку давно відкладаєш через сумніви: коротке повідомлення, запит, відповідь.',
    descriptionEn:
      'Do one action you have been postponing because of doubts: a short message, a question, a reply.',
    complexity: 'medium',
  },
  {
    id: 'ch_discipline_1',
    trait: 'discipline',
    titleUa: 'Закрити один хвіст',
    titleEn: 'Close one loose end',
    descriptionUa:
      'Обери один “хвіст”, який давно висить, і доведи його до кінця в мінімальному форматі.',
    descriptionEn:
      'Pick one lingering “loose end” and finish it fully, even in the smallest possible format.',
    complexity: 'medium',
  },
  {
    id: 'ch_creativity_1',
    trait: 'creativity',
    titleUa: '10 хвилин чесної творчості',
    titleEn: '10 minutes of honest creativity',
    descriptionUa:
      'Виділи 10 хвилин на творчість без оцінки: запис ідей, ескіз, чорновик — тільки рух.',
    descriptionEn:
      'Spend 10 minutes on creativity without judging: idea dump, sketch, draft — just movement.',
    complexity: 'easy',
  },
  {
    id: 'ch_empathy_1',
    trait: 'empathy',
    titleUa: 'Одна тепла дія',
    titleEn: 'One warm action',
    descriptionUa:
      'Зроби одну маленьку дію підтримки: для себе чи іншої людини. Без пафосу, просто по-людськи.',
    descriptionEn:
      'Do one small act of support: for yourself or someone else. No pathos, just human.',
    complexity: 'easy',
  },
];
