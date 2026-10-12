# Firestore Database Schema Specification

This document defines the schema, field types, and indexing strategy for Phase 1, Phase 2, and Phase 3 of the Krishiva smart-farm IoT platform.

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
  | `temperature` | number | Ambient temperature in Celsius | Yes | Decimal number (-50 to 80) |
  | `humidity` | number | Relative humidity in % | Yes | Decimal number (0-100) |
  | `soilMoisture` | number | Volumetric water content in % | Yes | Decimal number (0-100) |
  | `seq` | number | Packet sequence number | No | Integer |
  | `recordedAt` | string | Device timestamp when captured | Yes | ISO 8601 |
  | `receivedAt` | string | Ingestion time by backend | Yes | ISO 8601 |
  | `status` | string | Device status at ingestion | Yes | `"online"` |

---

### 1.6 `farms/{farmId}/devices/{deviceId}/readings_YYYY_MM_DD/{readingId}`
Daily bucket time-series collection storing historical sensor readings partitioned by UTC date.
- **Path**: `farms/{farmId}/devices/{deviceId}/readings_YYYY_MM_DD/{readingId}` (e.g. `readings_2026_10_12`)
- **Document ID**: `seq_{seq}` if sequence number is provided (for idempotent deduplication); auto-generated ID otherwise.
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `nodeId` | number | Hardware node integer ID | Yes | 1 to 4 |
  | `temperature` | number | Ambient temperature in Celsius | Yes | Decimal number (-50 to 80) |
  | `humidity` | number | Relative humidity in % | Yes | Decimal number (0-100) |
  | `soilMoisture` | number | Volumetric water content in % | Yes | Decimal number (0-100) |
  | `seq` | number | Sequence number | No | Integer |
  | `recordedAt` | string | Capture timestamp in ISO 8601 | Yes | ISO 8601 |
  | `receivedAt` | string | Backend ingestion timestamp | Yes | ISO 8601 |

---

### 1.7 `farms/{farmId}/alerts/{alertId}`
Threshold breach notifications and operational warnings generated by the alert evaluation engine.
- **Path**: `farms/{farmId}/alerts/{alertId}`
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `deviceId` | string | Target device document ID | Yes | Non-empty string |
  | `type` | string | Identifier of breached rule | Yes | `"SOIL_MOISTURE_CRITICAL"`, `"SOIL_MOISTURE_LOW"`, `"TEMPERATURE_HIGH"`, `"HUMIDITY_HIGH"` |
  | `severity` | string | Urgency level | Yes | `"critical"` \| `"warning"` \| `"info"` |
  | `message` | string | Human-readable alert notification | Yes | Non-empty string |
  | `value` | number | Recorded sensor metric value | Yes | Decimal number |
  | `threshold` | number | Breached threshold limit | Yes | Decimal number |
  | `acknowledged` | boolean | Acknowledgment status | Yes | Default: `false` |
  | `acknowledgedBy` | string | UID of user who acknowledged | No | Valid UID |
  | `acknowledgedAt` | string | Timestamp when acknowledged | No | ISO 8601 |
  | `createdAt` | string | Alert trigger timestamp | Yes | ISO 8601 |

---

### 1.8 `farms/{farmId}/devices/{deviceId}/commands/{commandId}`
Outbound actuator control commands dispatched to IoT devices over MQTT.
- **Path**: `farms/{farmId}/devices/{deviceId}/commands/{commandId}`
- **Document ID**: `cmd-{timestamp}-{random6}` (e.g. `cmd-1773489200000-a1b2c3`)
- **Fields**:
  | Field | Type | Description | Required | Constraints |
  |---|---|---|---|---|
  | `commandId` | string | Unique command identifier | Yes | `cmd-{timestamp}-{random6}` |
  | `farmId` | string | ID of parent farm | Yes | Non-empty string |
  | `deviceId` | string | ID of target device | Yes | Non-empty string |
  | `action` | string | Actuator action | Yes | One of: `"PUMP_ON"`, `"PUMP_OFF"`, `"VALVE_ON"`, `"VALVE_OFF"`, `"LIGHT_ON"`, `"LIGHT_OFF"`, `"SIREN_ON"`, `"SIREN_OFF"` |
  | `status` | string | Lifecycle state | Yes | One of: `"pending"`, `"published"`, `"acknowledged"`, `"failed"`, `"expired"` |
  | `requestedBy` | string | UID of user who initiated command | Yes | Valid Firebase UID |
  | `source` | string | Command origin | Yes | One of: `"mobile"`, `"admin"`, `"scheduler"`, `"ai"` |
  | `durationSeconds` | number \| null | Automatic duration limit in seconds | No | Integer `1` to `3600` (allowed only for `*_ON` actions) |
  | `createdAt` | string | ISO 8601 creation timestamp | Yes | ISO 8601 |
  | `publishedAt` | string \| null | MQTT publication timestamp | No | ISO 8601 or `null` |
  | `acknowledgedAt` | string \| null | Device ACK confirmation timestamp | No | ISO 8601 or `null` |
  | `error` | string \| null | Failure reason or timeout expiration message | No | String or `null` |

**Command Lifecycle Transitions**:
```text
  [pending] ──(MQTT Publish Success)──> [published] ──(Device ACK)───> [acknowledged]
      │                                      │
      │                                      ├──(Timeout 30s)────────> [expired]
      │                                      │
      └──(MQTT Publish Error)─────────> [failed] <──(Negative ACK)────┘
```

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

---

## 3. Required Firestore Composite Indexes

| Collection Group / ID | Query Scope | Indexed Fields | Purpose |
|---|---|---|---|
| `members` | `COLLECTION_GROUP` | `userId` (ASC), `role` (ASC) | Fetch all farms where user is a member with given role |
| `commands` | `COLLECTION` | `deviceId` (ASC), `createdAt` (DESC) | Retrieve recent command history for a device |
| `commands` | `COLLECTION_GROUP` | `farmId` (ASC), `createdAt` (DESC) | Query cross-device command history for an entire farm |
| `alerts` | `COLLECTION` | `acknowledged` (ASC), `createdAt` (DESC) | Query active unacknowledged alerts sorted by time |
| `alerts` | `COLLECTION` | `deviceId` (ASC), `type` (ASC), `acknowledged` (ASC) | Rate-limiting alert evaluation queries |

**Field Overrides (`COLLECTION_GROUP` Single Field Indexes)**:
- `members.userId`: `ASCENDING` (`COLLECTION_GROUP`)
- `commands.status`: `ASCENDING` (`COLLECTION_GROUP`) — Enables scheduler sweep queries for expired published commands.

