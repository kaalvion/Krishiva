# Krishiva Backend Setup & Verification Guide

This guide covers setting up, running, and verifying Phase 1 (Foundation) and Phase 2 (Auth, Farms, Devices API) of the Krishiva smart-farm IoT platform.

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
│   │   │   │   ├── telemetry/  # Ingestion handler & Zod validation
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

The server will start on `http://localhost:3000`. Swagger API documentation is accessible at `http://localhost:3000/docs`.

---

## 5. Generating Authentication Tokens

Generate a test Firebase ID token using the helper script:

```powershell
npm run token user1@krishiva.com Password123!
```

Store this token in a PowerShell environment variable for easy testing:

```powershell
$TOKEN = (npm run token user1@krishiva.com Password123! | Select-Object -Last 1)
```

Generate a second token for a different user:

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
**Expected Output**: HTTP 201 with a non-empty `farmId`.

---

### Test 2: GET /api/farms returns an array containing that farm
```powershell
$Farms = Invoke-RestMethod -Uri "http://localhost:3000/api/farms" -Method Get -Headers @{ Authorization = "Bearer $TOKEN" }
$Farms | ConvertTo-Json -Depth 3
```
**Expected Output**: An array containing the newly created farm with `role: "owner"`.

---

### Test 3: farms/{farmId} and farms/{farmId}/members/{uid} exist in Firestore
Verify directly in Firestore using Node.js:
```powershell
node -e "const admin = require('firebase-admin'); const fs = require('fs'); const sa = JSON.parse(fs.readFileSync('secrets/firebase-admin.json', 'utf8')); admin.initializeApp({ credential: admin.credential.cert(sa) }); const db = admin.firestore(); const farmId = '$FARM_ID'; Promise.all([db.doc('farms/' + farmId).get(), db.collection('farms/' + farmId + '/members').get()]).then(([f, m]) => { console.log('Farm exists:', f.exists); console.log('Members count:', m.size); m.forEach(d => console.log('Member:', d.id, d.data().role)); process.exit(0); });"
```
**Expected Output**:
```text
Farm exists: true
Members count: 1
Member: <uid> owner
```

---

### Test 4: GET /api/farms/{farmId} as a DIFFERENT user returns 403
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/farms/$FARM_ID" -Method Get -Headers @{ Authorization = "Bearer $TOKEN2" }
} catch {
  Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
  Write-Host "Error Response:" $_.ErrorDetails.Message
}
```
**Expected Output**:
```text
Status Code: 403
Error Response: {"statusCode":403,"error":"Forbidden","message":"Forbidden: You are not a member of this farm"}
```

---

### Test 5: GET /api/farms/{farmId}/devices returns the device list
Register a test device first:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/farms/$FARM_ID/devices" -Method Post -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body '{"nodeId":1,"name":"Field Node 1","type":"sensor","location":{"zone":"North"},"capabilities":["temperature","humidity"]}'
```
Then query the device list:
```powershell
$Devices = Invoke-RestMethod -Uri "http://localhost:3000/api/farms/$FARM_ID/devices" -Method Get -Headers @{ Authorization = "Bearer $TOKEN" }
$Devices | ConvertTo-Json -Depth 3
```
**Expected Output**: HTTP 200 with an array containing the registered device (`nodeId: 1`, `status: "offline"`).

---

### Test 6: Automated test suite is all green
Run the full Vitest suite:
```powershell
npm test
```
**Expected Output**:
```text
Test Files  4 passed (4)
Tests       25 passed (25)
```
All tests pass cleanly.
