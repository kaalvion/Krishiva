import { useState, useEffect } from 'react';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';

export interface FarmBrief {
  headline: string;
  body: string;
  actionNow: string;
  urgency: 'low' | 'medium' | 'high';
  generatedAt: string;
  model: string;
  cachedUntil: string;
}

export interface UseLiveBriefResult {
  brief: FarmBrief | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
}

export function useLiveBrief(farmId?: string): UseLiveBriefResult {
  const isFocused = useIsScreenFocused();
  const [brief, setBrief] = useState<FarmBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const uid = auth.currentUser?.uid;

  // 1. Load initial cached snapshot
  useEffect(() => {
    if (!uid || !farmId) {
      setBrief(null);
      setLoading(false);
      return;
    }

    loadSnapshot<FarmBrief>(uid, 'brief', farmId).then((cached) => {
      if (cached && cached.data) {
        setBrief((prev) => prev ?? cached.data);
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
      const briefDocRef = doc(db, 'farms', farmId, 'ai', 'brief');

      unsubscribe = onSnapshot(
        briefDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as FarmBrief;
            setBrief(data);
            setFromCache(false);
            setLastSyncedAt(new Date().toISOString());
            setError(null);
            saveSnapshot(uid, 'brief', data, farmId).catch(() => {});
          } else {
            setBrief(null);
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
    brief,
    loading,
    error,
    fromCache,
    lastSyncedAt,
  };
}

export default useLiveBrief;
