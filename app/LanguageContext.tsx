import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n'; // Импортируем настроенный i18n

export type AppLanguage = 'ua' | 'en';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  loading: boolean;
  t: (key: string, options?: any) => string; // Функция для статических переводов
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t: i18nT } = useTranslation();
  const [language, setLanguageState] = useState<AppLanguage>('ua');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // i18next уже определил язык через наш languageDetector
        const currentLang = i18n.language;
        // Конвертируем 'uk' (i18next) в 'ua' (наш формат)
        const appLang: AppLanguage = currentLang === 'uk' ? 'ua' : 'en';
        setLanguageState(appLang);
      } catch (error) {
        console.log('Error initializing language:', error);
      } finally {
        setLoading(false);
      }
    };

    void initializeLanguage();
  }, []);

  const setLanguage = async (newLang: AppLanguage) => {
    try {
      // Конвертируем 'ua' в 'uk' для i18next
      const i18nLang = newLang === 'ua' ? 'uk' : 'en';
      await i18n.changeLanguage(i18nLang);
      setLanguageState(newLang);
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  // Функция-обертка для i18next translate
  const t = (key: string, options?: any) => {
    return i18nT(key, options);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, loading, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useAppLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useAppLanguage must be used within LanguageProvider');
  }
  return ctx;
}
