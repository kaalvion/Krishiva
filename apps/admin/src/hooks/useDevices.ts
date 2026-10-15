import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  type Device,
  type RegisterDeviceInput,
  type DeviceReading,
  type DeviceHistoryResponse,
  type HeatmapResponse,
} from '../types';

export function useDevices(farmId: string | undefined) {
  return useQuery<Device[]>({
    queryKey: ['devices', farmId],
    queryFn: () => api.getDevices(farmId!),
    enabled: !!farmId,
    staleTime: 15000,
  });
}

export function useRegisterDevice(farmId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<Device, Error, RegisterDeviceInput>({
    mutationFn: (input: RegisterDeviceInput) => api.registerDevice(farmId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', farmId] });
      queryClient.invalidateQueries({ queryKey: ['heatmap', farmId] });
    },
  });
}

export function useDeviceLatest(deviceId: string | undefined, farmId: string | undefined) {
  return useQuery<DeviceReading>({
    queryKey: ['deviceLatest', farmId, deviceId],
    queryFn: () => api.getDeviceLatest(deviceId!, farmId!),
    enabled: !!deviceId && !!farmId,
    refetchInterval: 15000,
  });
}

export function useDeviceHistory(
  deviceId: string | undefined,
  farmId: string | undefined,
  hours = 24
) {
  return useQuery<DeviceHistoryResponse>({
    queryKey: ['deviceHistory', farmId, deviceId, hours],
    queryFn: () => api.getDeviceHistory(deviceId!, farmId!, hours),
    enabled: !!deviceId && !!farmId,
    staleTime: 30000,
  });
}

export function useHeatmap(farmId: string | undefined, refetchInterval = 15000) {
  return useQuery<HeatmapResponse>({
    queryKey: ['heatmap', farmId],
    queryFn: () => api.getHeatmap(farmId!),
    enabled: !!farmId,
    refetchInterval,
  });
}
