# Krishiva Backend Setup & Verification Guide

This guide covers setting up, running, and verifying Phase 1 (Foundation), Phase 2 (Auth, Farms, Devices API), and Phase 3 (Telemetry Storage, History, & Alerts) of the Krishiva smart-farm IoT platform.

---

## 1. Prerequisites

- **Node.js**: v20+ (`node -v`)
- **npm**: v10+ (`npm -v`)
- **Git** initialized
- **Firebase Service Account**: Key file located at `secrets/firebase-admin.json`
- **Firebase Web API Key**: Configured in `.env` as `FIREBASE_WEB_API_KEY` (needed for test token script)
- **MQTT Broker (EMQX)**: Configured in `.env` (defaults to EMQX TLS `broker.emqx.io:8883` or your cluster)

---

## 2. Directory Structure

```text
krishiva/
├── apps/
│   ├── backend/                # Fastify + TypeScript backend
│   │   ├── src/
│   │   │   ├── config/env.ts   # Zod-validated environment config
│   │   │   ├── utils/logger.ts # Pino structured logger
│   │   │   ├── plugins/
│   │   │   │   ├── firebase.ts # Firebase Admin SDK initialization
│   │   │   │   ├── auth.ts     # Firebase ID token authentication preHandler
│   │   │   │   └── mqtt.ts     # EMQX TLS client & subscriptions
│   │   │   ├── modules/
│   │   │   │   ├── telemetry/  # Ingestion handler, daily buckets, history & heatmap
│   │   │   │   ├── alerts/     # Environmental threshold evaluation service
│   │   │   │   ├── farms/      # Farms routes, schema, & requireFarmMember helper
│   │   │   │   └── devices/    # Devices registration & lookup routes
│   │   │   ├── jobs/           # Node-cron scheduler
│   │   │   ├── app.ts          # Fastify application setup
│   │   │   └── server.ts       # Application entry point
│   │   ├── scripts/
│   │   │   └── get-test-token.ts # Generates test Firebase ID tokens via REST API
│   │   ├── test/               # Vitest integration tests
│   │   ├── .env.example        # Environment variable template
│   │   ├── .env                # Local configuration
│   │   └── package.json
│   ├── mobile/                 # Reserved for Expo mobile app
│   └── admin/                  # Reserved for Vite + React admin dashboard
├── docs/
│   ├── firestore-schema.md     # Detailed Firestore collection & field schemas
│   └── SETUP.md                # This setup guide
├── firmware/                   # Reserved for microcontroller code
├── secrets/
│   └── firebase-admin.json     # Firebase service account key (git-ignored)
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Firestore composite indexes definition
└── .gitignore
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env` inside `apps/backend/` (or project root):

```env
PORT=3000
NODE_ENV=development

# Relative path from apps/backend or absolute path to Firebase key
FIREBASE_SERVICE_ACCOUNT_PATH=../../secrets/firebase-admin.json

# EMQX MQTT TLS broker credentials
EMQX_HOST=broker.emqx.io
EMQX_PORT=8883
EMQX_USERNAME=krishiva_user
EMQX_PASSWORD=krishiva_password
MQTT_CLIENT_ID_PREFIX=krishiva-backend

# Allowed CORS origins (* for development)
CORS_ORIGINS=*

# Firebase Web API Key for generating dev test tokens
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
```

---

## 4. Running the Backend

From the project root:

```powershell
npm run dev
```

Or directly from `apps/backend`:

```powershell
cd apps/backend
npm run dev
```

The server starts on `http://localhost:3000`. Swagger API documentation is available at `http://localhost:3000/docs`.

---

## 5. Generating Authentication Tokens

Generate a test Firebase ID token using the helper script:

```powershell
npm run token user1@krishiva.com Password123!
```

Store this token in a PowerShell environment variable:

```powershell
$TOKEN = (npm run token user1@krishiva.com Password123! | Select-Object -Last 1)
```

Generate a second token for another test user:

```powershell
$TOKEN2 = (npm run token user2@krishiva.com Password123! | Select-Object -Last 1)
```

---

## 6. Phase 2 Verification Checklist (6 Tests)

