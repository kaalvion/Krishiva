import { useQuery } from '@tanstack/react-query';
import { getHeatmap } from '../services/api';
import type { HeatmapResponse } from '../types';

export interface UseHeatmapOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook to retrieve spatial telemetry heatmap cells for a farm.
 */
export function useHeatmap(farmId: string | undefined, options: UseHeatmapOptions = {}) {
  return useQuery<HeatmapResponse>({
    queryKey: ['heatmap', farmId],
    queryFn: () => getHeatmap(farmId!),
    enabled: Boolean(farmId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    staleTime: 1000 * 10,
  });
}
