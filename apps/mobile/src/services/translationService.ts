import AsyncStorage from '@react-native-async-storage/async-storage';

export type TargetLanguage = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'pa' | 'bn';

// Memory cache to avoid repeated asynchronous disk lookups
const memoryCache = new Map<string, string>();

/**
 * Regex patterns for text that should NEVER be translated:
 * - Pure numbers / decimals
 * - ISO dates and common date formats (YYYY-MM-DD, DD/MM/YYYY)
 * - Times (12:30, 04:15 PM)
 * - IP addresses (192.168.1.1:3000)
 * - MAC addresses (F0:24:F9:0D:B7:48)
 * - Common IDs, hex tokens, booleans, and whitespace
 */
export const SKIP_PATTERNS = [
  /^\s*$/,
  /^[0-9]+(\.[0-9]+)?(%|°[CF]|s|ms|min|m|h|km|kg|L|ml|hPa|ppm)?$/i,
  /^\d{4}[-/]\d{2}[-/]\d{2}(T|\s)\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?$/i,
  /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
  /^\d{1,2}:\d{2}(:\d{2})?(\s?[APap][Mm])?$/,
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  /^(true|false|null|undefined)$/i,
  /^(http|https):\/\/[^ "]+$/,
];

export function shouldSkipTranslation(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length <= 1) return true;
  return SKIP_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function getCacheKey(targetLang: TargetLanguage, text: string): string {
  // Truncate or clean key for safe AsyncStorage storage
  const clean = text.trim().slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_');
  return `tr_${targetLang}_${clean}`;
}

/**
 * Translates a single text string with cascading free API fallbacks and AsyncStorage caching.
 */
export async function translateText(
  text: string,
  targetLang: TargetLanguage
): Promise<string> {
  if (!text || targetLang === 'en' || shouldSkipTranslation(text)) {
    return text;
  }

  const trimmed = text.trim();
  const cacheKey = getCacheKey(targetLang, trimmed);

  // 1. Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check AsyncStorage persistent cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      memoryCache.set(cacheKey, cached);
      return cached;
    }
  } catch {
    // Continue to network fetch
  }

  let translated: string | null = null;

  // 3. Fallback 1: LibreTranslate free public API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: trimmed,
        source: 'en',
        target: targetLang,
        format: 'text',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.translatedText === 'string') {
        translated = data.translatedText;
      }
    }
  } catch {
    // Fall through to MyMemory
  }

  // 4. Fallback 2: MyMemory API (Keyless free tier)
  if (!translated) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        trimmed
      )}&langpair=en|${targetLang}`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const candidate = data?.responseData?.translatedText;
        if (
          candidate &&
          typeof candidate === 'string' &&
          !candidate.toUpperCase().includes('MYMEMORY') &&
          !candidate.toUpperCase().includes('QUERY LENGTH LIMIT')
        ) {
          translated = candidate;
        }
      }
    } catch {
      // Fall through
    }
  }

  // If translation succeeded, persist to caches
  if (translated) {
    memoryCache.set(cacheKey, translated);
    try {
      await AsyncStorage.setItem(cacheKey, translated);
    } catch {
      // Ignore cache write error
    }
    return translated;
  }

  // Graceful fallback to original text if both services fail
  return text;
}

