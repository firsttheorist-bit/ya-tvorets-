import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Импорты переводов
import enCommon from './locales/en/common.json';
import ukCommon from './locales/uk/common.json';
import enJournal from './locales/en/journal.json';
import ukJournal from './locales/uk/journal.json';

// Типы для TypeScript
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      journal: typeof enJournal;
    };
  }
}

const resources = {
  en: {
    common: enCommon,
    journal: enJournal,
  },
  uk: {
    common: ukCommon,
    journal: ukJournal,
  },
};

// Ключ для AsyncStorage (совместим с твоим текущим)
const LANGUAGE_STORAGE_KEY = '@ya_tvorets_language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // 1. Проверяем сохраненный язык (твой ключ)
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage === 'ua' || savedLanguage === 'en') {
        // i18next использует 'uk' для украинского
        callback(savedLanguage === 'ua' ? 'uk' : 'en');
        return;
      }

      // 2. Определяем язык устройства
      const deviceLanguage = Localization.locale.split('-')[0];
      callback(deviceLanguage === 'uk' ? 'uk' : 'en');
    } catch (error) {
      console.log('Error detecting language:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      // Сохраняем в твой ключ (конвертируем 'uk' обратно в 'ua')
      const appLanguage = language === 'uk' ? 'ua' : 'en';
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, appLanguage);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3', // важно для React Native
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'journal'],
    interpolation: {
      escapeValue: false, // React Native безопасен
    },
    react: {
      useSuspense: false, // React Native не поддерживает Suspense для i18next
    },
  });

export default i18n;
