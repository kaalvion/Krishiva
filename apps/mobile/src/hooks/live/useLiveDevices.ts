import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';
import type { Device, DeviceStatus, DeviceType } from '../../types';

export interface UseLiveDevicesResult {
  devices: Device[];
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
  refresh: () => void;
  refetch: () => void;
}

export function useLiveDevices(farmId?: string): UseLiveDevicesResult {
  const isFocused = useIsScreenFocused();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const uid = auth.currentUser?.uid;

  // Load snapshot cache on mount / farmId change
  useEffect(() => {
    if (!uid || !farmId) {
      setDevices([]);
      setLoading(false);
      return;
    }

    loadSnapshot<Device[]>(uid, 'devices', farmId).then((cached) => {
      if (cached && cached.data) {
        setDevices((prev) => (prev.length === 0 ? cached.data : prev));
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
      const devicesCol = collection(db, 'farms', farmId, 'devices');

      unsubscribeRef.current = onSnapshot(
        devicesCol,
        async (snapshot) => {
          const list: Device[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              nodeId: data.nodeId ?? 0,
              name: data.name ?? `Node #${data.nodeId ?? 0}`,
              type: (data.type as DeviceType) ?? 'sensor',
              status: (data.status as DeviceStatus) ?? 'offline',
              capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
              location: data.location,
              lastSeenAt: data.lastSeenAt,
              firmwareVersion: data.firmwareVersion,
              createdAt: data.createdAt,
            };
          });

          // Sort by nodeId ascending
          list.sort((a, b) => a.nodeId - b.nodeId);

          setDevices(list);
          setLoading(false);
          setFromCache(false);
          setError(null);
          const now = new Date().toISOString();
          setLastSyncedAt(now);

          await saveSnapshot(uid, 'devices', list, farmId);
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
    devices,
    loading,
    error,
    fromCache,
    lastSyncedAt,
    refresh,
    refetch: refresh,
  };
}
