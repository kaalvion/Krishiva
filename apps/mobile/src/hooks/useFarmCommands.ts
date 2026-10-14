import { useQuery } from '@tanstack/react-query';
import { getFarmCommands } from '../services/api';
import type { CommandRecord } from '../types';

export interface UseFarmCommandsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook to retrieve recent actuator commands for a farm.
 */
export function useFarmCommands(
  farmId: string | undefined,
  limit: number = 50,
  options: UseFarmCommandsOptions = {}
) {
  return useQuery<CommandRecord[]>({
    queryKey: ['farmCommands', farmId, limit],
    queryFn: () => getFarmCommands(farmId!, limit),
    enabled: Boolean(farmId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    staleTime: 1000 * 5,
  });
}
