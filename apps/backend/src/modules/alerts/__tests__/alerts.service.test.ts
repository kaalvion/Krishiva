import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { firestore, initFirebase } from '../../../plugins/firebase.js';
import {
  checkAlerts,
  clearAlertCooldowns,
} from '../alerts.service.js';
import { alertQueue, clearAlertQueue } from '../../ai/alert-explainer.service.js';

describe('Smart Alerts Service (4 Rules & In-Memory Cooldowns)', () => {
  const farmId = 'smartAlertsTestFarm';

  beforeAll(() => {
    initFirebase();
  });

  beforeEach(async () => {
    clearAlertCooldowns();
    clearAlertQueue();

    // Clean up test alerts
    const alertsSnap = await firestore().collection(`farms/${farmId}/alerts`).get();
    for (const d of alertsSnap.docs) {
      await d.ref.delete();
    }
  });

  async function writeAndCheck(deviceId: string, reading: any) {
    const recDate = new Date(reading.recordedAt);
    const yyyy = recDate.getUTCFullYear();
    const mm = String(recDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(recDate.getUTCDate()).padStart(2, '0');
    const bucket = `readings_${yyyy}_${mm}_${dd}`;

    await firestore()
      .collection(`farms/${farmId}/devices/${deviceId}/${bucket}`)
      .add(reading);

    await checkAlerts(farmId, deviceId, reading);
  }

  it('RULE 2: CRITICAL DRY triggers immediately when soil < 15 on single reading', async () => {
    const deviceId = `dev_rule2_${Date.now()}`;
    const reading = {
      nodeId: 1,
      temperature: 28,
      humidity: 50,
      soilMoisture: 12,
      recordedAt: new Date().toISOString(),
    };

    await writeAndCheck(deviceId, reading);

    const alertsSnap = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'SOIL_MOISTURE_CRITICAL')
      .get();

    expect(alertsSnap.empty).toBe(false);
    expect(alertsSnap.size).toBe(1);
    const alertData = alertsSnap.docs[0].data();
    expect(alertData.severity).toBe('critical');
    expect(alertData.threshold).toBe(15);
    expect(alertData.value).toBe(12);
    expect(alertData.aiExplanation).toBeNull();
    expect(alertData.cooldownKey).toBe(`${deviceId}_SOIL_MOISTURE_CRITICAL`);

    // Alert was enqueued
    expect(alertQueue.length).toBeGreaterThanOrEqual(1);
    expect(alertQueue.some((q) => q.alertId === alertsSnap.docs[0].id)).toBe(true);
  });

  it('RULE 1: LOW SOIL triggers only on 2 CONSECUTIVE readings with soil < 25', async () => {
    const deviceId = `dev_rule1_${Date.now()}`;
    const now = Date.now();
    // 1st reading < 25 (e.g. 23)
    const reading1 = {
      nodeId: 1,
      temperature: 25,
      humidity: 50,
      soilMoisture: 23,
      recordedAt: new Date(now - 60000).toISOString(),
    };

    await writeAndCheck(deviceId, reading1);

    // Should NOT trigger LOW SOIL on only 1 reading
    const snap1 = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'SOIL_MOISTURE_LOW')
      .get();
    expect(snap1.empty).toBe(true);

    // 2nd consecutive reading < 25 (e.g. 21)
    const reading2 = {
      nodeId: 1,
      temperature: 25,
      humidity: 50,
      soilMoisture: 21,
      recordedAt: new Date(now).toISOString(),
    };

    await writeAndCheck(deviceId, reading2);

    // Now it SHOULD trigger LOW SOIL
    const snap2 = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'SOIL_MOISTURE_LOW')
      .get();
    expect(snap2.empty).toBe(false);
    expect(snap2.size).toBe(1);
    expect(snap2.docs[0].data().severity).toBe('warning');
    expect(snap2.docs[0].data().threshold).toBe(25);
  });

  it('RULE 3: HEAT STRESS triggers when temp > 40 AND humidity < 30', async () => {
    const deviceId = `dev_rule3_${Date.now()}`;
    // Normal temp / high hum -> no trigger
    const normalReading = {
      nodeId: 1,
      temperature: 38,
      humidity: 25,
      soilMoisture: 40,
      recordedAt: new Date().toISOString(),
    };
    await writeAndCheck(deviceId, normalReading);

    let heatSnap = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'HEAT_STRESS')
      .get();
    expect(heatSnap.empty).toBe(true);

    // Temp > 40 and humidity < 30 -> triggers
    const heatReading = {
      nodeId: 1,
      temperature: 42.5,
      humidity: 22.0,
      soilMoisture: 40,
      recordedAt: new Date(Date.now() + 1000).toISOString(),
    };
    await writeAndCheck(deviceId, heatReading);

    heatSnap = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'HEAT_STRESS')
      .get();
    expect(heatSnap.empty).toBe(false);
    expect(heatSnap.size).toBe(1);
    expect(heatSnap.docs[0].data().severity).toBe('warning');
    expect(heatSnap.docs[0].data().threshold).toBe(40);
  });

  it('RULE 4: RAPID DRY-DOWN triggers when soil drops > 15% in 3 hours', async () => {
    const deviceId = `dev_rule4_${Date.now()}`;
    const baseTime = Date.now();
    // Prior reading: soil was 50%
    const readingA = {
      nodeId: 1,
      temperature: 28,
      humidity: 50,
      soilMoisture: 50,
      recordedAt: new Date(baseTime - 30 * 60000).toISOString(),
    };
    await writeAndCheck(deviceId, readingA);

    // Current reading: soil drops to 32% (drop of 18% > 15%)
    const readingB = {
      nodeId: 1,
      temperature: 28,
      humidity: 50,
      soilMoisture: 32,
      recordedAt: new Date(baseTime).toISOString(),
    };
    await writeAndCheck(deviceId, readingB);

    const drySnap = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'RAPID_DRY_DOWN')
      .get();

    expect(drySnap.empty).toBe(false);
    expect(drySnap.size).toBe(1);
    expect(drySnap.docs[0].data().severity).toBe('warning');
    expect(drySnap.docs[0].data().value).toBe(18);
  });

  it('enforces in-memory cooldown to prevent duplicates within cooldown window', async () => {
    const deviceId = `dev_cooldown_${Date.now()}`;
    const reading = {
      nodeId: 1,
      temperature: 28,
      humidity: 50,
      soilMoisture: 10,
      recordedAt: new Date().toISOString(),
    };

    // 1st fire
    await writeAndCheck(deviceId, reading);

    const snap1 = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'SOIL_MOISTURE_CRITICAL')
      .get();
    expect(snap1.size).toBe(1);

    // 2nd fire immediately
    await writeAndCheck(deviceId, {
      ...reading,
      recordedAt: new Date(Date.now() + 1000).toISOString(),
    });

    const snap2 = await firestore()
      .collection(`farms/${farmId}/alerts`)
      .where('deviceId', '==', deviceId)
      .where('type', '==', 'SOIL_MOISTURE_CRITICAL')
      .get();
    expect(snap2.size).toBe(1); // Not duplicated
  });
});
