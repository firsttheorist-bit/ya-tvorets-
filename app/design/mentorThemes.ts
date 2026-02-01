// app/design/mentorThemes.ts
import type { MentorId } from '../mentorPhrases';

export type MentorTheme = {
  id: MentorId;
  name: { ua: string; en: string };
  description: { ua: string; en: string };
  icon: string;
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    background: string;
    background2: string;
    background3: string;
    text: string;
    text2: string;
    text3: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  personality: string[];
};

const levTheme: MentorTheme = {
  id: 'lev',
  name: { ua: 'Лев', en: 'Lev' },
  description: {
    ua: 'Спокійна системність, фокус на маленьких кроках і стратегії.',
    en: 'Calm systems, focus on small steps and strategy.',
  },
  icon: '🦁',
  colors: {
    primary: '#2B2620',
    secondary: '#C9A14A',
    tertiary: '#8B7355',
    background: '#F3F0E8',
    background2: '#FFFEFA',
    background3: '#F8F2DE',
    text: '#2B2620',
    text2: '#6C6255',
    text3: '#9B8F7C',
    success: '#6AA56A',
    warning: '#E8A74F',
    error: '#D37B7B',
    info: '#5A86C1',
  },
  personality: ['структурний', 'точний', 'дисциплінований'],
};

const lanaTheme: MentorTheme = {
  id: 'lana',
  name: { ua: 'Лана', en: 'Lana' },
  description: {
    ua: 'Мʼяка підтримка, емпатія та турбота до себе без самобичування.',
    en: 'Soft support, empathy and self-care without self-blame.',
  },
  icon: '🌷',
  colors: {
    primary: '#7C6A5A',
    secondary: '#D4B5A6',
    tertiary: '#A8937F',
    background: '#FFF9F5',
    background2: '#FFFEFC',
    background3: '#F9F0EB',
    text: '#4A3C35',
    text2: '#7C6A5A',
    text3: '#A8937F',
    success: '#8CB68C',
    warning: '#E8BFA0',
    error: '#D4A3A3',
    info: '#8FA8D1',
  },
  personality: ['ніжний', 'турботливий', 'приймаючий'],
};

const broTheme: MentorTheme = {
  id: 'bro',
  name: { ua: 'Bro', en: 'Bro' },
  description: {
    ua: 'Прямо, по-дружньому, без пафосу. Мінімум теорії, максимум дії.',
    en: 'Direct, friendly, no fluff. Less theory, more action.',
  },
  icon: '💪',
  colors: {
    primary: '#1A3A5F',
    secondary: '#4A90E2',
    tertiary: '#2A5C9A',
    background: '#F0F5FF',
    background2: '#FFFFFF',
    background3: '#E6F0FF',
    text: '#1A3A5F',
    text2: '#4A6572',
    text3: '#7A8FA6',
    success: '#5CB85C',
    warning: '#F0AD4E',
    error: '#D9534F',
    info: '#5BC0DE',
  },
  personality: ['енергійний', 'прямий', 'мотивуючий'],
};

const katanaTheme: MentorTheme = {
  id: 'katana',
  name: { ua: 'Катана', en: 'Katana' },
  description: {
    ua: 'Точність, структура, «обрізання» зайвого та фокус на головному.',
    en: 'Precision, structure, cutting the noise and focus on what matters.',
  },
  icon: '🗡️',
  colors: {
    primary: '#2C2C2C',
    secondary: '#666666',
    tertiary: '#4A4A4A',
    background: '#F5F5F5',
    background2: '#FFFFFF',
    background3: '#EAEAEA',
    text: '#2C2C2C',
    text2: '#666666',
    text3: '#999999',
    success: '#5A8C5A',
    warning: '#B58C5A',
    error: '#8C5A5A',
    info: '#5A7A8C',
  },
  personality: ['мінімалістичний', 'різкий', 'точний'],
};

export const mentorThemes: Record<MentorId, MentorTheme> = {
  lev: levTheme,
  lana: lanaTheme,
  bro: broTheme,
  katana: katanaTheme,
};

// Хук для использования темы ментора
export function useMentorTheme(mentorId: MentorId = 'lev') {
  const theme = mentorThemes[mentorId];
  
  return {
    theme,
    colors: theme.colors,
    // Готовые стили
    cardStyle: {
      backgroundColor: theme.colors.background2,
      borderColor: theme.colors.secondary + '20',
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
    },
    buttonStyle: {
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    buttonTextStyle: {
      color: '#FFF7E8',
      fontWeight: '600',
      fontSize: 13,
    },
    textStyle: {
      color: theme.colors.text,
      fontSize: 13,
    },
    titleStyle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    mentorCardStyle: {
      backgroundColor: theme.colors.background2,
      borderColor: theme.colors.secondary + '40',
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
    },
    mentorCardActiveStyle: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.background3,
    },
  };
}
