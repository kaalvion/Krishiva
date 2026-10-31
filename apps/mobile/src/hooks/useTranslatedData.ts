import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { translateText, shouldSkipTranslation, TargetLanguage } from '../services/translationService';

/**
 * Technical keys whose values should never be translated (IDs, MACs, timestamps, URLs, etc.)
 */
const SKIP_KEYS = new Set([
  'id',
  'deviceid',
  'farmid',
  'scheduleid',
  'commandid',
  'mac',
  'nodeid',
  'uid',
  'userid',
  'token',
  'url',
  'createdat',
  'updatedat',
  'lastseenat',
  'timestamp',
  'action',
  'status',
]);

async function deepTranslate<T>(item: T, targetLang: TargetLanguage): Promise<T> {
  if (item === null || item === undefined) {
    return item;
  }

  if (typeof item === 'string') {
    if (shouldSkipTranslation(item)) {
      return item;
    }
    const res = await translateText(item, targetLang);
    return res as unknown as T;
  }

  if (Array.isArray(item)) {
    const translatedArray = await Promise.all(
      item.map((el) => deepTranslate(el, targetLang))
    );
    return translatedArray as unknown as T;
  }

  if (typeof item === 'object') {
    const result: Record<string, any> = {};
    const entries = Object.entries(item as Record<string, any>);

    await Promise.all(
      entries.map(async ([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (SKIP_KEYS.has(lowerKey) || lowerKey.endsWith('id')) {
          result[key] = value;
        } else {
          result[key] = await deepTranslate(value, targetLang);
        }
      })
    );

    return result as T;
  }

  return item;
}

/**
 * Reactive hook that automatically translates objects or arrays into the current app language.
 * When language is 'en', returns raw data immediately with zero overhead.
 */
export function useTranslatedData<T>(data: T): T {
  const { language } = useLanguage();
  const [translatedData, setTranslatedData] = useState<T>(data);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (language === 'en' || !data) {
      setTranslatedData(data);
      return;
    }

    let isMounted = true;

    deepTranslate(data, language).then((result) => {
      if (isMounted) {
        setTranslatedData(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [data, language]);

  return language === 'en' ? data : translatedData;
}
