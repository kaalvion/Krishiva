import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n/i18n';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

interface LanguageContextType {
  language: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, options?: any) => string;
}

const LANGUAGE_STORAGE_KEY = '@krishiva_app_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  changeLanguage: async () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'en' || stored === 'hi' || stored === 'mr') {
          setLanguage(stored);
          await i18n.changeLanguage(stored);
        } else {
          setLanguage('en');
          await i18n.changeLanguage('en');
        }
      } catch (err) {
        console.warn('Failed to load stored language', err);
      }
    };
    loadStoredLanguage();
  }, []);

  const changeLanguage = useCallback(async (newLang: SupportedLanguage) => {
    try {
      setLanguage(newLang);
      await i18n.changeLanguage(newLang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (err) {
      console.warn('Failed to persist language selection', err);
    }
  }, []);

  const t = useCallback((key: string, options?: any): string => {
    return String(i18n.t(key, options));
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
