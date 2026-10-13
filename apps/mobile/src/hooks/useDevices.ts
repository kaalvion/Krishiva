import { useQuery } from '@tanstack/react-query';
import { getDevices } from '../services/api';
import type { Device } from '../types';

/**
 * Hook to retrieve IoT devices registered to a specific farm.
 */
export function useDevices(farmId: string | undefined) {
  return useQuery<Device[]>({
    queryKey: ['devices', farmId],
    queryFn: () => getDevices(farmId!),
    enabled: Boolean(farmId),
    staleTime: 1000 * 15, // 15 seconds
  });
}
