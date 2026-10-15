import { env } from '../config/env';
import { getFreshIdToken } from './firebase';
import {
  type Farm,
  type CreateFarmInput,
  type Device,
  type RegisterDeviceInput,
  type DeviceReading,
  type DeviceHistoryResponse,
  type HeatmapResponse,
  type IssueCommandInput,
  type IssueCommandResponse,
  type CommandRecord,
  type Schedule,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type AlertsResponse,
  type AlertItem,
  type FarmMember,
  type AddMemberInput,
  ApiError,
} from '../types';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Core typed fetch wrapper adhering to Krishiva API contract:
 * - Fresh Firebase ID token in Authorization header
 * - 15 second request timeout
 * - POST/PATCH with no data sends "{}" body
 * - DELETE sends no body and no Content-Type header
 * - 204 No Content handled without JSON parsing
 * - Typed errors for 401, 403, 404, 409, network, and timeout
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const url = `${env.apiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Get fresh Firebase ID token
  let token: string;
  try {
    token = await getFreshIdToken();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication required';
    throw new ApiError(401, 'Unauthorized', msg);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  let body: string | undefined;

  if (method === 'DELETE') {
    // Contract: DELETE must send no body and no Content-Type header
    delete headers['Content-Type'];
    body = undefined;
  } else if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    headers['Content-Type'] = 'application/json';
    if (options.body === undefined || options.body === null) {
      // Contract: POST/PATCH with no data must send body "{}"
      body = '{}';
    } else {
      body = JSON.stringify(options.body);
    }
  } else {
    // GET: JSON accepted
    headers['Accept'] = 'application/json';
  }

  // 15s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    if (!response.ok) {
      let errorBody: { error?: string; message?: string; statusCode?: number } = {};
      try {
        errorBody = await response.json();
      } catch {
        // If response is not JSON
      }

      const status = response.status;
      const errorText =
        errorBody.error ||
        (status === 400
          ? 'Bad Request'
          : status === 401
          ? 'Unauthorized'
          : status === 403
          ? 'Forbidden'
          : status === 404
          ? 'Not Found'
          : status === 409
          ? 'Conflict'
          : 'Server Error');

      const message = errorBody.message || `Request failed with status ${status}`;

      throw new ApiError(status, errorText, message);
    }

    const data = (await response.json()) as T;
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        408,
        'Request Timeout',
        'Request timed out after 15 seconds. Please check your connection.',
        { isTimeout: true }
      );
    }

    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(0, 'Network Error', message, { isNetworkError: true });
  }
}

// ==========================================
// API Resource Methods
// ==========================================

export const api = {
  // Farms
  getFarms: async (): Promise<Farm[]> => {
    return request<Farm[]>('/api/farms');
  },

  createFarm: async (input: CreateFarmInput): Promise<{ farmId: string }> => {
    return request<{ farmId: string }>('/api/farms', {
      method: 'POST',
      body: input,
    });
  },

  getFarm: async (farmId: string): Promise<Farm> => {
    return request<Farm>(`/api/farms/${encodeURIComponent(farmId)}`);
  },

  // Devices
  getDevices: async (farmId: string): Promise<Device[]> => {
    return request<Device[]>(`/api/farms/${encodeURIComponent(farmId)}/devices`);
  },

  registerDevice: async (farmId: string, input: RegisterDeviceInput): Promise<Device> => {
    return request<Device>(`/api/farms/${encodeURIComponent(farmId)}/devices`, {
      method: 'POST',
      body: input,
    });
  },

  getDeviceLatest: async (deviceId: string, farmId: string): Promise<DeviceReading> => {
    return request<DeviceReading>(
      `/api/devices/${encodeURIComponent(deviceId)}/latest?farmId=${encodeURIComponent(farmId)}`
    );
  },

  getDeviceHistory: async (
    deviceId: string,
    farmId: string,
    hours = 24
  ): Promise<DeviceHistoryResponse> => {
    return request<DeviceHistoryResponse>(
      `/api/devices/${encodeURIComponent(deviceId)}/history?farmId=${encodeURIComponent(
        farmId
      )}&hours=${hours}`
    );
  },

  // Heatmap
  getHeatmap: async (farmId: string): Promise<HeatmapResponse> => {
    return request<HeatmapResponse>(`/api/farms/${encodeURIComponent(farmId)}/heatmap`);
  },

  // Commands
  issueCommand: async (input: IssueCommandInput): Promise<IssueCommandResponse> => {
    return request<IssueCommandResponse>('/api/commands', {
      method: 'POST',
      body: input,
    });
  },

  getCommandStatus: async (
    commandId: string,
    farmId: string,
    deviceId: string
  ): Promise<CommandRecord> => {
    return request<CommandRecord>(
      `/api/commands/${encodeURIComponent(commandId)}?farmId=${encodeURIComponent(
        farmId
      )}&deviceId=${encodeURIComponent(deviceId)}`
    );
  },

  getCommandsHistory: async (farmId: string, limit = 50): Promise<CommandRecord[]> => {
    return request<CommandRecord[]>(
      `/api/farms/${encodeURIComponent(farmId)}/commands?limit=${limit}`
    );
  },

  // Schedules
  getSchedules: async (farmId: string): Promise<Schedule[]> => {
    return request<Schedule[]>(`/api/farms/${encodeURIComponent(farmId)}/schedules`);
  },

  createSchedule: async (farmId: string, input: CreateScheduleInput): Promise<Schedule> => {
    return request<Schedule>(`/api/farms/${encodeURIComponent(farmId)}/schedules`, {
      method: 'POST',
      body: input,
    });
  },

  updateSchedule: async (
    farmId: string,
    scheduleId: string,
    input: UpdateScheduleInput
  ): Promise<Schedule> => {
    return request<Schedule>(
      `/api/farms/${encodeURIComponent(farmId)}/schedules/${encodeURIComponent(scheduleId)}`,
      {
        method: 'PATCH',
        body: input,
      }
    );
  },

  deleteSchedule: async (farmId: string, scheduleId: string): Promise<void> => {
    return request<void>(
      `/api/farms/${encodeURIComponent(farmId)}/schedules/${encodeURIComponent(scheduleId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // Alerts
  getAlerts: async (
    farmId: string,
    params?: { acknowledged?: boolean; limit?: number }
  ): Promise<AlertsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.acknowledged !== undefined) {
      searchParams.set('acknowledged', String(params.acknowledged));
    }
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    const query = searchParams.toString();
    return request<AlertsResponse>(
      `/api/farms/${encodeURIComponent(farmId)}/alerts${query ? `?${query}` : ''}`
    );
  },

  acknowledgeAlert: async (farmId: string, alertId: string): Promise<AlertItem> => {
    return request<AlertItem>(
      `/api/farms/${encodeURIComponent(farmId)}/alerts/${encodeURIComponent(alertId)}/acknowledge`,
      {
        method: 'POST',
        body: undefined, // Will send "{}" per contract
      }
    );
  },

  acknowledgeAllAlerts: async (
    farmId: string
  ): Promise<{ acknowledgedCount: number }> => {
    return request<{ acknowledgedCount: number }>(
      `/api/farms/${encodeURIComponent(farmId)}/alerts/acknowledge-all`,
      {
        method: 'POST',
        body: undefined, // Will send "{}" per contract
      }
    );
  },

  // Members
  getMembers: async (farmId: string): Promise<FarmMember[]> => {
    return request<FarmMember[]>(`/api/farms/${encodeURIComponent(farmId)}/members`);
  },

  addMember: async (farmId: string, input: AddMemberInput): Promise<FarmMember> => {
    return request<FarmMember>(`/api/farms/${encodeURIComponent(farmId)}/members`, {
      method: 'POST',
      body: input,
    });
  },
};
