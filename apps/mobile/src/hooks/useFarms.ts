import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFarm, getFarm, getFarms } from '../services/api';
import type { CreateFarmInput, Farm } from '../types';

export const FARMS_QUERY_KEY = ['farms'] as const;

/**
 * Hook to retrieve user's farms list.
 */
export function useFarms() {
  return useQuery<Farm[]>({
    queryKey: FARMS_QUERY_KEY,
    queryFn: getFarms,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to retrieve a single farm by its ID.
 */
export function useFarm(farmId: string | undefined) {
  return useQuery<Farm>({
    queryKey: ['farm', farmId],
    queryFn: () => getFarm(farmId!),
    enabled: Boolean(farmId),
  });
}

/**
 * Hook to create a new farm and invalidate the farms query cache.
 */
export function useCreateFarm() {
  const queryClient = useQueryClient();

  return useMutation<{ farmId: string }, Error, CreateFarmInput>({
    mutationFn: (newFarm) => createFarm(newFarm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FARMS_QUERY_KEY });
    },
  });
}
