import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { firestore, initFirebase } from '../src/plugins/firebase.js';
import * as firebasePlugin from '../src/plugins/firebase.js';
import * as mqttPlugin from '../src/plugins/mqtt.js';
import { runDueSchedules } from '../src/modules/schedules/schedules.runner.js';
import { detectOfflineDevices } from '../src/jobs/offline-detector.js';

describe('Phase 7A: Scheduling, Alerts API & Offline Detection Tests', () => {
  let app: FastifyInstance;

  const farmId = 'farmPhase7ATest';
  const pumpDeviceId = 'devPumpPhase7ATest';
  const sensorDeviceId = 'devSensorPhase7ATest';
  const staleDeviceId = 'devStalePhase7ATest';

  const ownerUser = {
    uid: 'phase7a-owner-uid',
    email: 'phase7a-owner@krishiva.com',
    name: 'Phase 7A Owner',
  };

  const adminUser = {
    uid: 'phase7a-admin-uid',
    email: 'phase7a-admin@krishiva.com',
    name: 'Phase 7A Admin',
  };

  const viewerUser = {
    uid: 'phase7a-viewer-uid',
    email: 'phase7a-viewer@krishiva.com',
    name: 'Phase 7A Viewer',
  };

  let publishSpy: any;

  beforeAll(async () => {
    initFirebase();

    // Mock Firebase auth token verification
    vi.spyOn(firebasePlugin, 'auth').mockReturnValue({
      verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'owner-token') return ownerUser;
        if (token === 'admin-token') return adminUser;
        if (token === 'viewer-token') return viewerUser;
        throw new Error('Invalid test token');
      }),
    } as any);

    // Mock MQTT publishCommand
    publishSpy = vi.spyOn(mqttPlugin, 'publishCommand').mockResolvedValue(undefined);

    // Seed test farm, members, and devices
    const batch = firestore().batch();

    // Farm doc in Asia/Kolkata timezone
    batch.set(firestore().doc(`farms/${farmId}`), {
      name: 'Phase 7A Test Farm',
      ownerId: ownerUser.uid,
      areaAcres: 50,
      cropType: 'Wheat',
      timezone: 'Asia/Kolkata',
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

    // Pump Device (has pump capability)
    batch.set(firestore().doc(`farms/${farmId}/devices/${pumpDeviceId}`), {
      nodeId: 1,
      name: 'Main Irrigation Pump',
      type: 'sensor_actuator',
      capabilities: ['pump', 'soil_moisture'],
      status: 'online',
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Sensor Device (lacks actuator capabilities)
    batch.set(firestore().doc(`farms/${farmId}/devices/${sensorDeviceId}`), {
      nodeId: 2,
      name: 'Field Moisture Sensor',
      type: 'sensor',
      capabilities: ['temperature', 'humidity', 'soil_moisture'],
      status: 'online',
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Stale Device (online but last seen 30 minutes ago)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    batch.set(firestore().doc(`farms/${farmId}/devices/${staleDeviceId}`), {
      nodeId: 3,
      name: 'Stale Sensor Node',
      type: 'sensor',
      capabilities: ['temperature'],
      status: 'online',
      lastSeenAt: thirtyMinsAgo,
      createdAt: thirtyMinsAgo,
    });

    await batch.commit();

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Teardown test data
    const batch = firestore().batch();

    // Clean up schedules
    const schedulesSnap = await firestore().collection(`farms/${farmId}/schedules`).get();
    for (const d of schedulesSnap.docs) {
      batch.delete(d.ref);
    }

    // Clean up schedule_runs
    const runsSnap = await firestore().collection(`farms/${farmId}/schedule_runs`).get();
    for (const d of runsSnap.docs) {
      batch.delete(d.ref);
    }

    // Clean up alerts
    const alertsSnap = await firestore().collection(`farms/${farmId}/alerts`).get();
    for (const d of alertsSnap.docs) {
      batch.delete(d.ref);
    }

    // Clean up devices, members, farm
    batch.delete(firestore().doc(`farms/${farmId}/devices/${pumpDeviceId}`));
    batch.delete(firestore().doc(`farms/${farmId}/devices/${sensorDeviceId}`));
    batch.delete(firestore().doc(`farms/${farmId}/devices/${staleDeviceId}`));
    batch.delete(firestore().doc(`farms/${farmId}/members/${ownerUser.uid}`));
    batch.delete(firestore().doc(`farms/${farmId}/members/${adminUser.uid}`));
    batch.delete(firestore().doc(`farms/${farmId}/members/${viewerUser.uid}`));
    batch.delete(firestore().doc(`farms/${farmId}`));

    await batch.commit().catch(() => {});
    await app.close();
  });

  describe('1. Schedule Routes (/api/farms/:farmId/schedules)', () => {
    let createdScheduleId: string;

    it('viewer gets 403 when creating a schedule', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer viewer-token' },
        payload: {
          deviceId: pumpDeviceId,
          action: 'PUMP_ON',
          time: '06:00',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 400 for invalid time format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          deviceId: pumpDeviceId,
          action: 'PUMP_ON',
          time: '25:99', // Invalid hour/min
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('time');
    });

    it('returns 400 when durationSeconds is provided for *_OFF action', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          deviceId: pumpDeviceId,
          action: 'PUMP_OFF',
          time: '18:00',
          durationSeconds: 300,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('durationSeconds');
    });

    it('returns 404 when target device does not exist in farm', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          deviceId: 'non-existent-device-xyz',
          action: 'PUMP_ON',
          time: '06:00',
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().message).toContain('not found');
    });

    it('returns 400 when device lacks matching capability', async () => {
      // sensorDeviceId only has ['temperature', 'humidity', 'soil_moisture'], lacks 'pump'
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          deviceId: sensorDeviceId,
          action: 'PUMP_ON',
          time: '06:00',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('lacks required capability');
    });

    it('returns 201 and creates schedule successfully with duration and daily days', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer owner-token' },
        payload: {
          deviceId: pumpDeviceId,
          action: 'PUMP_ON',
          time: '06:00',
          days: 'daily',
          durationSeconds: 900,
          name: 'Morning Irrigation',
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.scheduleId).toBeDefined();
      createdScheduleId = json.scheduleId;

      // Verify in Firestore
      const snap = await firestore().doc(`farms/${farmId}/schedules/${createdScheduleId}`).get();
      expect(snap.exists).toBe(true);
      expect(snap.data()?.time).toBe('06:00');
      expect(snap.data()?.durationSeconds).toBe(900);
      expect(snap.data()?.enabled).toBe(true);
    });

    it('GET /api/farms/:farmId/schedules lists schedules sorted by time asc', async () => {
      // Create a second schedule at an earlier time (05:30)
      const res2 = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          deviceId: pumpDeviceId,
          action: 'PUMP_OFF',
          time: '05:30',
          name: 'Early Morning Stop',
        },
      });
      expect(res2.statusCode).toBe(201);

      // Members can read
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/schedules`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(listRes.statusCode).toBe(200);
      const list = listRes.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(2);

      // Verify sorted by time asc
      const times = list.map((s: any) => s.time);
      for (let i = 0; i < times.length - 1; i++) {
        expect(times[i].localeCompare(times[i + 1])).toBeLessThanOrEqual(0);
      }
    });

    it('PATCH /api/farms/:farmId/schedules/:scheduleId updates schedule fields', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/farms/${farmId}/schedules/${createdScheduleId}`,
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          name: 'Updated Morning Pump',
          time: '06:15',
          days: [1, 2, 3, 4, 5], // Mon-Fri
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.name).toBe('Updated Morning Pump');
      expect(json.time).toBe('06:15');
      expect(json.days).toEqual([1, 2, 3, 4, 5]);

      const snap = await firestore().doc(`farms/${farmId}/schedules/${createdScheduleId}`).get();
      expect(snap.data()?.time).toBe('06:15');
    });

    it('DELETE /api/farms/:farmId/schedules/:scheduleId returns 204', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/farms/${farmId}/schedules/${createdScheduleId}`,
        headers: { authorization: 'Bearer owner-token' },
      });

      expect(res.statusCode).toBe(204);

      const snap = await firestore().doc(`farms/${farmId}/schedules/${createdScheduleId}`).get();
      expect(snap.exists).toBe(false);
    });
  });

  describe('2. Schedule Runner Engine (runDueSchedules)', () => {
    let testRunnerScheduleId: string;

    beforeAll(async () => {
      // Create a schedule for 06:00 Asia/Kolkata on Wednesday (day 3)
      const ref = firestore().collection(`farms/${farmId}/schedules`).doc('sched-runner-test');
      testRunnerScheduleId = ref.id;
      await ref.set({
        id: testRunnerScheduleId,
        farmId,
        deviceId: pumpDeviceId,
        action: 'PUMP_ON',
        time: '06:00',
        days: [3], // Wednesday only
        durationSeconds: 600,
        enabled: true,
        name: 'Wed Morning Irrigation',
        createdBy: ownerUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastRunAt: null,
        lastRunStatus: null,
      });
    });

    it('fires command at matching minute in Asia/Kolkata (2026-10-14T00:30:00Z = Wed 06:00 IST)', async () => {
      publishSpy.mockClear();

      // Instant 2026-10-14T00:30:00.000Z corresponds to 2026-10-14 06:00:00 in Asia/Kolkata (Wednesday)
      const matchingTime = new Date('2026-10-14T00:30:00.000Z');

      const result = await runDueSchedules(matchingTime);
      expect(result.executedCount).toBe(1);

      // Verify schedule status updated
      const schedDoc = await firestore()
        .doc(`farms/${farmId}/schedules/${testRunnerScheduleId}`)
        .get();
      expect(schedDoc.data()?.lastRunStatus).toBe('issued');
      expect(schedDoc.data()?.lastRunCommandId).toBeDefined();

      // Verify run slot document exists
      const runDoc = await firestore()
        .doc(`farms/${farmId}/schedule_runs/${testRunnerScheduleId}_202610140600`)
        .get();
      expect(runDoc.exists).toBe(true);
      expect(runDoc.data()?.action).toBe('PUMP_ON');
    });

    it('idempotency: calling runner twice in the same minute produces only one command', async () => {
      const matchingTime = new Date('2026-10-14T00:30:00.000Z');

      const result = await runDueSchedules(matchingTime);
      // Second run in the same minute should skip due to existing schedule_runs slot doc
      expect(result.executedCount).toBe(0);
      expect(result.skippedCount).toBeGreaterThanOrEqual(1);
    });

    it('skips when time does not match (NO CATCH-UP on missed schedules)', async () => {
      // 2026-10-14T01:30:00.000Z is 07:00 IST (does not match 06:00)
      const differentTime = new Date('2026-10-14T01:30:00.000Z');

      const result = await runDueSchedules(differentTime);
      expect(result.executedCount).toBe(0);
    });

    it('skips when day of week does not match', async () => {
      // 2026-10-15T00:30:00.000Z is 06:00 IST on Thursday (day 4, but schedule is Wed/day 3)
      const thursdayTime = new Date('2026-10-15T00:30:00.000Z');

      const result = await runDueSchedules(thursdayTime);
      expect(result.executedCount).toBe(0);
    });

    it('skips disabled schedules', async () => {
      // Disable schedule
      await firestore()
        .doc(`farms/${farmId}/schedules/${testRunnerScheduleId}`)
        .update({ enabled: false });

      // Run on next Wednesday at 06:00
      const nextWed = new Date('2026-10-21T00:30:00.000Z');
      const result = await runDueSchedules(nextWed);
      expect(result.executedCount).toBe(0);

      // Re-enable
      await firestore()
        .doc(`farms/${farmId}/schedules/${testRunnerScheduleId}`)
        .update({ enabled: true });
    });

    it('safety: one failing schedule does not stop another schedule from running', async () => {
      // Create failing schedule (points to non-existent device)
      const badRef = firestore().collection(`farms/${farmId}/schedules`).doc('sched-bad');
      await badRef.set({
        id: 'sched-bad',
        farmId,
        deviceId: 'deleted-device-id',
        action: 'PUMP_ON',
        time: '06:00',
        days: 'daily',
        enabled: true,
      });

      // Create good schedule at 06:00 daily
      const goodRef = firestore().collection(`farms/${farmId}/schedules`).doc('sched-good');
      await goodRef.set({
        id: 'sched-good',
        farmId,
        deviceId: pumpDeviceId,
        action: 'PUMP_OFF',
        time: '06:00',
        days: 'daily',
        enabled: true,
      });

      // Next day at 06:00 IST
      const slotTime = new Date('2026-10-22T00:30:00.000Z');
      const result = await runDueSchedules(slotTime);

      // Good schedule executed, bad schedule failed gracefully
      expect(result.executedCount).toBeGreaterThanOrEqual(1);
      expect(result.errorCount).toBeGreaterThanOrEqual(1);

      const badSnap = await badRef.get();
      expect(badSnap.data()?.lastRunStatus).toBe('error');

      const goodSnap = await goodRef.get();
      expect(goodSnap.data()?.lastRunStatus).toBe('issued');

      await badRef.delete();
      await goodRef.delete();
    });
  });

  describe('3. Alert Routes (/api/farms/:farmId/alerts)', () => {
    let testAlertId: string;

    beforeAll(async () => {
      // Seed two test alerts: one unacknowledged, one acknowledged
      const unackRef = firestore().collection(`farms/${farmId}/alerts`).doc('alert-unack-1');
      testAlertId = unackRef.id;
      await unackRef.set({
        deviceId: pumpDeviceId,
        type: 'SOIL_MOISTURE_LOW',
        severity: 'warning',
        message: 'Low soil moisture: 22% (threshold: <= 25%)',
        value: 22,
        threshold: 25,
        acknowledged: false,
        createdAt: new Date(Date.now() - 5000).toISOString(),
      });

      const ackRef = firestore().collection(`farms/${farmId}/alerts`).doc('alert-ack-1');
      await ackRef.set({
        deviceId: sensorDeviceId,
        type: 'TEMPERATURE_HIGH',
        severity: 'warning',
        message: 'High ambient temperature: 43°C',
        value: 43,
        threshold: 42,
        acknowledged: true,
        acknowledgedBy: adminUser.uid,
        acknowledgedAt: new Date(Date.now() - 60000).toISOString(),
        createdAt: new Date(Date.now() - 70000).toISOString(),
      });
    });

    it('GET /api/farms/:farmId/alerts returns alerts with deviceName and unacknowledgedCount', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/alerts`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.alerts).toBeDefined();
      expect(json.unacknowledgedCount).toBeGreaterThanOrEqual(1);

      const firstAlert = json.alerts[0];
      expect(firstAlert.id).toBeDefined();
      expect(firstAlert.deviceName).toBeDefined();
      expect(['Main Irrigation Pump', 'Field Moisture Sensor']).toContain(firstAlert.deviceName);
    });

    it('filters alerts by acknowledged status', async () => {
      const unackRes = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/alerts?acknowledged=false`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(unackRes.statusCode).toBe(200);
      const unackList = unackRes.json().alerts;
      expect(unackList.every((a: any) => a.acknowledged === false)).toBe(true);

      const ackRes = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/alerts?acknowledged=true`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(ackRes.statusCode).toBe(200);
      const ackList = ackRes.json().alerts;
      expect(ackList.every((a: any) => a.acknowledged === true)).toBe(true);
    });

    it('viewer gets 403 when trying to acknowledge an alert', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/alerts/${testAlertId}/acknowledge`,
        headers: { authorization: 'Bearer viewer-token' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('owner acknowledges alert successfully; repeated call is idempotent (returns 200)', async () => {
      // First acknowledge call
      const res1 = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/alerts/${testAlertId}/acknowledge`,
        headers: { authorization: 'Bearer owner-token' },
      });

      expect(res1.statusCode).toBe(200);
      const json1 = res1.json();
      expect(json1.acknowledged).toBe(true);
      expect(json1.acknowledgedBy).toBe(ownerUser.uid);
      expect(json1.acknowledgedAt).toBeDefined();

      // Second call (idempotency check)
      const res2 = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/alerts/${testAlertId}/acknowledge`,
        headers: { authorization: 'Bearer owner-token' },
      });

      expect(res2.statusCode).toBe(200);
      const json2 = res2.json();
      expect(json2.acknowledged).toBe(true);
      expect(json2.acknowledgedBy).toBe(ownerUser.uid);
    });

    it('POST /api/farms/:farmId/alerts/acknowledge-all marks all unacknowledged alerts', async () => {
      // Create another unacknowledged alert
      const newRef = firestore().collection(`farms/${farmId}/alerts`).doc();
      await newRef.set({
        deviceId: pumpDeviceId,
        type: 'HUMIDITY_HIGH',
        severity: 'info',
        message: 'High humidity',
        acknowledged: false,
        createdAt: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/farms/${farmId}/alerts/acknowledge-all`,
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.count).toBeGreaterThanOrEqual(1);

      // Confirm unacknowledgedCount is now 0
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/farms/${farmId}/alerts`,
        headers: { authorization: 'Bearer viewer-token' },
      });
      expect(checkRes.json().unacknowledgedCount).toBe(0);
    });
  });

  describe('4. Offline Detection (detectOfflineDevices)', () => {
    it('detects device with stale lastSeenAt, marks it offline, and emits DEVICE_OFFLINE alert', async () => {
      // staleDeviceId has lastSeenAt 30 minutes ago, status "online"
      const res = await detectOfflineDevices(new Date(), 15 * 60 * 1000);

      expect(res.devicesMarkedOffline).toBeGreaterThanOrEqual(1);
      expect(res.alertsCreated).toBeGreaterThanOrEqual(1);

      // Verify device status is now "offline"
      const devDoc = await firestore().doc(`farms/${farmId}/devices/${staleDeviceId}`).get();
      expect(devDoc.data()?.status).toBe('offline');

      // Verify DEVICE_OFFLINE alert was created
      const alertSnap = await firestore()
        .collection(`farms/${farmId}/alerts`)
        .where('deviceId', '==', staleDeviceId)
        .where('type', '==', 'DEVICE_OFFLINE')
        .get();

      expect(alertSnap.empty).toBe(false);
      const alert = alertSnap.docs[0].data();
      expect(alert.severity).toBe('warning');
      expect(alert.acknowledged).toBe(false);
      expect(alert.message).toContain('has not reported for');
    });

    it('does NOT create duplicate DEVICE_OFFLINE alert when unacknowledged one already exists', async () => {
      // Temporarily mark stale device back to "online" to simulate detector running again
      await firestore().doc(`farms/${farmId}/devices/${staleDeviceId}`).update({
        status: 'online',
        lastSeenAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      });

      const res = await detectOfflineDevices(new Date(), 15 * 60 * 1000);
      expect(res.devicesMarkedOffline).toBeGreaterThanOrEqual(1);
      // Alerts created should be 0 because unacknowledged alert already exists
      expect(res.alertsCreated).toBe(0);
    });
  });
});
