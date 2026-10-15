import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { type AlertsResponse, type AlertItem } from '../types';

export function useAlerts(
  farmId: string | undefined,
  params?: { acknowledged?: boolean; limit?: number },
  options?: { refetchInterval?: number }
) {
  return useQuery<AlertsResponse>({
    queryKey: ['alerts', farmId, params?.acknowledged, params?.limit],
    queryFn: () => api.getAlerts(farmId!, params),
    enabled: !!farmId,
    refetchInterval: options?.refetchInterval ?? 15000,
  });
}

/**
 * Specifically polls every 30s to keep the sidebar red badge in sync.
 */
export function useUnacknowledgedAlertsCount(farmId: string | undefined) {
  return useQuery<number>({
    queryKey: ['alertsCount', farmId],
    queryFn: async () => {
      const res = await api.getAlerts(farmId!, { acknowledged: false, limit: 1 });
      return res.unacknowledgedCount;
    },
    enabled: !!farmId,
    refetchInterval: 30000,
  });
}

export function useAcknowledgeAlert(farmId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<AlertItem, Error, string>({
    mutationFn: (alertId: string) => api.acknowledgeAlert(farmId!, alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', farmId] });
      queryClient.invalidateQueries({ queryKey: ['alertsCount', farmId] });
    },
  });
}

export function useAcknowledgeAllAlerts(farmId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<{ acknowledgedCount: number }, Error, void>({
    mutationFn: () => api.acknowledgeAllAlerts(farmId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', farmId] });
      queryClient.invalidateQueries({ queryKey: ['alertsCount', farmId] });
    },
  });
}
