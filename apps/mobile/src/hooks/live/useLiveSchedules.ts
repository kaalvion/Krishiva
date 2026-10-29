import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';
import type { Schedule, ActuatorAction, ScheduleDays, ScheduleRunStatus } from '../../types';

export interface UseLiveSchedulesResult {
  schedules: Schedule[];
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
  refresh: () => void;
  refetch: () => void;
}

export function useLiveSchedules(farmId?: string): UseLiveSchedulesResult {
  const isFocused = useIsScreenFocused();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [tick, setTick] = useState<number>(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const uid = auth.currentUser?.uid;

  // Load snapshot cache on mount / farmId change
  useEffect(() => {
    if (!uid || !farmId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    loadSnapshot<Schedule[]>(uid, 'schedules', farmId).then((cached) => {
      if (cached && cached.data) {
        setSchedules((prev) => (prev.length === 0 ? cached.data : prev));
        setFromCache(true);
        setLastSyncedAt(cached.savedAt);
        setLoading(false);
      }
    });
  }, [uid, farmId]);

  useEffect(() => {
    if (!uid || !farmId || !isFocused) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    try {
      const schedCol = collection(db, 'farms', farmId, 'schedules');

      unsubscribeRef.current = onSnapshot(
        schedCol,
        async (snapshot) => {
          const list: Schedule[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              farmId,
              deviceId: data.deviceId ?? '',
              action: (data.action as ActuatorAction) ?? 'PUMP_ON',
              time: data.time ?? '00:00',
              days: (data.days as ScheduleDays) ?? 'daily',
              durationSeconds: data.durationSeconds ?? null,
              enabled: Boolean(data.enabled),
              name: data.name,
              lastRunAt: data.lastRunAt ?? null,
              lastRunStatus: (data.lastRunStatus as ScheduleRunStatus) ?? null,
              lastRunCommandId: data.lastRunCommandId ?? null,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          });

          // Sort by time ascending
          list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

          setSchedules(list);
          setLoading(false);
          setFromCache(false);
          setError(null);
          const now = new Date().toISOString();
          setLastSyncedAt(now);

          await saveSnapshot(uid, 'schedules', list, farmId);
        },
        (snapErr) => {
          setError(snapErr);
          setLoading(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [uid, farmId, isFocused, tick]);

  return {
    schedules,
    loading,
    error,
    fromCache,
    lastSyncedAt,
    refresh,
    refetch: refresh,
  };
}
