import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { type FarmMember, type AddMemberInput } from '../types';

export function useMembers(farmId: string | undefined) {
  return useQuery<FarmMember[]>({
    queryKey: ['members', farmId],
    queryFn: () => api.getMembers(farmId!),
    enabled: !!farmId,
    staleTime: 30000,
  });
}

export function useAddMember(farmId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<FarmMember, Error, AddMemberInput>({
    mutationFn: (input: AddMemberInput) => api.addMember(farmId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', farmId] });
    },
  });
}
