import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';
import { toMillis } from '../../utils/freshness';
import type { Device, CommandRecord, ActuatorAction, CommandStatus } from '../../types';

export interface UseRecentCommandsResult {
  commands: CommandRecord[];
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
  refetch: () => void;
  refresh: () => void;
}

export function useRecentCommands(
  farmId?: string,
  devices: Device[] = []
): UseRecentCommandsResult {
  const isFocused = useIsScreenFocused();
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const unsubsRef = useRef<Record<string, Unsubscribe>>({});
  const deviceCommandsMapRef = useRef<Record<string, CommandRecord[]>>({});
  const uid = auth.currentUser?.uid;

  // Load snapshot cache on mount / farmId change
  useEffect(() => {
    if (!uid || !farmId) {
      setCommands([]);
      setLoading(false);
      return;
    }

    loadSnapshot<CommandRecord[]>(uid, 'recent_commands', farmId).then((cached) => {
      if (cached && cached.data) {
        setCommands((prev) => (prev.length === 0 ? cached.data : prev));
        setFromCache(true);
        setLastSyncedAt(cached.savedAt);
        setLoading(false);
      }
    });
  }, [uid, farmId]);

  const mergeAndEmit = useCallback(() => {
    const all = Object.values(deviceCommandsMapRef.current).flat();
    all.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    const newest50 = all.slice(0, 50);

    setCommands(newest50);
    setLoading(false);
    setFromCache(false);
    setError(null);
    const now = new Date().toISOString();
    setLastSyncedAt(now);

    if (uid && farmId) {
      saveSnapshot(uid, 'recent_commands', newest50, farmId);
    }
  }, [uid, farmId]);

  useEffect(() => {
    if (!uid || !farmId || !isFocused || devices.length === 0) {
      Object.values(unsubsRef.current).forEach((unsub) => unsub());
      unsubsRef.current = {};
      if (devices.length === 0) {
        setLoading(false);
      }
      return;
    }

    const currentDeviceIds = new Set(devices.map((d) => d.id));
    const activeListenerIds = new Set(Object.keys(unsubsRef.current));

    // Cleanup listeners for removed devices
    for (const devId of activeListenerIds) {
      if (!currentDeviceIds.has(devId)) {
        unsubsRef.current[devId]?.();
        delete unsubsRef.current[devId];
        delete deviceCommandsMapRef.current[devId];
      }
    }

    // Attach listeners for new devices (each device commands collection ordered by createdAt desc limit 20)
    for (const dev of devices) {
      if (unsubsRef.current[dev.id]) {
        continue;
      }

      try {
        const cmdCol = collection(
          db,
          'farms',
          farmId,
          'devices',
          dev.id,
          'commands'
        );
        const q = query(cmdCol, orderBy('createdAt', 'desc'), limit(20));

        unsubsRef.current[dev.id] = onSnapshot(
          q,
          (snapshot) => {
            const devCmds: CommandRecord[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                commandId: data.commandId ?? docSnap.id,
                farmId,
                deviceId: dev.id,
                action: (data.action as ActuatorAction) ?? 'PUMP_ON',
                status: (data.status as CommandStatus) ?? 'pending',
                requestedBy: data.requestedBy ?? '',
                source: data.source,
                durationSeconds: data.durationSeconds ?? null,
                createdAt: data.createdAt ?? new Date().toISOString(),
                publishedAt: data.publishedAt ?? null,
                acknowledgedAt: data.acknowledgedAt ?? null,
                error: data.error ?? null,
              };
            });

            deviceCommandsMapRef.current[dev.id] = devCmds;
            mergeAndEmit();
          },
          (err) => {
            setError(err);
            setLoading(false);
          }
        );
      } catch (subErr) {
        setError(subErr instanceof Error ? subErr : new Error(String(subErr)));
        setLoading(false);
      }
    }

    return () => {
      Object.values(unsubsRef.current).forEach((unsub) => unsub());
      unsubsRef.current = {};
    };
  }, [uid, farmId, isFocused, devices, mergeAndEmit]);

  const refetch = useCallback(() => {
    mergeAndEmit();
  }, [mergeAndEmit]);

  return {
    commands,
    loading,
    error,
    fromCache,
    lastSyncedAt,
    refetch,
    refresh: refetch,
  };
}