### Test 1: POST /api/farms with a token returns 201 and farmId
```powershell
$CreateRes = Invoke-RestMethod -Uri "http://localhost:3000/api/farms" -Method Post -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body '{"name":"Green Valley Farm","areaAcres":50,"cropType":"Wheat","location":{"lat":30.7333,"lng":76.7794},"timezone":"Asia/Kolkata"}'
$FARM_ID = $CreateRes.farmId
Write-Host "Created Farm ID: $FARM_ID"
```

### Test 2: GET /api/farms returns an array containing that farm
```powershell
$Farms = Invoke-RestMethod -Uri "http://localhost:3000/api/farms" -Method Get -Headers @{ Authorization = "Bearer $TOKEN" }
$Farms | ConvertTo-Json -Depth 3
```

### Test 3: farms/{farmId} and farms/{farmId}/members/{uid} exist in Firestore
```powershell
node -e "const admin = require('firebase-admin'); const fs = require('fs'); const sa = JSON.parse(fs.readFileSync('secrets/firebase-admin.json', 'utf8')); admin.initializeApp({ credential: admin.credential.cert(sa) }); const db = admin.firestore(); const farmId = '$FARM_ID'; Promise.all([db.doc('farms/' + farmId).get(), db.collection('farms/' + farmId + '/members').get()]).then(([f, m]) => { console.log('Farm exists:', f.exists); console.log('Members count:', m.size); m.forEach(d => console.log('Member:', d.id, d.data().role)); process.exit(0); });"
```

