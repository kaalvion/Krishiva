import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { firestore, initFirebase } from '../src/plugins/firebase.js';
import * as firebasePlugin from '../src/plugins/firebase.js';
import * as mqttPlugin from '../src/plugins/mqtt.js';
import { handleAckMessage } from '../src/modules/commands/commands.handler.js';
import {
  issueCommand,
  acknowledgeCommand,
  sweepExpiredCommands,
  COMMAND_TIMEOUT_MS,
} from '../src/modules/commands/commands.service.js';

describe('Phase 4: Command Pipeline & Actuator Control Tests', () => {
  let app: FastifyInstance;

  const farmId = 'farmPhase4Test';
  const pumpDeviceId = 'devPumpPhase4Test';
  const sensorDeviceId = 'devSensorPhase4Test';

  const ownerUser = {
    uid: 'phase4-owner-uid',
    email: 'phase4-owner@krishiva.com',
    name: 'Phase 4 Owner',
  };

  const adminUser = {
    uid: 'phase4-admin-uid',
    email: 'phase4-admin@krishiva.com',
    name: 'Phase 4 Admin',
  };

  const viewerUser = {
    uid: 'phase4-viewer-uid',
    email: 'phase4-viewer@krishiva.com',
    name: 'Phase 4 Viewer',
  };

  const newMemberUser = {
    uid: 'phase4-newmember-uid',
    email: 'phase4-newmember@krishiva.com',
    name: 'Phase 4 New Member',
  };

  let publishSpy: any;

  beforeAll(async () => {
    initFirebase();

    // Mock verifyIdToken and getUserByEmail in Firebase Auth
    vi.spyOn(firebasePlugin, 'auth').mockReturnValue({
      verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'owner-token') return ownerUser;
        if (token === 'admin-token') return adminUser;
        if (token === 'viewer-token') return viewerUser;
        throw new Error('Invalid test token');
      }),
      getUserByEmail: vi.fn().mockImplementation(async (email: string) => {
        if (email === newMemberUser.email) return newMemberUser;
        if (email === viewerUser.email) return viewerUser;
        const err: any = new Error('User not found');
        err.code = 'auth/user-not-found';
        throw err;
      }),
    } as any);

    // Mock MQTT publishCommand
    publishSpy = vi.spyOn(mqttPlugin, 'publishCommand').mockResolvedValue(undefined);

    // Seed test farm, members, and devices
    const batch = firestore().batch();

    // Farm doc
    batch.set(firestore().doc(`farms/${farmId}`), {
      name: 'Phase 4 Test Farm',
      ownerId: ownerUser.uid,
      areaAcres: 25,
      cropType: 'Sugarcane',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Members
    batch.set(firestore().doc(`farms/${farmId}/members/${ownerUser.uid}`), {
      userId: ownerUser.uid,
      role: 'owner',
      displayName: ownerUser.name,
      joinedAt: new Date().toISOString(),
    });

    batch.set(firestore().doc(`farms/${farmId}/members/${adminUser.uid}`), {
      userId: adminUser.uid,
      role: 'admin',
      displayName: adminUser.name,
      joinedAt: new Date().toISOString(),
    });

    batch.set(firestore().doc(`farms/${farmId}/members/${viewerUser.uid}`), {
      userId: viewerUser.uid,
      role: 'viewer',
      displayName: viewerUser.name,
      joinedAt: new Date().toISOString(),
    });

    // Device with pump capability
    batch.set(firestore().doc(`farms/${farmId}/devices/${pumpDeviceId}`), {
      nodeId: 1,
      name: 'Irrigation Pump Controller',
      type: 'sensor_actuator',
      capabilities: ['pump', 'soil_moisture'],
      status: 'online',
      createdAt: new Date().toISOString(),
    });

    // Device with only sensor capabilities (no pump, valve, light, siren)
    batch.set(firestore().doc(`farms/${farmId}/devices/${sensorDeviceId}`), {
      nodeId: 2,
      name: 'Weather Sensor Node',
      type: 'sensor',
      capabilities: ['temperature', 'humidity'],
      status: 'online',
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup Firestore test docs
    const batch = firestore().batch();
    batch.delete(firestore().doc(`farms/${farmId}/devices/${pumpDeviceId}`));
    batch.delete(firestore().doc(`farms/${farmId}/devices/${sensorDeviceId}`));
    batch.delete(firestore().doc(`farms/${farmId}/members/${ownerUser.uid}`));
    batch.delete(firestore().doc(`farms/${farmId}/members/${adminUser.uid}`));
    batch.delete(firestore().doc(`farms/${farmId}/members/${viewerUser.uid}`));
    batch.delete(firestore().doc(`farms/${farmId}/members/${newMemberUser.uid}`));
    batch.delete(firestore().doc(`farms/${farmId}`));
    await batch.commit().catch(() => {});

    await app.close();
  });

  describe('Authorization & Validation Checks', () => {
    it('viewer gets 403 when attempting to issue a command', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/commands',
        headers: { authorization: 'Bearer viewer-token' },
        payload: {
          farmId,
          deviceId: pumpDeviceId,
          action: 'PUMP_ON',
          durationSeconds: 120,
        },
      });

      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json.statusCode).toBe(403);
      expect(json.error).toBe('Forbidden');
    });

    it('missing capability on target device gets 400', async () => {
      // sensorDeviceId has ['temperature', 'humidity'], missing 'pump'
      const res = await app.inject({
        method: 'POST',
        url: '/api/commands',
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          farmId,
          deviceId: sensorDeviceId,
          action: 'PUMP_ON',
        },
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.statusCode).toBe(400);
      expect(json.message).toContain('lacks required capability');
    });

    it('non-existent device gets 404', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/commands',
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          farmId,
          deviceId: 'non-existent-device',
          action: 'PUMP_ON',
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it('durationSeconds provided for an OFF action gets 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/commands',
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          farmId,
          deviceId: pumpDeviceId,
          action: 'PUMP_OFF',
          durationSeconds: 60,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('only allowed for ON actions');
    });

    it('durationSeconds outside 1-3600 range gets 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/commands',
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          farmId,
          deviceId: pumpDeviceId,
          action: 'PUMP_ON',
          durationSeconds: 5000,
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Command Pipeline Execution & MQTT Integration', () => {
    let createdCommandId: string;

    it('valid command returns 202 and ends "published"', async () => {
      publishSpy.mockClear();

      const res = await app.inject({
        method: 'POST',
        url: '/api/commands',
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          farmId,
          deviceId: pumpDeviceId,
          action: 'PUMP_ON',
          durationSeconds: 300,
        },
      });

      expect(res.statusCode).toBe(202);
      const json = res.json();
      expect(json.status).toBe('pending');
      expect(json.commandId).toBeDefined();
      expect(json.commandId).toMatch(/^cmd-\d+-[a-z0-9]+$/);

      createdCommandId = json.commandId;

      // Verify MQTT publish was called with QoS 1 topic
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        farmId,
        pumpDeviceId,
        expect.objectContaining({
          commandId: createdCommandId,
          action: 'PUMP_ON',
          durationSeconds: 300,
        })
      );

      // Verify command document in Firestore transitioned to "published"
      const cmdDoc = await firestore()
        .doc(`farms/${farmId}/devices/${pumpDeviceId}/commands/${createdCommandId}`)
        .get();

      expect(cmdDoc.exists).toBe(true);
      const data = cmdDoc.data()!;
      expect(data.status).toBe('published');
      expect(data.publishedAt).toBeDefined();
      expect(data.farmId).toBe(farmId);
      expect(data.deviceId).toBe(pumpDeviceId);
      expect(data.action).toBe('PUMP_ON');
      expect(data.durationSeconds).toBe(300);
      expect(data.requestedBy).toBe(ownerUser.uid);
    });

    it('GET /api/commands/:commandId shows status "published"', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/commands/${createdCommandId}?farmId=${farmId}&deviceId=${pumpDeviceId}`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.id).toBe(createdCommandId);
      expect(json.status).toBe('published');
      expect(json.action).toBe('PUMP_ON');
    });

    it('ack success moves status to "acknowledged"', async () => {
      const ackTopic = `krishiva/${farmId}/${pumpDeviceId}/ack`;
      const ackPayload = JSON.stringify({
        commandId: createdCommandId,
        success: true,
      });

      await handleAckMessage(ackTopic, ackPayload);

      const cmdDoc = await firestore()
        .doc(`farms/${farmId}/devices/${pumpDeviceId}/commands/${createdCommandId}`)
        .get();

      const data = cmdDoc.data()!;
      expect(data.status).toBe('acknowledged');
      expect(data.acknowledgedAt).toBeDefined();
    });

    it('command with no ack becomes "expired" (use fake timers)', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      // Issue a new command
      const { commandId } = await issueCommand({
        farmId,
        deviceId: pumpDeviceId,
        action: 'PUMP_OFF',
        requestedBy: adminUser.uid,
      });

      // Synchronously trigger the scheduled 30s timeout
      vi.advanceTimersByTime(31000);

      // Switch back to real timers so Firestore write inside callback finishes
      vi.useRealTimers();

      // Poll briefly for document status update
      let expiredDocData: any = null;
      for (let i = 0; i < 40; i++) {
        const snap = await firestore()
          .doc(`farms/${farmId}/devices/${pumpDeviceId}/commands/${commandId}`)
          .get();
        if (snap.data()?.status === 'expired') {
          expiredDocData = snap.data();
          break;
        }
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(expiredDocData).not.toBeNull();
      expect(expiredDocData?.status).toBe('expired');
      expect(expiredDocData?.error).toBe('No acknowledgment received within 30 seconds');
    });

    it('ack for an expired command is ignored', async () => {
      // Create a command that is already marked expired
      const expiredCmdId = `cmd-${Date.now()}-expir1`;
      const cmdRef = firestore().doc(
        `farms/${farmId}/devices/${pumpDeviceId}/commands/${expiredCmdId}`
      );
      await cmdRef.set({
        id: expiredCmdId,
        commandId: expiredCmdId,
        farmId,
        deviceId: pumpDeviceId,
        action: 'PUMP_ON',
        status: 'expired',
        requestedBy: ownerUser.uid,
        source: 'admin',
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        acknowledgedAt: null,
        error: 'No acknowledgment received within 30 seconds',
      });

      // Send ACK for this expired command
      await handleAckMessage(
        `krishiva/${farmId}/${pumpDeviceId}/ack`,
        JSON.stringify({ commandId: expiredCmdId, success: true })
      );

      // Verify status remains expired
      const docAfter = await cmdRef.get();
      expect(docAfter.data()?.status).toBe('expired');
    });

    it('unknown commandId ack does not crash and invalid payloads are ignored', async () => {
      // Unknown commandId
      await expect(
        handleAckMessage(
          `krishiva/${farmId}/${pumpDeviceId}/ack`,
          JSON.stringify({ commandId: 'cmd-non-existent-999', success: true })
        )
      ).resolves.not.toThrow();

      // Malformed JSON payload
      await expect(
        handleAckMessage(`krishiva/${farmId}/${pumpDeviceId}/ack`, 'not-json')
      ).resolves.not.toThrow();

      // Invalid zod schema payload (missing success)
      await expect(
        handleAckMessage(
          `krishiva/${farmId}/${pumpDeviceId}/ack`,
          JSON.stringify({ commandId: 'cmd-test' })
        )
      ).resolves.not.toThrow();
    });

    it('sweep job expires published commands older than 30s', async () => {
      const sweepCmdId = `cmd-${Date.now()}-sweep1`;
      const oldTime = new Date(Date.now() - 35000).toISOString();
      const cmdRef = firestore().doc(
        `farms/${farmId}/devices/${pumpDeviceId}/commands/${sweepCmdId}`
      );

      await cmdRef.set({
        id: sweepCmdId,
        commandId: sweepCmdId,
        farmId,
        deviceId: pumpDeviceId,
        action: 'PUMP_ON',
        status: 'published',
        requestedBy: ownerUser.uid,
        source: 'admin',
        createdAt: oldTime,
        publishedAt: oldTime,
        acknowledgedAt: null,
        error: null,
      });

      const swept = await sweepExpiredCommands();
      expect(swept).toBeGreaterThanOrEqual(1);

      const sweptDoc = await cmdRef.get();
      expect(sweptDoc.data()?.status).toBe('expired');
      expect(sweptDoc.data()?.error).toBe('No acknowledgment received within 30 seconds');
    });
  });

  describe('History & Members Endpoints', () => {
    it('GET /api/farms/:farmId/commands returns an array of commands', async () => {
      // Seed a command to ensure at least one exists even if run in isolation
      const dummyCmdId = `cmd-${Date.now()}-hist1`;
      await firestore()
        .doc(`farms/${farmId}/devices/${pumpDeviceId}/commands/${dummyCmdId}`)
        .set({
          id: dummyCmdId,
          commandId: dummyCmdId,
          farmId,
          deviceId: pumpDeviceId,
          action: 'PUMP_ON',
          status: 'published',
          requestedBy: ownerUser.uid,
          source: 'admin',
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          acknowledgedAt: null,
          error: null,
        });

      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/commands?limit=10`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBeGreaterThan(0);
      expect(json[0].farmId).toBe(farmId);
    });

    it('GET /api/farms/:farmId/commands?limit=N returns newest N commands in descending order', async () => {
      const orderFarmId = `farm-order-${Date.now()}`;
      const dev1Id = `dev1-${Date.now()}`;
      const dev2Id = `dev2-${Date.now()}`;

      // Set up farm and member
      await firestore().doc(`farms/${orderFarmId}`).set({
        name: 'Order Test Farm',
        ownerId: ownerUser.uid,
      });
      await firestore().doc(`farms/${orderFarmId}/members/${viewerUser.uid}`).set({
        userId: viewerUser.uid,
        role: 'viewer',
      });

      // Set up 2 devices
      await firestore().doc(`farms/${orderFarmId}/devices/${dev1Id}`).set({
        id: dev1Id,
        farmId: orderFarmId,
        name: 'Device 1',
      });
      await firestore().doc(`farms/${orderFarmId}/devices/${dev2Id}`).set({
        id: dev2Id,
        farmId: orderFarmId,
        name: 'Device 2',
      });

      // Create 6 commands across the 2 devices with staggered timestamps
      const baseTime = Date.now();
      const commands = [
        { id: `cmd-0-${baseTime}`, devId: dev1Id, t: baseTime, source: 'manual' },
        { id: `cmd-1-${baseTime}`, devId: dev2Id, t: baseTime + 10000, source: 'manual' },
        { id: `cmd-2-${baseTime}`, devId: dev1Id, t: baseTime + 20000, source: 'manual' },
        { id: `cmd-3-${baseTime}`, devId: dev2Id, t: baseTime + 30000, source: 'manual' },
        { id: `cmd-4-${baseTime}`, devId: dev1Id, t: baseTime + 40000, source: 'manual' },
        { id: `cmd-5-${baseTime}`, devId: dev2Id, t: baseTime + 50000, source: 'scheduler' },
      ];

      for (const cmd of commands) {
        const createdAt = new Date(cmd.t).toISOString();
        await firestore()
          .doc(`farms/${orderFarmId}/devices/${cmd.devId}/commands/${cmd.id}`)
          .set({
            id: cmd.id,
            commandId: cmd.id,
            farmId: orderFarmId,
            deviceId: cmd.devId,
            action: 'PUMP_ON',
            status: 'published',
            requestedBy: ownerUser.uid,
            source: cmd.source,
            createdAt,
            publishedAt: createdAt,
            acknowledgedAt: null,
            error: null,
          });
      }

      // Query with limit=3 (when 6 commands exist)
      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${orderFarmId}/commands?limit=3`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBe(3);

      // Verify that the 3 newest commands come back in descending order
      expect(json[0].id).toBe(`cmd-5-${baseTime}`);
      expect(json[0].source).toBe('scheduler');
      expect(json[1].id).toBe(`cmd-4-${baseTime}`);
      expect(json[2].id).toBe(`cmd-3-${baseTime}`);

      // Also verify timestamps are strictly descending
      const t0 = new Date(json[0].createdAt).getTime();
      const t1 = new Date(json[1].createdAt).getTime();
      const t2 = new Date(json[2].createdAt).getTime();
      expect(t0).toBeGreaterThan(t1);
      expect(t1).toBeGreaterThan(t2);
    });

    it('POST /api/farms/:farmId/members by non-owner returns 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/members`,
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          email: newMemberUser.email,
          role: 'viewer',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('POST /api/farms/:farmId/members by owner creates a new member (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/members`,
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          email: newMemberUser.email,
          role: 'admin',
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.userId).toBe(newMemberUser.uid);
      expect(json.role).toBe('admin');
    });

    it('POST /api/farms/:farmId/members returns 409 if user is already a member', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/members`,
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          email: newMemberUser.email,
          role: 'viewer',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('GET /api/farms/:farmId/members by viewer returns 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/members`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('GET /api/farms/:farmId/members by owner returns member list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/members`,
        headers: { authorization: 'Bearer owner-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.some((m: any) => m.userId === ownerUser.uid)).toBe(true);
    });
  });
});
