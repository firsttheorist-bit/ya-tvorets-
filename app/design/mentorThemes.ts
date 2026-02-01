// app/design/mentorThemes.ts
import type { MentorId } from '../mentorPhrases';

export type MentorTheme = {
  id: MentorId;
  name: { ua: string; en: string };
  icon: string;
  colors: {
    // Основные цвета
    primary: string;       // Основной акцент (кнопки, активные элементы)
    secondary: string;     // Вторичный акцент (бордеры, иконки)
    tertiary: string;      // Третичный акцент (тонкие акценты)
    
    // Фоны
    background: string;    // Основной фон
    background2: string;   // Вторичный фон (карточки)
    background3: string;   // Третичный фон (вложенные элементы)
    
    // Текст
    text: string;          // Основной текст
    text2: string;         // Вторичный текст (подзаголовки)
    text3: string;         // Третичный текст (плейсхолдеры)
    
    // Состояния
    success: string;       // Успех
    warning: string;       // Предупреждение
    error: string;         // Ошибка
    info: string;          // Информация
    
    // Специальные
    overlay: string;       // Наложение (модалки)
    shadow: string;        // Тень
  };
  typography: {
    fontFamily?: string;
    fontWeightLight: string;
    fontWeightRegular: string;
    fontWeightMedium: string;
    fontWeightBold: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    round: number;
  };
  description: {
    ua: string;
    en: string;
  };
  personality: string[];
};

// Тема для Льва (структура, дисциплина)
const levTheme: MentorTheme = {
  id: 'lev',
  name: { ua: 'Лев', en: 'Lev' },
  icon: '🦁',
  colors: {
    primary: '#2B2620',       // Темно-коричневый (земля, структура)
    secondary: '#C9A14A',     // Золотой (ценность, точность)
    tertiary: '#8B7355',      // Светло-коричневый
    
    background: '#F3F0E8',    // Кремовый (нейтральный фон)
    background2: '#FFFEFA',   // Бежево-белый (карточки)
    background3: '#F8F2DE',   // Светло-желтый (активные элементы)
    
    text: '#2B2620',          // Темно-коричневый
    text2: '#6C6255',         // Серо-коричневый
    text3: '#9B8F7C',         // Светло-коричневый
    
    success: '#6AA56A',       // Зеленый
    warning: '#E8A74F',       // Оранжевый
    error: '#D37B7B',         // Красный
    info: '#5A86C1',          // Синий
    
    overlay: 'rgba(43, 38, 32, 0.7)',
    shadow: 'rgba(43, 38, 32, 0.15)',
  },
  typography: {
    fontWeightLight: '300',
    fontWeightRegular: '400',
    fontWeightMedium: '500',
    fontWeightBold: '700',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 18,
    xl: 24,
    round: 999,
  },
  description: {
    ua: 'Структура и дисциплина. Одна точная действие за раз.',
    en: 'Structure and discipline. One precise action at a time.',
  },
  personality: ['structured', 'precise', 'disciplined', 'grounded'],
};

// Тема для Ланы (мягкость, забота)
const lanaTheme: MentorTheme = {
  id: 'lana',
  name: { ua: 'Лана', en: 'Lana' },
  icon: '🌷',
  colors: {
    primary: '#7C6A5A',       // Теплый серо-коричневый
    secondary: '#D4B5A6',     // Нежно-розовый (забота, мягкость)
    tertiary: '#A8937F',      // Средний коричневый
    
    background: '#FFF9F5',    // Очень светлый розовый
    background2: '#FFFEFC',   // Белый с розовым оттенком
    background3: '#F9F0EB',   // Светло-розовый
    
    text: '#4A3C35',          // Темный теплый коричневый
    text2: '#7C6A5A',         // Средний коричневый
    text3: '#A8937F',         // Светлый коричневый
    
    success: '#8CB68C',       // Мягкий зеленый
    warning: '#E8BFA0',       // Мягкий оранжевый
    error: '#D4A3A3',         // Мягкий красный
    info: '#8FA8D1',          // Мягкий синий
    
    overlay: 'rgba(124, 106, 90, 0.7)',
    shadow: 'rgba(124, 106, 90, 0.1)',
  },
  typography: {
    fontWeightLight: '300',
    fontWeightRegular: '400',
    fontWeightMedium: '500',
    fontWeightBold: '600',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 28,
    xxl: 36,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    round: 999,
  },
  description: {
    ua: 'Мягкость и забота. Движение через принятие.',
    en: 'Gentleness and care. Movement through acceptance.',
  },
  personality: ['gentle', 'caring', 'accepting', 'nurturing'],
};

