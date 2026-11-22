'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, TranslationDictionary, SUPPORTED_LANGUAGES } from './types';
import { translations, getTranslation } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDictionary, params?: Record<string, string | number>) => string;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => translations.en[key] || String(key),
  isReady: false,
});

export const LANGUAGE_STORAGE_KEY = 'tableqr_user_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'bn')) {
        setLanguageState(saved);
      }
    } catch {
      // localStorage may fail in private mode
    } finally {
      setIsReady(true);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignored
    }
  }, []);

  const t = useCallback(
    (key: keyof TranslationDictionary, params?: Record<string, string | number>) => {
      return getTranslation(language, key, params);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
