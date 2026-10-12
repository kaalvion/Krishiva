# Firestore Database Schema Specification

This document defines the schema, field types, and indexing strategy for Phase 2 of the Krishiva smart-farm IoT platform.

---

## 1. Collections & Documents

### 1.1 `users/{userId}`
Stores user identity and profile metadata.
- **Path**: `users/{userId}`
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `displayName` | string | Full name of user | Yes | 1-100 characters |
  | `email` | string | Primary email address | Yes | Valid email format |
  | `phone` | string | Contact phone number | No | E.164 phone format |
  | `language` | string | Preferred interface language | Yes | One of: `"en"`, `"hi"`, `"ta"`, `"te"`, `"mr"`, `"pa"`, `"bn"` |
  | `createdAt` | string / timestamp | Account creation date | Yes | ISO 8601 / Firestore Timestamp |
  | `lastLoginAt` | string / timestamp | Last authenticated session | Yes | ISO 8601 / Firestore Timestamp |

---

### 1.2 `farms/{farmId}`
Primary entity representing an agricultural farm.
- **Path**: `farms/{farmId}`
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `name` | string | Farm identifier / label | Yes | 1-100 characters |
  | `ownerId` | string | UID of user who created the farm | Yes | Valid Firebase UID |
  | `location` | map | Geographical coordinates | Yes | `{ lat: number (-90 to 90), lng: number (-180 to 180) }` |
  | `areaAcres` | number | Size of farm in acres | Yes | `> 0` and `<= 1000` |
  | `cropType` | string | Primary crop or produce | Yes | Non-empty string |
  | `timezone` | string | IANA timezone string | Yes | Default: `"Asia/Kolkata"` |
  | `createdAt` | string / timestamp | Farm creation timestamp | Yes | ISO 8601 |
  | `updatedAt` | string / timestamp | Last modification timestamp | Yes | ISO 8601 |

---

### 1.3 `farms/{farmId}/members/{userId}`
Subcollection maintaining user roles and access control for a farm.
- **Path**: `farms/{farmId}/members/{userId}`
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `userId` | string | UID of the member | Yes | Matches document ID |
  | `role` | string | Access privilege level | Yes | `"owner"` \| `"admin"` \| `"viewer"` |
  | `displayName` | string | Display name of member | Yes | User's name |
  | `joinedAt` | string / timestamp | When the member was added | Yes | ISO 8601 |

**Role Hierarchy**:
- `owner`: Full privileges, delete farm, transfer ownership, manage devices, manage members.
- `admin`: Register & configure devices, trigger commands, view telemetry and reports.
- `viewer`: Read-only access to farm details, device states, and telemetry.

---

### 1.4 `farms/{farmId}/devices/{deviceId}`
Subcollection representing physical IoT hardware nodes deployed on the farm.
- **Path**: `farms/{farmId}/devices/{deviceId}`
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `nodeId` | number | Hardware node identifier | Yes | Integer `1` to `4` (unique per farm) |
  | `name` | string | Human-readable device label | Yes | 1-100 characters |
  | `type` | string | Hardware category | Yes | `"sensor"` \| `"sensor_actuator"` \| `"gateway"` |
  | `location` | map | Placement metadata | Yes | `{ zone?: string, lat?: number, lng?: number }` |
  | `status` | string | Connectivity / operational state | Yes | `"online"` \| `"offline"` \| `"maintenance"` |
  | `lastSeenAt` | string / timestamp | Timestamp of last received message | No | ISO 8601 |
  | `firmwareVersion` | string | Deployed firmware version | No | e.g. `"v1.0.0"` |
  | `capabilities` | string[] | Supported sensor/actuator features | Yes | e.g. `["temperature", "humidity", "relay_pump"]` |
  | `createdAt` | string / timestamp | Registration timestamp | Yes | ISO 8601 |

---

### 1.5 `farms/{farmId}/devices/{deviceId}/latest/current`
Singleton document containing the latest recorded telemetry snapshot.
- **Path**: `farms/{farmId}/devices/{deviceId}/latest/current`
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `nodeId` | number | Hardware node integer ID | Yes | 1 to 4 |
  | `temperature` | number | Ambient temperature in Celsius | Yes | Decimal number |
  | `humidity` | number | Relative humidity in % | Yes | Decimal number (0-100) |
  | `soilMoisture` | number | Volumetric water content / % | Yes | Decimal number (0-100) |
  | `recordedAt` | string / number | Device timestamp when captured | Yes | ISO 8601 or epoch ms |
  | `receivedAt` | string / timestamp | Ingestion time by backend | Yes | ISO 8601 |
  | `status` | string | Device status at ingestion | No | `"online"` |

---

## 2. Planned Collections (Document Only - Future Phases)

### 2.1 `farms/{farmId}/schedules/{scheduleId}`
Automation rules for irrigation, fertigation, and lighting.
- `targetDeviceId`: string
- `action`: string (`"pump_on"`, `"pump_off"`, `"valve_open"`)
- `cron`: string (cron expression)
- `durationSeconds`: number
- `enabled`: boolean
- `createdBy`: string (UID)
- `createdAt`: string

### 2.2 `farms/{farmId}/commands/{commandId}`
Outbound actuator commands queued for IoT devices over MQTT.
- `deviceId`: string
- `command`: string (`"RELAY_ON"`, `"RELAY_OFF"`)
- `payload`: map
- `status`: string (`"pending"`, `"sent"`, `"acknowledged"`, `"failed"`)
- `createdAt`: string
- `acknowledgedAt`: string

### 2.3 `farms/{farmId}/alerts/{alertId}`
Threshold breach notifications (e.g. low soil moisture, high heat).
- `deviceId`: string
- `type`: string (`"CRITICAL_MOISTURE"`, `"HIGH_TEMP"`, `"DEVICE_OFFLINE"`)
- `severity`: string (`"warning"`, `"critical"`)
- `message`: string
- `acknowledged`: boolean
- `acknowledgedBy`: string
- `createdAt`: string

---

## 3. Required Firestore Composite Indexes

| Collection Group / ID | Query Scope | Indexed Fields | Purpose |
|---|---|---|---|
| `members` | `COLLECTION_GROUP` | `userId` (ASC), `role` (ASC) | Fetch all farms where user is a member with given role |
| `commands` | `COLLECTION` | `deviceId` (ASC), `createdAt` (DESC) | Retrieve recent command history for a device |
| `alerts` | `COLLECTION` | `acknowledged` (ASC), `createdAt` (DESC) | Query active unacknowledged alerts sorted by time |
