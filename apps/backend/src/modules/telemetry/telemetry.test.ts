import { describe, it, expect, beforeAll } from 'vitest';
import { handleTelemetryMessage } from './telemetry.handler.js';
import { firestore, initFirebase } from '../../plugins/firebase.js';

describe('Telemetry Ingestion Handler', () => {
  beforeAll(() => {
    initFirebase();
  });

  it('parses valid telemetry payload with numeric nodeId and writes to Firestore', async () => {
    const farmId = 'testFarm1';
    const deviceId = 'testNode1';
    const topic = `krishiva/${farmId}/${deviceId}/telemetry`;

    // Pre-create parent device doc to test lastSeenAt and status update
    const deviceDocRef = firestore().doc(`farms/${farmId}/devices/${deviceId}`);
    await deviceDocRef.set({
      nodeId: 1,
      name: 'Test Sensor',
      type: 'sensor',
      status: 'offline',
      createdAt: new Date().toISOString(),
    });

    const payload = JSON.stringify({
      nodeId: '1', // string "1" coerced to number 1
      temperature: 24.5,
      humidity: 65.2,
      soilMoisture: 42.0,
      recordedAt: new Date().toISOString(),
    });

    await handleTelemetryMessage(topic, payload);

    // Verify latest reading document
    const latestDocRef = firestore().doc(`farms/${farmId}/devices/${deviceId}/latest/current`);
    const latestSnapshot = await latestDocRef.get();

    expect(latestSnapshot.exists).toBe(true);
    const data = latestSnapshot.data();
    expect(data?.nodeId).toBe(1);
    expect(data?.temperature).toBe(24.5);
    expect(data?.humidity).toBe(65.2);
    expect(data?.soilMoisture).toBe(42.0);
    expect(data?.status).toBe('online');

    // Verify device document status and lastSeenAt were updated
    const deviceSnapshot = await deviceDocRef.get();
    const deviceData = deviceSnapshot.data();
    expect(deviceData?.status).toBe('online');
    expect(deviceData?.lastSeenAt).toBeDefined();

    // Clean up test documents
    await latestDocRef.delete();
    await deviceDocRef.delete();
  });

  it('rejects invalid payload without throwing uncaught errors', async () => {
    const topic = 'krishiva/testFarm1/testNode1/telemetry';
    const invalidPayload = JSON.stringify({
      nodeId: 99, // out of range 1-4
    });

    // Should handle gracefully
    await expect(handleTelemetryMessage(topic, invalidPayload)).resolves.not.toThrow();
  });
});
