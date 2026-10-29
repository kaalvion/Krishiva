import { useState, useEffect } from 'react';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';

export type IrrigationAction = 'IRRIGATE_NOW' | 'IRRIGATE_SOON' | 'WAIT_FOR_RAIN' | 'NO_ACTION';
export type IrrigationUrgency = 'high' | 'medium' | 'low' | 'none';

export interface IrrigationPrediction {
  currentSoil: number;
  predicted1h: number;
  predicted3h: number;
  predicted6h: number;
  action: IrrigationAction;
  urgency: IrrigationUrgency;
  message: string;
  computedAt: string;
}

export interface UseLiveIrrigationResult {
  irrigation: IrrigationPrediction | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
}

export function useLiveIrrigation(farmId?: string): UseLiveIrrigationResult {
  const isFocused = useIsScreenFocused();
  const [irrigation, setIrrigation] = useState<IrrigationPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const uid = auth.currentUser?.uid;

  // 1. Load initial cached snapshot
  useEffect(() => {
    if (!uid || !farmId) {
      setIrrigation(null);
      setLoading(false);
      return;
    }

    loadSnapshot<IrrigationPrediction>(uid, 'irrigation', farmId).then((cached) => {
      if (cached && cached.data) {
        setIrrigation((prev) => prev ?? cached.data);
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
      const irrigationDocRef = doc(db, 'farms', farmId, 'ai', 'irrigation');

      unsubscribe = onSnapshot(
        irrigationDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as IrrigationPrediction;
            setIrrigation(data);
            setFromCache(false);
            setLastSyncedAt(new Date().toISOString());
            setError(null);
            saveSnapshot(uid, 'irrigation', data, farmId).catch(() => {});
          } else {
            setIrrigation(null);
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
    irrigation,
    loading,
    error,
    fromCache,
    lastSyncedAt,
  };
}

export default useLiveIrrigation;

