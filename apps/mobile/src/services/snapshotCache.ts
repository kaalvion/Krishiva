import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedSnapshot<T> {
  data: T;
  savedAt: string; // ISO 8601 string
  uid: string;
  farmId?: string;
  queryKey: string;
}

const CACHE_PREFIX = '@krishiva_snapshot:';

function buildKey(uid: string, queryKey: string, farmId?: string): string {
  const farmSegment = farmId && farmId.trim().length > 0 ? farmId : 'global';
  return `${CACHE_PREFIX}${uid}:${farmSegment}:${queryKey}`;
}

/**
 * Persists the result of a successful Firestore query to AsyncStorage.
 * Tokens are never cached.
 */
export async function saveSnapshot<T>(
  uid: string,
  queryKey: string,
  data: T,
  farmId?: string
): Promise<void> {
  if (!uid || data === undefined) return;
  try {
    const key = buildKey(uid, queryKey, farmId);
    const snapshot: CachedSnapshot<T> = {
      data,
      savedAt: new Date().toISOString(),
      uid,
      farmId,
      queryKey,
    };
    await AsyncStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Non-blocking storage exception
  }
}

/**
 * Loads the cached snapshot from AsyncStorage for immediate UI rendering.
 */
export async function loadSnapshot<T>(
  uid: string,
  queryKey: string,
  farmId?: string
): Promise<CachedSnapshot<T> | null> {
  if (!uid) return null;
  try {
    const key = buildKey(uid, queryKey, farmId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedSnapshot<T>;
  } catch {
    return null;
  }
}

/**
 * Clears all cached snapshots belonging to the specified user upon sign-out.
 */
export async function clearUserCache(uid?: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const targetKeys = allKeys.filter((k) =>
      uid ? k.startsWith(`${CACHE_PREFIX}${uid}:`) : k.startsWith(CACHE_PREFIX)
    );
    if (targetKeys.length > 0) {
      await AsyncStorage.multiRemove(targetKeys);
    }
  } catch {
    // Non-blocking cleanup exception
  }
}

