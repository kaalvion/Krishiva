import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { toMillis } from '../../utils/freshness';
import type { DeviceHistoryPoint } from '../../types';

export interface UseDeviceHistoryResult {
  readings: DeviceHistoryPoint[];
  count: number;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  refetch: () => Promise<void>;
}

/**
 * Computes UTC daily bucket names between two timestamps (inclusive).
 * Format: readings_YYYY_MM_DD
 */
function getDailyBucketNames(startTime: Date, endTime: Date): string[] {
  const buckets: string[] = [];
  const current = new Date(
    Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate())
  );
  const end = new Date(
    Date.UTC(endTime.getUTCFullYear(), endTime.getUTCMonth(), endTime.getUTCDate())
  );

  while (current <= end) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(current.getUTCDate()).padStart(2, '0');
    buckets.push(`readings_${yyyy}_${mm}_${dd}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return buckets;
}

export function useDeviceHistory(
  deviceId?: string,
  farmId?: string,
  hours: number = 24
): UseDeviceHistoryResult {
  const [readings, setReadings] = useState<DeviceHistoryPoint[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  const uid = auth.currentUser?.uid;
  const cacheKey = `history_${deviceId ?? 'none'}_${hours}h`;

  const fetchHistory = useCallback(async () => {
    if (!uid || !farmId || !deviceId) {
      setReadings([]);
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      const startIso = startTime.toISOString();
      const bucketNames = getDailyBucketNames(startTime, now);

      const allPoints: DeviceHistoryPoint[] = [];

      // Query each needed UTC daily partition in parallel
      await Promise.all(
        bucketNames.map(async (bucket) => {
          try {
            const bucketCol = collection(
              db,
              'farms',
              farmId,
              'devices',
              deviceId,
              bucket
            );
            const q = query(bucketCol, where('recordedAt', '>=', startIso));
            const snap = await getDocs(q);

            snap.forEach((docSnap) => {
              const data = docSnap.data();
              allPoints.push({
                nodeId: data.nodeId,
                temperature: Number(data.temperature ?? 0),
                humidity: Number(data.humidity ?? 0),
                soilMoisture: Number(data.soilMoisture ?? 0),
                recordedAt: data.recordedAt ?? new Date().toISOString(),
                receivedAt: data.receivedAt,
                seq: data.seq,
              });
            });
          } catch {
            // Daily bucket may not exist if no data was logged that day
          }
        })
      );

      // Sort chronological ascending
      allPoints.sort((a, b) => toMillis(a.recordedAt) - toMillis(b.recordedAt));

      // Client-side downsample to at most 300 points for chart performance
      let downsampled = allPoints;
      if (downsampled.length > 300) {
        const step = downsampled.length / 300;
        const sampled: DeviceHistoryPoint[] = [];
        for (let i = 0; i < 300; i++) {
          const idx = Math.min(Math.floor(i * step), downsampled.length - 1);
          sampled.push(downsampled[idx]);
        }
        downsampled = sampled;
      }

      setReadings(downsampled);
      setCount(downsampled.length);
      setLoading(false);
      setFromCache(false);

      await saveSnapshot(uid, cacheKey, downsampled, farmId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [uid, farmId, deviceId, hours, cacheKey]);

  // Load cached snapshot immediately on parameter change
  useEffect(() => {
    if (!uid || !farmId || !deviceId) {
      setReadings([]);
      setLoading(false);
      return;
    }

    loadSnapshot<DeviceHistoryPoint[]>(uid, cacheKey, farmId).then((cached) => {
      if (cached && cached.data) {
        setReadings((prev) => (prev.length === 0 ? cached.data : prev));
        setCount(cached.data.length);
        setFromCache(true);
        setLoading(false);
      }
    });

    fetchHistory();
  }, [uid, farmId, deviceId, hours, cacheKey, fetchHistory]);

  return {
    readings,
    count,
    loading,
    error,
    fromCache,
    refetch: fetchHistory,
  };
}

