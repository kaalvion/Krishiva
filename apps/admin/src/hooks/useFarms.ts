import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { type Farm, type CreateFarmInput } from '../types';

export function useFarms() {
  return useQuery<Farm[]>({
    queryKey: ['farms'],
    queryFn: () => api.getFarms(),
    staleTime: 30000,
  });
}

export function useFarm(farmId: string | undefined) {
  return useQuery<Farm>({
    queryKey: ['farm', farmId],
    queryFn: () => api.getFarm(farmId!),
    enabled: !!farmId,
    staleTime: 30000,
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();
  return useMutation<{ farmId: string }, Error, CreateFarmInput>({
    mutationFn: (input: CreateFarmInput) => api.createFarm(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}
