import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { firestore, initFirebase } from '../src/plugins/firebase.js';
import * as firebasePlugin from '../src/plugins/firebase.js';
import { handleTelemetryMessage } from '../src/modules/telemetry/telemetry.handler.js';

describe('Phase 3 API & Telemetry Storage Tests', () => {
  let app: FastifyInstance;

  const farmId = 'farmPhase3Test';
  const deviceId = 'devPhase3Test';

  const ownerUser = {
    uid: 'phase3-owner-uid',
    email: 'phase3-owner@krishiva.com',
    name: 'Phase 3 Owner',
  };

  const strangerUser = {
    uid: 'phase3-stranger-uid',
    email: 'phase3-stranger@krishiva.com',
    name: 'Phase 3 Stranger',
  };

  let currentUser = ownerUser;

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const todayBucket = `readings_${yyyy}_${mm}_${dd}`;

  beforeAll(async () => {
    initFirebase();

    // Mock verifyIdToken so tests do not rely on live auth tokens
    vi.spyOn(firebasePlugin, 'auth').mockReturnValue({
      verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'owner-token') return ownerUser;
        if (token === 'stranger-token') return strangerUser;
        if (token === 'current-token') return currentUser;
        throw new Error('Invalid token');
      }),
    } as any);

    // Seed test farm, member, and device
    const batch = firestore().batch();
    batch.set(firestore().doc(`farms/${farmId}`), {
      name: 'Phase 3 Verification Farm',
      ownerId: ownerUser.uid,
      areaAcres: 50,
      cropType: 'Cotton',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    batch.set(firestore().doc(`farms/${farmId}/members/${ownerUser.uid}`), {
      userId: ownerUser.uid,
      role: 'owner',
      displayName: 'Phase 3 Owner',
      joinedAt: new Date().toISOString(),
    });

    batch.set(firestore().doc(`farms/${farmId}/devices/${deviceId}`), {
      nodeId: 1,
      name: 'Sensor Node 1',
      type: 'sensor',
      status: 'offline',
      location: { zone: 'Sector Alpha', lat: 29.1, lng: 75.8 },
      capabilities: ['temperature', 'humidity', 'soilMoisture'],
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup seeded alerts
    const alertsSnap = await firestore().collection(`farms/${farmId}/alerts`).get();
    for (const d of alertsSnap.docs) {
      await d.ref.delete().catch(() => {});
    }

    // Cleanup readings bucket
    const bucketSnap = await firestore()
      .collection(`farms/${farmId}/devices/${deviceId}/${todayBucket}`)
      .get();
    for (const d of bucketSnap.docs) {
      await d.ref.delete().catch(() => {});
    }

    // Cleanup latest, device, member, farm
    await firestore().doc(`farms/${farmId}/devices/${deviceId}/latest/current`).delete().catch(() => {});
    await firestore().doc(`farms/${farmId}/devices/${deviceId}`).delete().catch(() => {});
    await firestore().doc(`farms/${farmId}/members/${ownerUser.uid}`).delete().catch(() => {});
    await firestore().doc(`farms/${farmId}`).delete().catch(() => {});

    await app.close();
  });

  // 1. Validation Failures (400)
  describe('Validation Checks (400)', () => {
    it('GET /api/devices/:deviceId/latest without farmId returns 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${deviceId}/latest`,
        headers: { authorization: 'Bearer current-token' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Bad Request');
    });

    it('GET /api/devices/:deviceId/history without farmId returns 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${deviceId}/history`,
        headers: { authorization: 'Bearer current-token' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Bad Request');
    });

    it('GET /api/devices/:deviceId/history with invalid hours returns 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${deviceId}/history?farmId=${farmId}&hours=999`,
        headers: { authorization: 'Bearer current-token' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // 2. Authorization Checks (403)
  describe('Membership Access Checks (403)', () => {
    it('GET /api/devices/:deviceId/latest as stranger returns 403', async () => {
      currentUser = strangerUser;
      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${deviceId}/latest?farmId=${farmId}`,
        headers: { authorization: 'Bearer current-token' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('GET /api/devices/:deviceId/history as stranger returns 403', async () => {
      currentUser = strangerUser;
      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${deviceId}/history?farmId=${farmId}&hours=24`,
        headers: { authorization: 'Bearer current-token' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('GET /api/farms/:farmId/heatmap as stranger returns 403', async () => {
      currentUser = strangerUser;
      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/heatmap`,
        headers: { authorization: 'Bearer current-token' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // 3. Telemetry Ingestion & Deduplication
  describe('Telemetry Deduplication & Storage', () => {
    it('stores reading in daily bucket and skips duplicate seq', async () => {
      currentUser = ownerUser;
      const topic = `krishiva/${farmId}/${deviceId}/telemetry`;

      // 1. Ingest first packet with seq: 42
      const firstPayload = JSON.stringify({
        nodeId: 1,
        temperature: 28.5,
        humidity: 60.0,
        soilMoisture: 45.0,
        seq: 42,
        recordedAt: new Date().toISOString(),
      });
      await handleTelemetryMessage(topic, firstPayload);

      // Verify doc exists in daily bucket with deterministic ID seq_42
      const seqDocRef = firestore().doc(`farms/${farmId}/devices/${deviceId}/${todayBucket}/seq_42`);
      const snap1 = await seqDocRef.get();
      expect(snap1.exists).toBe(true);
      expect(snap1.data()?.temperature).toBe(28.5);

      // 2. Ingest duplicate packet with same seq: 42 but different temperature (e.g. 99)
      const duplicatePayload = JSON.stringify({
        nodeId: 1,
        temperature: 99.0,
        humidity: 60.0,
        soilMoisture: 45.0,
        seq: 42,
        recordedAt: new Date().toISOString(),
      });
      await handleTelemetryMessage(topic, duplicatePayload);

      // Verify doc was NOT overwritten
      const snap2 = await seqDocRef.get();
      expect(snap2.exists).toBe(true);
      expect(snap2.data()?.temperature).toBe(28.5);
    });
  });

  // 4. Alert Triggering & Rate Limiting
  describe('Alert Engine (Thresholds & 30-min Rate Limit)', () => {
    it('creates alert for soilMoisture 20 and does NOT duplicate within 30 minutes', async () => {
      currentUser = ownerUser;
      const topic = `krishiva/${farmId}/${deviceId}/telemetry`;

      // 1. Ingest low soil moisture reading (20 <= 25)
      const alertPayload1 = JSON.stringify({
        nodeId: 1,
        temperature: 30.0,
        humidity: 50.0,
        soilMoisture: 20.0,
        seq: 101,
        recordedAt: new Date().toISOString(),
      });
      await handleTelemetryMessage(topic, alertPayload1);

      // Verify alert was created in Firestore
      const alertsQuery1 = await firestore()
        .collection(`farms/${farmId}/alerts`)
        .where('deviceId', '==', deviceId)
        .where('type', '==', 'SOIL_MOISTURE_LOW')
        .get();

      expect(alertsQuery1.empty).toBe(false);
      expect(alertsQuery1.size).toBe(1);
      const alertDoc = alertsQuery1.docs[0].data();
      expect(alertDoc.severity).toBe('warning');
      expect(alertDoc.value).toBe(20.0);
      expect(alertDoc.threshold).toBe(25);
      expect(alertDoc.acknowledged).toBe(false);

      // 2. Ingest another low soil moisture reading (19 <= 25) immediately (within 30 minutes)
      const alertPayload2 = JSON.stringify({
        nodeId: 1,
        temperature: 30.2,
        humidity: 50.1,
        soilMoisture: 19.0,
        seq: 102,
        recordedAt: new Date().toISOString(),
      });
      await handleTelemetryMessage(topic, alertPayload2);

      // Verify alert count remains 1 (rate-limited)
      const alertsQuery2 = await firestore()
        .collection(`farms/${farmId}/alerts`)
        .where('deviceId', '==', deviceId)
        .where('type', '==', 'SOIL_MOISTURE_LOW')
        .get();

      expect(alertsQuery2.size).toBe(1);
    });
  });

  // 5. History Query & Sorted Data
  describe('History & Heatmap Endpoints', () => {
    it('GET /api/devices/:deviceId/latest returns latest reading', async () => {
      currentUser = ownerUser;
      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${deviceId}/latest?farmId=${farmId}`,
        headers: { authorization: 'Bearer current-token' },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.deviceId).toBe(deviceId);
      expect(data.nodeId).toBe(1);
      expect(data.soilMoisture).toBeDefined();
    });

    it('GET /api/devices/:deviceId/history returns chronological sorted points', async () => {
      currentUser = ownerUser;

      // Seed 2 time-spaced readings in the daily bucket
      const bucketRef = firestore().collection(`farms/${farmId}/devices/${deviceId}/${todayBucket}`);
      const t1 = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const t2 = new Date(Date.now() - 1 * 60 * 1000).toISOString();

      await bucketRef.doc('seed_2').set({
        nodeId: 1,
        temperature: 26.0,
        humidity: 55.0,
        soilMoisture: 35.0,
        recordedAt: t2,
      });

      await bucketRef.doc('seed_1').set({
        nodeId: 1,
        temperature: 25.0,
        humidity: 54.0,
        soilMoisture: 36.0,
        recordedAt: t1,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${deviceId}/history?farmId=${farmId}&hours=24`,
        headers: { authorization: 'Bearer current-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.deviceId).toBe(deviceId);
      expect(json.hours).toBe(24);
      expect(Array.isArray(json.readings)).toBe(true);
      expect(json.readings.length).toBeGreaterThanOrEqual(2);

      // Verify sorted ascending
      for (let i = 1; i < json.readings.length; i++) {
        const prev = new Date(json.readings[i - 1].recordedAt).getTime();
        const curr = new Date(json.readings[i].recordedAt).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('GET /api/farms/:farmId/heatmap returns cells array for all devices', async () => {
      currentUser = ownerUser;
      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/heatmap`,
        headers: { authorization: 'Bearer current-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(Array.isArray(json.cells)).toBe(true);
      expect(json.cells.length).toBe(1);

      const cell = json.cells[0];
      expect(cell.deviceId).toBe(deviceId);
      expect(cell.name).toBe('Sensor Node 1');
      expect(cell.nodeId).toBe(1);
      expect(cell.zone).toBe('Sector Alpha');
      expect(cell.lat).toBe(29.1);
      expect(cell.lng).toBe(75.8);
      expect(cell.status).toBe('online');
    });
  });
});
