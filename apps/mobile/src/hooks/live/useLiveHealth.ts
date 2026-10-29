import { useState, useEffect } from 'react';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';

export interface FarmHealth {
  score: number;
  color: 'green' | 'yellow' | 'red';
  reasons: string[];
  source: string;
  evaluatedAt: string;
  metrics?: {
    soilMoisture?: number | null;
    temperature?: number | null;
    humidity?: number | null;
    deviceCount: number;
    onlineDeviceCount: number;
    unacknowledgedAlertCount: number;
  };
}

export interface UseLiveHealthResult {
  health: FarmHealth | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
}

export function useLiveHealth(farmId?: string): UseLiveHealthResult {
  const isFocused = useIsScreenFocused();
  const [health, setHealth] = useState<FarmHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const uid = auth.currentUser?.uid;

  // 1. Load initial cached snapshot
  useEffect(() => {
    if (!uid || !farmId) {
      setHealth(null);
      setLoading(false);
      return;
    }

    loadSnapshot<FarmHealth>(uid, 'health', farmId).then((cached) => {
      if (cached && cached.data) {
        setHealth((prev) => prev ?? cached.data);
        setFromCache(true);
        setLastSyncedAt(cached.savedAt);
        setLoading(false);
      }
    });
  }, [uid, farmId]);

  // 2. Real-time Firestore onSnapshot listener
  useEffect(() => {
    if (!uid || !farmId || !isFocused) {
      return;
    }

    let unsubscribe: Unsubscribe | null = null;

    try {
      const healthDocRef = doc(db, 'farms', farmId, 'ai', 'health');

      unsubscribe = onSnapshot(
        healthDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as FarmHealth;
            setHealth(data);
            setFromCache(false);
            setLastSyncedAt(new Date().toISOString());
            setError(null);
            saveSnapshot(uid, 'health', data, farmId).catch(() => {});
          } else {
            setHealth(null);
          }
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
    } catch (err: any) {
      setError(err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [uid, farmId, isFocused]);

  return {
    health,
    loading,
    error,
    fromCache,
    lastSyncedAt,
  };
}

export default useLiveHealth;
