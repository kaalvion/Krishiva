import { auth } from './firebase';
import { env } from '../config/env';
import {
  ApiError,
  type CreateFarmInput,
  type Device,
  type Farm,
  type HeatmapResponse,
  type DeviceReading,
  type DeviceHistoryResponse,
  type IssueCommandInput,
  type IssueCommandResponse,
  type CommandRecord,
} from '../types';

const REQUEST_TIMEOUT_MS = 15000;

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Base authenticated fetch wrapper.
 * Retrieves a fresh Firebase ID token, enforces a 15-second timeout,
 * and normalizes HTTP / network failures into typed ApiError objects.
 */
async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError(401, 'Unauthorized', 'User session expired or not authenticated.');
  }

  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    throw new ApiError(401, 'AuthError', 'Failed to acquire authentication token from Firebase.');
  }

  const baseUrl = env.apiUrl.replace(/\/+$/, '');
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorData: { error?: string; message?: string } | null = null;
      try {
        errorData = await res.json();
      } catch {
        // Response body might be empty or non-JSON
      }

      const errorText = errorData?.error || res.statusText || 'Error';
      const message = errorData?.message || `Request failed with status ${res.status}`;
      throw new ApiError(res.status, errorText, message);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'AbortError') {
      throw new ApiError(
        408,
        'Timeout',
        'Request timed out after 15 seconds. Please ensure the backend is running and reachable.'
      );
    }

    const message =
      err instanceof Error ? err.message : 'Unable to connect to Krishiva backend API server.';
    throw new ApiError(
      0,
      'NetworkError',
      `Cannot connect to backend at ${baseUrl}. Please check your connection.`
    );
  }
}

/**
 * Fetches all farms accessible by the authenticated user.
 */
export async function getFarms(): Promise<Farm[]> {
  return request<Farm[]>('/api/farms');
}

/**
 * Creates a new farm and assigns the authenticated user as owner.
 */
export async function createFarm(data: CreateFarmInput): Promise<{ farmId: string }> {
  return request<{ farmId: string }>('/api/farms', {
    method: 'POST',
    body: data,
  });
}

/**
 * Fetches single farm metadata.
 */
export async function getFarm(farmId: string): Promise<Farm> {
  return request<Farm>(`/api/farms/${farmId}`);
}

/**
 * Fetches all registered IoT devices for a farm.
 */
export async function getDevices(farmId: string): Promise<Device[]> {
  return request<Device[]>(`/api/farms/${farmId}/devices`);
}

/**
 * Fetches spatial telemetry heatmap cells across all devices on a farm.
 */
export async function getHeatmap(farmId: string): Promise<HeatmapResponse> {
  return request<HeatmapResponse>(`/api/farms/${farmId}/heatmap`);
}

/**
 * Fetches the latest recorded telemetry snapshot for a specific device.
 */
export async function getLatest(deviceId: string, farmId: string): Promise<DeviceReading> {
  return request<DeviceReading>(`/api/devices/${deviceId}/latest?farmId=${encodeURIComponent(farmId)}`);
}

/**
 * Fetches historical readings for a device across daily bucket collections.
 */
export async function getHistory(
  deviceId: string,
  farmId: string,
  hours: number = 24
): Promise<DeviceHistoryResponse> {
  return request<DeviceHistoryResponse>(
    `/api/devices/${deviceId}/history?farmId=${encodeURIComponent(farmId)}&hours=${hours}`
  );
}

/**
 * Issues an actuator command (e.g. PUMP_ON, PUMP_OFF).
 */
export async function issueCommand(data: IssueCommandInput): Promise<IssueCommandResponse> {
  return request<IssueCommandResponse>('/api/commands', {
    method: 'POST',
    body: data,
  });
}

/**
 * Fetches current status and audit metadata of a specific command.
 */
export async function getCommand(
  commandId: string,
  farmId: string,
  deviceId: string
): Promise<CommandRecord> {
  return request<CommandRecord>(
    `/api/commands/${commandId}?farmId=${encodeURIComponent(farmId)}&deviceId=${encodeURIComponent(deviceId)}`
  );
}

/**
 * Fetches recent commands for a farm (newest first).
 */
export async function getFarmCommands(
  farmId: string,
  limit: number = 50
): Promise<CommandRecord[]> {
  return request<CommandRecord[]>(`/api/farms/${farmId}/commands?limit=${limit}`);
}

