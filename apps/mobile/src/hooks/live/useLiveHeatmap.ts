import { useMemo } from 'react';
import { useLiveDevices } from './useLiveDevices';
import { useLiveLatest } from './useLiveLatest';
import { computeEffectiveStatus } from '../../utils/freshness';
import type { HeatmapCell } from '../../types';

export interface UseLiveHeatmapResult {
  cells: HeatmapCell[];
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
}

/**
 * Derives the spatial telemetry heatmap entirely on the client by joining
 * live device definitions with their live /latest/current reading snapshots.
 * Does not make any HTTP calls to the Fastify backend.
 */
export function useLiveHeatmap(farmId?: string): UseLiveHeatmapResult {
  const {
    devices,
    loading: devicesLoading,
    error: devicesError,
    fromCache: devicesFromCache,
    lastSyncedAt: devicesSyncedAt,
  } = useLiveDevices(farmId);

  const {
    readings,
    loading: latestLoading,
    error: latestError,
    fromCache: latestFromCache,
    lastSyncedAt: latestSyncedAt,
  } = useLiveLatest(farmId, devices);

  const cells: HeatmapCell[] = useMemo(() => {
    return devices.map((dev) => {
      const reading = readings[dev.id];
      const effectiveStatus = computeEffectiveStatus(
        dev.lastSeenAt,
        reading?.recordedAt
      );

      return {
        deviceId: dev.id,
        name: dev.name ?? `Node #${dev.nodeId}`,
        nodeId: dev.nodeId,
        zone: dev.location?.zone ?? null,
        lat: dev.location?.lat ?? null,
        lng: dev.location?.lng ?? null,
        soilMoisture: reading?.soilMoisture ?? null,
        temperature: reading?.temperature ?? null,
        humidity: reading?.humidity ?? null,
        status: effectiveStatus,
        recordedAt: reading?.recordedAt ?? null,
      };
    });
  }, [devices, readings]);

  const loading = devicesLoading || (latestLoading && Object.keys(readings).length === 0);
  const error = devicesError || latestError;
  const fromCache = devicesFromCache || latestFromCache;
  const lastSyncedAt = latestSyncedAt || devicesSyncedAt;

  return {
    cells,
    loading,
    error,
    fromCache,
    lastSyncedAt,
  };
}

