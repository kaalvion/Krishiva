export type FarmRole = 'owner' | 'admin' | 'viewer';

export interface FarmLocation {
  lat: number;
  lng: number;
}

export interface Farm {
  id: string;
  name: string;
  ownerId?: string;
  areaAcres: number;
  cropType: string;
  location: FarmLocation;
  timezone: string;
  role: FarmRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFarmInput {
  name: string;
  areaAcres: number;
  cropType: string;
  location: FarmLocation;
  timezone: string;
}

export type DeviceType = 'sensor' | 'sensor_actuator' | 'gateway';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';

export interface DeviceLocation {
  zone?: string;
  lat?: number;
  lng?: number;
}

export interface Device {
  id: string;
  nodeId: number;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: string[];
  location?: DeviceLocation;
  lastSeenAt?: string;
  firmwareVersion?: string;
  createdAt?: string;
}

export class ApiError extends Error {
  statusCode: number;
  errorText: string;

  constructor(statusCode: number, errorText: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorText = errorText;
  }
}

// Phase 5B: Heatmap, Telemetry & Commands
export interface HeatmapCell {
  deviceId: string;
  name: string | null;
  nodeId: number;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  status: DeviceStatus | string;
  recordedAt: string | null;
}

export interface HeatmapResponse {
  cells: HeatmapCell[];
}

export interface DeviceReading {
  nodeId?: number;
  temperature: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  recordedAt?: string | null;
  receivedAt?: string | null;
  status?: string;
  seq?: number;
  deviceId?: string;
}

export interface DeviceHistoryPoint {
  nodeId?: number;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  recordedAt: string;
  receivedAt?: string;
  seq?: number;
}

export interface DeviceHistoryResponse {
  deviceId: string;
  hours: number;
  count: number;
  readings: DeviceHistoryPoint[];
}

export type ActuatorAction =
  | 'PUMP_ON'
  | 'PUMP_OFF'
  | 'VALVE_ON'
  | 'VALVE_OFF'
  | 'LIGHT_ON'
  | 'LIGHT_OFF'
  | 'SIREN_ON'
  | 'SIREN_OFF';

export type CommandStatus =
  | 'pending'
  | 'published'
  | 'acknowledged'
  | 'failed'
  | 'expired';

export interface IssueCommandInput {
  farmId: string;
  deviceId: string;
  action: ActuatorAction;
  durationSeconds?: number;
}

export interface IssueCommandResponse {
  commandId: string;
  status: 'pending';
}

export interface CommandRecord {
  id: string;
  commandId?: string;
  farmId: string;
  deviceId: string;
  action: ActuatorAction;
  status: CommandStatus;
  requestedBy: string;
  source?: string;
  durationSeconds: number | null;
  createdAt: string;
  publishedAt: string | null;
  acknowledgedAt: string | null;
  error: string | null;
}

