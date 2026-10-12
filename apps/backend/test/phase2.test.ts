import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { firestore, initFirebase } from '../src/plugins/firebase.js';
import * as firebasePlugin from '../src/plugins/firebase.js';

describe('Phase 2 API Tests (Farms & Devices)', () => {
  let app: FastifyInstance;
  let createdFarmId: string | null = null;
  let createdDeviceId: string | null = null;

  const mockUser1 = {
    uid: 'test-user-owner-1',
    email: 'owner1@krishiva.com',
    name: 'Owner User',
  };

  const mockUser2 = {
    uid: 'test-user-stranger-2',
    email: 'stranger2@krishiva.com',
    name: 'Stranger User',
  };

  let currentUser = mockUser1;

  beforeAll(async () => {
    initFirebase();

    // Mock verifyIdToken so tests don't require real network calls to Firebase Auth
    vi.spyOn(firebasePlugin, 'auth').mockReturnValue({
      verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'valid-token-user1') {
          return mockUser1;
        }
        if (token === 'valid-token-user2') {
          return mockUser2;
        }
        if (token === 'current-user') {
          return currentUser;
        }
        throw new Error('Invalid mock token');
      }),
    } as any);

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Clean up created test entities in Firestore
    if (createdFarmId) {
      if (createdDeviceId) {
        await firestore()
          .doc(`farms/${createdFarmId}/devices/${createdDeviceId}/latest/current`)
          .delete()
          .catch(() => {});
        await firestore()
          .doc(`farms/${createdFarmId}/devices/${createdDeviceId}`)
          .delete()
          .catch(() => {});
      }
      await firestore()
        .doc(`farms/${createdFarmId}/members/${mockUser1.uid}`)
        .delete()
        .catch(() => {});
      await firestore().doc(`farms/${createdFarmId}`).delete().catch(() => {});
    }
    await app.close();
  });

  // 1. Unauthenticated tests
  describe('Unauthenticated Access (401)', () => {
    it('GET /api/farms returns 401 without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/farms',
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error).toBe('Unauthorized');
    });

    it('POST /api/farms returns 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/farms',
        payload: {
          name: 'Unauthorized Farm',
          areaAcres: 10,
          cropType: 'Wheat',
          location: { lat: 28.5, lng: 77.2 },
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/farms/123/devices returns 401 without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/farms/123/devices',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/farms/123/devices returns 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/farms/123/devices',
        payload: {
          nodeId: 1,
          name: 'Node 1',
          type: 'sensor',
        },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // 2. Validation tests (400)
  describe('Farm Validation (400)', () => {
    it('POST /api/farms returns 400 on invalid body (empty name, negative area, out-of-range lat)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/farms',
        headers: {
          authorization: 'Bearer current-user',
        },
        payload: {
          name: '', // Empty name invalid
          areaAcres: -5, // Negative area invalid
          cropType: '', // Empty cropType invalid
          location: {
            lat: 120, // Lat > 90 invalid
            lng: 250, // Lng > 180 invalid
          },
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.error).toBe('Bad Request');
      expect(json.issues).toBeDefined();
    });

    it('POST /api/farms returns 400 when areaAcres exceeds 1000', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/farms',
        headers: {
          authorization: 'Bearer current-user',
        },
        payload: {
          name: 'Huge Farm',
          areaAcres: 1500,
          cropType: 'Corn',
          location: { lat: 20, lng: 75 },
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // 3. Farm creation & access control
  describe('Farm Creation & Membership (201 & 403)', () => {
    it('POST /api/farms returns 201 and creates farm and member docs in batch', async () => {
      currentUser = mockUser1;

      const res = await app.inject({
        method: 'POST',
        url: '/api/farms',
        headers: {
          authorization: 'Bearer current-user',
        },
        payload: {
          name: 'Green Valley Punjab',
          areaAcres: 25.5,
          cropType: 'Wheat & Mustard',
          location: { lat: 31.1471, lng: 75.3412 },
          timezone: 'Asia/Kolkata',
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.farmId).toBeDefined();
      createdFarmId = json.farmId;

      // Verify Firestore state
      const farmSnap = await firestore().doc(`farms/${createdFarmId}`).get();
      expect(farmSnap.exists).toBe(true);
      expect(farmSnap.data()?.name).toBe('Green Valley Punjab');

      const memberSnap = await firestore()
        .doc(`farms/${createdFarmId}/members/${mockUser1.uid}`)
        .get();
      expect(memberSnap.exists).toBe(true);
      expect(memberSnap.data()?.role).toBe('owner');
    });

    it('GET /api/farms returns the created farm for the owner', async () => {
      currentUser = mockUser1;

      const res = await app.inject({
        method: 'GET',
        url: '/api/farms',
        headers: {
          authorization: 'Bearer current-user',
        },
      });

      expect(res.statusCode).toBe(200);
      const farms = res.json();
      expect(Array.isArray(farms)).toBe(true);
      const found = farms.find((f: any) => f.id === createdFarmId);
      expect(found).toBeDefined();
      expect(found.role).toBe('owner');
    });

    it('GET /api/farms/:farmId returns 200 for owner', async () => {
      currentUser = mockUser1;

      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${createdFarmId}`,
        headers: {
          authorization: 'Bearer current-user',
        },
      });

      expect(res.statusCode).toBe(200);
      const farm = res.json();
      expect(farm.id).toBe(createdFarmId);
      expect(farm.name).toBe('Green Valley Punjab');
      expect(farm.role).toBe('owner');
    });

    it('GET /api/farms/:farmId returns 403 as a DIFFERENT user', async () => {
      currentUser = mockUser2; // Stranger user

      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${createdFarmId}`,
        headers: {
          authorization: 'Bearer current-user',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('Forbidden');
    });

    it('GET /api/farms/:farmId returns 404 for non-existent farm', async () => {
      currentUser = mockUser1;

      const res = await app.inject({
        method: 'GET',
        url: '/api/farms/non-existent-farm-id-12345',
        headers: {
          authorization: 'Bearer current-user',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // 4. Device management routes
  describe('Devices Management', () => {
    it('POST /api/farms/:farmId/devices registers a new device (201)', async () => {
      currentUser = mockUser1;

      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${createdFarmId}/devices`,
        headers: {
          authorization: 'Bearer current-user',
        },
        payload: {
          nodeId: 2,
          name: 'Main Field Sensor Node',
          type: 'sensor',
          location: { zone: 'North Zone', lat: 31.1472, lng: 75.3415 },
          capabilities: ['temperature', 'humidity', 'soilMoisture'],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.deviceId).toBeDefined();
      expect(json.nodeId).toBe(2);
      expect(json.status).toBe('offline');
      createdDeviceId = json.deviceId;
    });

    it('POST /api/farms/:farmId/devices rejects duplicate nodeId with 409', async () => {
      currentUser = mockUser1;

      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${createdFarmId}/devices`,
        headers: {
          authorization: 'Bearer current-user',
        },
        payload: {
          nodeId: 2, // Duplicate nodeId 2 in same farm
          name: 'Conflicting Node',
          type: 'sensor',
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe('Conflict');
    });

    it('GET /api/farms/:farmId/devices returns the registered device list', async () => {
      currentUser = mockUser1;

      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${createdFarmId}/devices`,
        headers: {
          authorization: 'Bearer current-user',
        },
      });

      expect(res.statusCode).toBe(200);
      const devices = res.json();
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
      expect(devices.some((d: any) => d.id === createdDeviceId)).toBe(true);
    });

    it('GET /api/devices/:deviceId?farmId=X returns single device details', async () => {
      currentUser = mockUser1;

      // Seed a latest telemetry reading
      await firestore()
        .doc(`farms/${createdFarmId}/devices/${createdDeviceId}/latest/current`)
        .set({
          nodeId: 2,
          temperature: 26.3,
          humidity: 58.1,
          soilMoisture: 41.5,
          recordedAt: new Date().toISOString(),
          status: 'online',
        });

      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${createdDeviceId}?farmId=${createdFarmId}`,
        headers: {
          authorization: 'Bearer current-user',
        },
      });

      expect(res.statusCode).toBe(200);
      const device = res.json();
      expect(device.id).toBe(createdDeviceId);
      expect(device.latest).toBeDefined();
      expect(device.latest.temperature).toBe(26.3);
    });

    it('GET /api/devices/:deviceId?farmId=X returns 403 for non-member', async () => {
      currentUser = mockUser2; // Non-member

      const res = await app.inject({
        method: 'GET',
        url: `/api/devices/${createdDeviceId}?farmId=${createdFarmId}`,
        headers: {
          authorization: 'Bearer current-user',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
