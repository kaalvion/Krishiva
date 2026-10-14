import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
} from '../services/api';
import type { AlertItem, AlertsResponse } from '../types';

export interface UseAlertsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook to retrieve farm alerts (optionally filtered by acknowledged status).
 */
export function useAlerts(
  farmId: string | undefined,
  acknowledged?: boolean,
  options: UseAlertsOptions = {}
) {
  return useQuery<AlertsResponse>({
    queryKey: ['alerts', farmId, acknowledged],
    queryFn: () => getAlerts(farmId!, acknowledged, 50),
    enabled: Boolean(farmId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? 30000,
    staleTime: 1000 * 15,
  });
}

/**
 * Hook to keep active alerts count and critical status fresh across the entire app.
 * Refetches every 30 seconds even when viewing other tabs.
 */
export function useUnacknowledgedAlerts(farmId: string | undefined) {
  const query = useQuery<AlertsResponse>({
    queryKey: ['alerts', farmId, false],
    queryFn: () => getAlerts(farmId!, false, 50),
    enabled: Boolean(farmId),
    refetchInterval: 30000,
    staleTime: 1000 * 15,
  });

  const alerts = query.data?.alerts ?? [];
  const unacknowledgedCount = query.data?.unacknowledgedCount ?? alerts.length;
  const hasCritical = alerts.some((a) => a.severity === 'critical');

  return {
    ...query,
    alerts,
    unacknowledgedCount,
    hasCritical,
  };
}

/**
 * Hook to acknowledge a single alert.
 */
export function useAcknowledgeAlert(farmId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<AlertItem, Error, string>({
    mutationFn: (alertId: string) => acknowledgeAlert(farmId!, alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', farmId] });
    },
  });
}

/**
 * Hook to acknowledge all active alerts for a farm.
 */
export function useAcknowledgeAll(farmId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ count: number }, Error, void>({
    mutationFn: () => acknowledgeAllAlerts(farmId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', farmId] });
    },
  });
}