// Тема для Bro (энергия, мотивация)
const broTheme: MentorTheme = {
  id: 'bro',
  name: { ua: 'Bro', en: 'Bro' },
  icon: '💪',
  colors: {
    primary: '#1A3A5F',       // Темно-синий (сила, уверенность)
    secondary: '#4A90E2',     // Ярко-синий (энергия, действие)
    tertiary: '#2A5C9A',      // Средний синий
    
    background: '#F0F5FF',    // Очень светлый синий
    background2: '#FFFFFF',   // Чистый белый
    background3: '#E6F0FF',   // Светло-синий
    
    text: '#1A3A5F',          // Темно-синий
    text2: '#4A6572',         // Серо-синий
    text3: '#7A8FA6',         // Светло-синий
    
    success: '#5CB85C',       // Яркий зеленый
    warning: '#F0AD4E',       // Яркий оранжевый
    error: '#D9534F',         // Яркий красный
    info: '#5BC0DE',          // Голубой
    
    overlay: 'rgba(26, 58, 95, 0.7)',
    shadow: 'rgba(26, 58, 95, 0.15)',
  },
  typography: {
    fontWeightLight: '400',
    fontWeightRegular: '500',
    fontWeightMedium: '600',
    fontWeightBold: '800',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  },
  description: {
    ua: 'Энергия и прямота. Движение через действие.',
    en: 'Energy and directness. Movement through action.',
  },
  personality: ['energetic', 'direct', 'motivating', 'focused'],
};

// Тема для Катаны (минимализм, резкость)
const katanaTheme: MentorTheme = {
  id: 'katana',
  name: { ua: 'Катана', en: 'Katana' },
  icon: '🗡️',
  colors: {
    primary: '#2C2C2C',       // Чистый черный (минимализм)
    secondary: '#666666',     // Серый (нейтральность)
    tertiary: '#4A4A4A',      // Темно-серый
    
    background: '#F5F5F5',    // Светло-серый
    background2: '#FFFFFF',   // Чистый белый
    background3: '#EAEAEA',   // Средний серый
    
    text: '#2C2C2C',          // Черный
    text2: '#666666',         // Серый
    text3: '#999999',         // Светло-серый
    
    success: '#5A8C5A',       // Приглушенный зеленый
    warning: '#B58C5A',       // Приглушенный оранжевый
    error: '#8C5A5A',         // Приглушенный красный
    info: '#5A7A8C',          // Приглушенный синий
    
    overlay: 'rgba(44, 44, 44, 0.7)',
    shadow: 'rgba(44, 44, 44, 0.1)',
  },
  typography: {
    fontWeightLight: '300',
    fontWeightRegular: '400',
    fontWeightMedium: '500',
    fontWeightBold: '600',
  },
  spacing: {
    xs: 2,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    xxl: 28,
  },
  borderRadius: {
    sm: 0,
    md: 4,
    lg: 8,
    xl: 12,
    round: 999,
  },
  description: {
    ua: 'Минимализм и резкость. Чистое действие без шума.',
    en: 'Minimalism and sharpness. Clean action without noise.',
  },
  personality: ['minimalist', 'sharp', 'precise', 'clean'],
};

// Экспорт всех тем
export const mentorThemes: Record<MentorId, MentorTheme> = {
  lev: levTheme,
  lana: lanaTheme,
  bro: broTheme,
  katana: katanaTheme,
};

// Хук для использования темы
import { useAppLanguage } from '../LanguageContext';

export function useMentorTheme(mentorId: MentorId = 'lev') {
  const { language } = useAppLanguage();
  const theme = mentorThemes[mentorId];
  
  // Функция для получения локализованного имени
  const getName = () => theme.name[language === 'ua' ? 'ua' : 'en'];
  
  // Функция для получения локализованного описания
  const getDescription = () => theme.description[language === 'ua' ? 'ua' : 'en'];
  
  // Создаем готовые стили на основе темы
  const styles = {
    container: {
      backgroundColor: theme.colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    card: {
      backgroundColor: theme.colors.background2,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.secondary + '20', // 20 = 12% opacity
      padding: theme.spacing.md,
      marginVertical: theme.spacing.sm,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: theme.typography.fontWeightMedium,
      fontSize: 14,
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: theme.typography.fontWeightBold,
    },
    subtitle: {
      color: theme.colors.text2,
      fontSize: 16,
      fontWeight: theme.typography.fontWeightRegular,
    },
    text: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: theme.typography.fontWeightRegular,
    },
    mutedText: {
      color: theme.colors.text3,
      fontSize: 12,
      fontWeight: theme.typography.fontWeightLight,
    },
  };
  
  return {
    theme,
    styles,
    getName,
    getDescription,
    // Утилиты для быстрого доступа
    colors: theme.colors,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    typography: theme.typography,
  };
}

// Хук для использования темы текущего ментора из состояния приложения
export function useCurrentMentorTheme() {
  // В будущем здесь можно получить текущего ментора из глобального состояния
  // Пока используем по умолчанию 'lev'
  return useMentorTheme('lev');
}
