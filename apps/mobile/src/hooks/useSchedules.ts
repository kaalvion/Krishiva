import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../services/api';
import type {
  Schedule,
  CreateScheduleInput,
  UpdateScheduleInput,
} from '../types';

export interface UseSchedulesOptions {
  enabled?: boolean;
}

/**
 * Hook to retrieve all schedules for a farm.
 * Automatically refetches when the screen comes into focus.
 */
export function useSchedules(farmId: string | undefined, options: UseSchedulesOptions = {}) {
  const query = useQuery<Schedule[]>({
    queryKey: ['schedules', farmId],
    queryFn: () => getSchedules(farmId!),
    enabled: Boolean(farmId) && (options.enabled ?? true),
    staleTime: 1000 * 10,
  });

  // Refetch schedules whenever user focuses this screen
  useFocusEffect(
    useCallback(() => {
      if (farmId) {
        query.refetch();
      }
    }, [farmId, query.refetch])
  );

  return query;
}

/**
 * Hook to create a new schedule.
 */
export function useCreateSchedule(farmId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ scheduleId: string }, Error, CreateScheduleInput>({
    mutationFn: (data: CreateScheduleInput) => createSchedule(farmId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', farmId] });
    },
  });
}

/**
 * Hook to update an existing schedule.
 * Includes optimistic update for fast toggle of the 'enabled' switch with automatic rollback.
 */
export function useUpdateSchedule(farmId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    Schedule,
    Error,
    { scheduleId: string; data: UpdateScheduleInput },
    { previousSchedules?: Schedule[] }
  >({
    mutationFn: ({ scheduleId, data }) => updateSchedule(farmId!, scheduleId, data),
    onMutate: async ({ scheduleId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['schedules', farmId] });
      const previousSchedules = queryClient.getQueryData<Schedule[]>(['schedules', farmId]);

      if (previousSchedules) {
        queryClient.setQueryData<Schedule[]>(['schedules', farmId], (old) => {
          if (!old) return old;
          return old.map((s) => (s.id === scheduleId ? { ...s, ...data } : s));
        });
      }

      return { previousSchedules };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSchedules) {
        queryClient.setQueryData(['schedules', farmId], context.previousSchedules);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', farmId] });
    },
  });
}

/**
 * Hook to delete an existing schedule.
 */
export function useDeleteSchedule(farmId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (scheduleId: string) => deleteSchedule(farmId!, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', farmId] });
    },
  });
}
