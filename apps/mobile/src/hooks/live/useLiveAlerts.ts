import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';
import type { AlertItem, AlertSeverity, AlertType } from '../../types';

export interface UseLiveAlertsResult {
  alerts: AlertItem[];
  unacknowledgedCount: number;
  hasCritical: boolean;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
  refresh: () => void;
  refetch: () => void;
}

export function useLiveAlerts(
  farmId?: string,
  acknowledged?: boolean
): UseLiveAlertsResult {
  const isFocused = useIsScreenFocused();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [tick, setTick] = useState<number>(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const mainUnsubRef = useRef<Unsubscribe | null>(null);
  const countUnsubRef = useRef<Unsubscribe | null>(null);
  const uid = auth.currentUser?.uid;

  // Cache key identifier
  const cacheKey = `alerts_${acknowledged !== undefined ? String(acknowledged) : 'all'}`;

  // Load snapshot cache on mount / farmId change
  useEffect(() => {
    if (!uid || !farmId) {
      setAlerts([]);
      setUnacknowledgedCount(0);
      setLoading(false);
      return;
    }

    loadSnapshot<{ alerts: AlertItem[]; unacknowledgedCount: number }>(
      uid,
      cacheKey,
      farmId
    ).then((cached) => {
      if (cached && cached.data) {
        setAlerts((prev) => (prev.length === 0 ? cached.data.alerts : prev));
        setUnacknowledgedCount(cached.data.unacknowledgedCount ?? 0);
        setFromCache(true);
        setLastSyncedAt(cached.savedAt);
        setLoading(false);
      }
    });
  }, [uid, farmId, cacheKey]);

  useEffect(() => {
    if (!uid || !farmId || !isFocused) {
      if (mainUnsubRef.current) {
        mainUnsubRef.current();
        mainUnsubRef.current = null;
      }
      if (countUnsubRef.current) {
        countUnsubRef.current();
        countUnsubRef.current = null;
      }
      return;
    }

    try {
      const alertsCol = collection(db, 'farms', farmId, 'alerts');

      // 1. Build main query
      let mainQuery = query(alertsCol, orderBy('createdAt', 'desc'), limit(50));
      if (acknowledged !== undefined) {
        mainQuery = query(
          alertsCol,
          where('acknowledged', '==', acknowledged),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      mainUnsubRef.current = onSnapshot(
        mainQuery,
        (snapshot) => {
          const list: AlertItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              deviceId: data.deviceId ?? '',
              deviceName: data.deviceName ?? null,
              type: (data.type as AlertType) ?? 'INFO',
              severity: (data.severity as AlertSeverity) ?? 'info',
              message: data.message ?? '',
              value: data.value ?? null,
              threshold: data.threshold ?? null,
              acknowledged: Boolean(data.acknowledged),
              acknowledgedAt: data.acknowledgedAt ?? null,
              acknowledgedBy: data.acknowledgedBy ?? null,
              createdAt: data.createdAt ?? new Date().toISOString(),
              aiExplanation: data.aiExplanation ?? null,
            };
          });

          setAlerts(list);
          setLoading(false);
          setFromCache(false);
          setError(null);
          const now = new Date().toISOString();
          setLastSyncedAt(now);

          // If querying for unacknowledged, count equals list length
          if (acknowledged === false) {
            setUnacknowledgedCount(list.length);
          }

          saveSnapshot(
            uid,
            cacheKey,
            {
              alerts: list,
              unacknowledgedCount:
                acknowledged === false ? list.length : unacknowledgedCount,
            },
            farmId
          );
        },
        (snapErr) => {
          setError(snapErr);
          setLoading(false);
        }
      );

      // 2. Separate listener for unacknowledged count if not already querying acknowledged == false
      if (acknowledged !== false) {
        const unackQuery = query(
          alertsCol,
          where('acknowledged', '==', false),
          limit(100)
        );

        countUnsubRef.current = onSnapshot(
          unackQuery,
          (snap) => {
            setUnacknowledgedCount(snap.size);
          },
          () => {
            // Non-critical count error ignored
          }
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }

    return () => {
      if (mainUnsubRef.current) {
        mainUnsubRef.current();
        mainUnsubRef.current = null;
      }
      if (countUnsubRef.current) {
        countUnsubRef.current();
        countUnsubRef.current = null;
      }
    };
  }, [uid, farmId, acknowledged, isFocused, cacheKey, tick]);

  const hasCritical = alerts.some((a) => a.severity === 'critical' && !a.acknowledged);

  return {
    alerts,
    unacknowledgedCount,
    hasCritical,
    loading,
    error,
    fromCache,
    lastSyncedAt,
    refresh,
    refetch: refresh,
  };
}
