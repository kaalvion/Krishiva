import { useQuery } from '@tanstack/react-query';
import { getHistory } from '../services/api';
import type { DeviceHistoryResponse } from '../types';

export interface UseHistoryOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook to retrieve historical telemetry points for a device across daily buckets.
 */
export function useHistory(
  deviceId: string | undefined,
  farmId: string | undefined,
  hours: number = 24,
  options: UseHistoryOptions = {}
) {
  return useQuery<DeviceHistoryResponse>({
    queryKey: ['history', farmId, deviceId, hours],
    queryFn: () => getHistory(deviceId!, farmId!, hours),
    enabled: Boolean(deviceId) && Boolean(farmId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    staleTime: 1000 * 30, // 30 seconds
  });
}
