import { useQuery } from '@tanstack/react-query';
import { getDevices } from '../services/api';
import type { Device } from '../types';

export interface UseDevicesOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook to retrieve IoT devices registered to a specific farm.
 */
export function useDevices(farmId: string | undefined, options: UseDevicesOptions = {}) {
  return useQuery<Device[]>({
    queryKey: ['devices', farmId],
    queryFn: () => getDevices(farmId!),
    enabled: Boolean(farmId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    staleTime: 1000 * 15, // 15 seconds
  });
}
