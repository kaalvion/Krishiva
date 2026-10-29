import { useState, useEffect, useRef } from 'react';
import {
  doc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';
import type { Device, DeviceReading } from '../../types';

export interface UseLiveLatestResult {
  readings: Record<string, DeviceReading>;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
}

export function useLiveLatest(
  farmId?: string,
  devices: Device[] = []
): UseLiveLatestResult {
  const isFocused = useIsScreenFocused();
  const [readings, setReadings] = useState<Record<string, DeviceReading>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const unsubsRef = useRef<Record<string, Unsubscribe>>({});
  const uid = auth.currentUser?.uid;

  // Load snapshot cache on mount / farmId change
  useEffect(() => {
    if (!uid || !farmId) {
      setReadings({});
      setLoading(false);
      return;
    }

    loadSnapshot<Record<string, DeviceReading>>(uid, 'latest_readings', farmId).then(
      (cached) => {
        if (cached && cached.data) {
          setReadings((prev) =>
            Object.keys(prev).length === 0 ? cached.data : prev
          );
          setFromCache(true);
          setLastSyncedAt(cached.savedAt);
          setLoading(false);
        }
      }
    );
  }, [uid, farmId]);

  useEffect(() => {
    // If not focused or no farm, clean up all active listeners
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

    // Remove listeners for devices no longer present
    for (const devId of activeListenerIds) {
      if (!currentDeviceIds.has(devId)) {
        unsubsRef.current[devId]?.();
        delete unsubsRef.current[devId];
      }
    }

    // Attach listeners for new devices
    for (const dev of devices) {
      if (unsubsRef.current[dev.id]) {
        continue; // Already listening
      }

      try {
        const latestDocRef = doc(
          db,
          'farms',
          farmId,
          'devices',
          dev.id,
          'latest',
          'current'
        );

        unsubsRef.current[dev.id] = onSnapshot(
          latestDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const reading: DeviceReading = {
                deviceId: dev.id,
                nodeId: data.nodeId ?? dev.nodeId,
                temperature: data.temperature ?? null,
                humidity: data.humidity ?? null,
                soilMoisture: data.soilMoisture ?? null,
                recordedAt: data.recordedAt ?? null,
                receivedAt: data.receivedAt ?? null,
                status: data.status,
                seq: data.seq,
              };

              setReadings((prev) => {
                const next = { ...prev, [dev.id]: reading };
                saveSnapshot(uid, 'latest_readings', next, farmId);
                return next;
              });
            } else {
              // No reading yet for this device
              setReadings((prev) => {
                const next = {
                  ...prev,
                  [dev.id]: {
                    deviceId: dev.id,
                    nodeId: dev.nodeId,
                    temperature: null,
                    humidity: null,
                    soilMoisture: null,
                    recordedAt: null,
                    status: 'offline',
                  },
                };
                return next;
              });
            }

            setLoading(false);
            setFromCache(false);
            setError(null);
            setLastSyncedAt(new Date().toISOString());
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
  }, [uid, farmId, isFocused, devices]);

  return {
    readings,
    loading,
    error,
    fromCache,
    lastSyncedAt,
  };
}

