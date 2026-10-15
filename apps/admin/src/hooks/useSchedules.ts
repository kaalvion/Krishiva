import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  type Schedule,
  type CreateScheduleInput,
  type UpdateScheduleInput,
} from '../types';

export function useSchedules(farmId: string | undefined) {
  return useQuery<Schedule[]>({
    queryKey: ['schedules', farmId],
    queryFn: () => api.getSchedules(farmId!),
    enabled: !!farmId,
    staleTime: 10000,
  });
}

export function useCreateSchedule(farmId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<Schedule, Error, CreateScheduleInput>({
    mutationFn: (input: CreateScheduleInput) => api.createSchedule(farmId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', farmId] });
    },
  });
}

export function useUpdateSchedule(farmId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    Schedule,
    Error,
    { scheduleId: string; input: UpdateScheduleInput }
  >({
    mutationFn: ({ scheduleId, input }) =>
      api.updateSchedule(farmId!, scheduleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', farmId] });
    },
  });
}

export function useDeleteSchedule(farmId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (scheduleId: string) => api.deleteSchedule(farmId!, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', farmId] });
    },
  });
}
