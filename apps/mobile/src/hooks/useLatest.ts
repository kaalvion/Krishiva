import { useQuery } from '@tanstack/react-query';
import { getLatest } from '../services/api';
import type { DeviceReading } from '../types';

export interface UseLatestOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook to retrieve the latest telemetry reading snapshot for a device.
 */
export function useLatest(
  deviceId: string | undefined,
  farmId: string | undefined,
  options: UseLatestOptions = {}
) {
  return useQuery<DeviceReading>({
    queryKey: ['latest', farmId, deviceId],
    queryFn: () => getLatest(deviceId!, farmId!),
    enabled: Boolean(deviceId) && Boolean(farmId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    staleTime: 1000 * 10,
  });
}
