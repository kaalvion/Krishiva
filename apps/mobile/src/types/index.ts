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