### Test 4: GET /api/farms/{farmId} as a DIFFERENT user returns 403
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/farms/$FARM_ID" -Method Get -Headers @{ Authorization = "Bearer $TOKEN2" }
} catch {
  Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
  Write-Host "Error Response:" $_.ErrorDetails.Message
}
```

### Test 5: GET /api/farms/{farmId}/devices returns the device list
Register a test device first:
```powershell
$DevRes = Invoke-RestMethod -Uri "http://localhost:3000/api/farms/$FARM_ID/devices" -Method Post -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body '{"nodeId":1,"name":"Field Node 1","type":"sensor","location":{"zone":"North"},"capabilities":["temperature","humidity"]}'
$DEVICE_ID = $DevRes.deviceId
```
Then query the device list:
```powershell
$Devices = Invoke-RestMethod -Uri "http://localhost:3000/api/farms/$FARM_ID/devices" -Method Get -Headers @{ Authorization = "Bearer $TOKEN" }
$Devices | ConvertTo-Json -Depth 3
```

### Test 6: Automated test suite is all green
```powershell
npm test
```

---

## 7. Phase 3 Verification Checklist (6 Tests)

### Test 1: GET /api/devices/{id}/latest?farmId=X returns the reading
Publish a reading via MQTT or script, then query latest:
```powershell
$Latest = Invoke-RestMethod -Uri "http://localhost:3000/api/devices/$DEVICE_ID/latest?farmId=$FARM_ID" -Method Get -Headers @{ Authorization = "Bearer $TOKEN" }
$Latest | ConvertTo-Json -Depth 3
```
**Expected Output**: JSON object containing current reading (`temperature`, `humidity`, `soilMoisture`, `nodeId`, `status: "online"`).

---

### Test 2: GET /api/devices/{id}/history?farmId=X&hours=24 returns an array
```powershell
$History = Invoke-RestMethod -Uri "http://localhost:3000/api/devices/$DEVICE_ID/history?farmId=$FARM_ID&hours=24" -Method Get -Headers @{ Authorization = "Bearer $TOKEN" }
$History | ConvertTo-Json -Depth 3
```
**Expected Output**: JSON object `{ "deviceId": "...", "hours": 24, "count": N, "readings": [ ... ] }` sorted chronologically ascending.

---

### Test 3: Firestore shows a readings_YYYY_MM_DD collection under the device
Verify in Firestore using Node.js:
```powershell
node -e "const admin = require('firebase-admin'); const fs = require('fs'); const sa = JSON.parse(fs.readFileSync('secrets/firebase-admin.json', 'utf8')); admin.initializeApp({ credential: admin.credential.cert(sa) }); const db = admin.firestore(); const d = new Date(); const bucket = 'readings_' + d.getUTCFullYear() + '_' + String(d.getUTCMonth()+1).padStart(2,'0') + '_' + String(d.getUTCDate()).padStart(2,'0'); db.collection('farms/$FARM_ID/devices/$DEVICE_ID/' + bucket).get().then(s => { console.log('Bucket: ' + bucket + ' exists with ' + s.size + ' readings'); process.exit(0); });"
```
**Expected Output**: Prints the daily bucket collection name and the number of stored reading documents.

---

### Test 4: GET /api/farms/{id}/heatmap returns a cells array
```powershell
$Heatmap = Invoke-RestMethod -Uri "http://localhost:3000/api/farms/$FARM_ID/heatmap" -Method Get -Headers @{ Authorization = "Bearer $TOKEN" }
$Heatmap | ConvertTo-Json -Depth 3
```
**Expected Output**: JSON object with `"cells": [ { "deviceId": "...", "name": "...", "nodeId": 1, "soilMoisture": ..., "temperature": ..., "status": "online" } ]`.

---

### Test 5: Publishing soilMoisture 20 creates an alert in Firestore
Publish a low-soil-moisture telemetry payload:
```powershell
node -e "const mqtt = require('mqtt'); const client = mqtt.connect('mqtts://broker.emqx.io:8883', { username: 'krishiva_user', password: 'krishiva_password', rejectUnauthorized: false }); client.on('connect', () => { const payload = JSON.stringify({ nodeId: 1, temperature: 28, humidity: 55, soilMoisture: 20, recordedAt: new Date().toISOString() }); client.publish('krishiva/$FARM_ID/$DEVICE_ID/telemetry', payload, { qos: 1 }, () => { console.log('Published low moisture reading'); client.end(); }); });"
```
Verify the alert document in Firestore:
```powershell
node -e "const admin = require('firebase-admin'); const fs = require('fs'); const sa = JSON.parse(fs.readFileSync('secrets/firebase-admin.json', 'utf8')); admin.initializeApp({ credential: admin.credential.cert(sa) }); const db = admin.firestore(); db.collection('farms/$FARM_ID/alerts').where('type', '==', 'SOIL_MOISTURE_LOW').get().then(s => { console.log('Found ' + s.size + ' low moisture alerts:'); s.forEach(d => console.log(d.id, d.data().severity, d.data().message)); process.exit(0); });"
```
**Expected Output**: Alert document exists with `type: "SOIL_MOISTURE_LOW"`, `severity: "warning"`, `value: 20`, and `acknowledged: false`.

---

### Test 6: Publishing the same seq twice stores only one reading
Publish two packets with identical sequence number `seq: 999`:
```powershell
node -e "const mqtt = require('mqtt'); const client = mqtt.connect('mqtts://broker.emqx.io:8883', { username: 'krishiva_user', password: 'krishiva_password', rejectUnauthorized: false }); client.on('connect', () => { const p1 = JSON.stringify({ nodeId: 1, temperature: 24, humidity: 60, soilMoisture: 45, seq: 999, recordedAt: new Date().toISOString() }); client.publish('krishiva/$FARM_ID/$DEVICE_ID/telemetry', p1, { qos: 1 }, () => { console.log('Published packet 1 (seq: 999)'); client.publish('krishiva/$FARM_ID/$DEVICE_ID/telemetry', p1, { qos: 1 }, () => { console.log('Published duplicate packet 2 (seq: 999)'); client.end(); }); }); });"
```
Check the daily bucket for `seq_999`:
```powershell
node -e "const admin = require('firebase-admin'); const fs = require('fs'); const sa = JSON.parse(fs.readFileSync('secrets/firebase-admin.json', 'utf8')); admin.initializeApp({ credential: admin.credential.cert(sa) }); const db = admin.firestore(); const d = new Date(); const bucket = 'readings_' + d.getUTCFullYear() + '_' + String(d.getUTCMonth()+1).padStart(2,'0') + '_' + String(d.getUTCDate()).padStart(2,'0'); db.collection('farms/$FARM_ID/devices/$DEVICE_ID/' + bucket).where('seq', '==', 999).get().then(s => { console.log('Matching seq 999 docs count: ' + s.size); process.exit(0); });"
```
**Expected Output**: `Matching seq 999 docs count: 1` (the duplicate was skipped, preserving uniqueness).
