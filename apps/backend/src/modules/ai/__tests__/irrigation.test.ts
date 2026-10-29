import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { firestore, initFirebase } from '../../../plugins/firebase.js';
import {
  computeIrrigationPrediction,
} from '../irrigation.service.js';

describe('Predictive Irrigation Engine (Linear Depletion & Weather Override)', () => {
  const farmId = 'irrigationTestFarm';

  beforeAll(() => {
    initFirebase();
  });

  beforeEach(async () => {
    // Clear weather & prediction docs
    await firestore().doc(`farms/${farmId}/ai/irrigation`).delete();
    await firestore().doc(`farms/${farmId}/weather/latest`).delete();
  });

  async function seedReadings(
    deviceId: string,
    readings: Array<{ soilMoisture: number; hoursAgo: number }>,
    baseTime: Date
  ) {
    for (const r of readings) {
      const recDate = new Date(baseTime.getTime() - r.hoursAgo * 60 * 60 * 1000);
      const yyyy = recDate.getUTCFullYear();
      const mm = String(recDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(recDate.getUTCDate()).padStart(2, '0');
      const bucket = `readings_${yyyy}_${mm}_${dd}`;

      await firestore()
        .collection(`farms/${farmId}/devices/${deviceId}/${bucket}`)
        .add({
          nodeId: 1,
          temperature: 28,
          humidity: 50,
          soilMoisture: r.soilMoisture,
          recordedAt: recDate.toISOString(),
        });
    }
  }

  it('calculates linear depletion slope over 6 hours and predicts forward accurately', async () => {
    const deviceId = `dev_irrig1_${Date.now()}`;
    const now = new Date('2026-10-29T12:00:00.000Z');
    // Depletion from 36% down to 26% over 5 hours => 2% drop per hour
    await seedReadings(
      deviceId,
      [
        { soilMoisture: 36, hoursAgo: 5 },
        { soilMoisture: 32, hoursAgo: 3 },
        { soilMoisture: 26, hoursAgo: 0 },
      ],
      now
    );

    const prediction = await computeIrrigationPrediction(farmId, deviceId, now);

    expect(prediction).not.toBeNull();
    expect(prediction!.currentSoil).toBe(26);
    // Rate is (36 - 26) / 5 = 2%/hour
    // 1h: 26 - 2 = 24
    // 3h: 26 - 6 = 20
    // 6h: 26 - 12 = 14
    expect(prediction!.predicted1h).toBe(24);
    expect(prediction!.predicted3h).toBe(20);
    expect(prediction!.predicted6h).toBe(14);
  });

  it('triggers IRRIGATE_SOON when current soil is 25% dropping 2%/hour (predicted3h < 25)', async () => {
    const deviceId = `dev_irrig2_${Date.now()}`;
    const now = new Date('2026-10-29T12:00:00.000Z');
    // Depletion: 35% at 5 hours ago down to 25% at 0 hours ago => 2% drop per hour
    await seedReadings(
      deviceId,
      [
        { soilMoisture: 35, hoursAgo: 5 },
        { soilMoisture: 30, hoursAgo: 2.5 },
        { soilMoisture: 25, hoursAgo: 0 },
      ],
      now
    );

    const prediction = await computeIrrigationPrediction(farmId, deviceId, now);

    expect(prediction).not.toBeNull();
    expect(prediction!.currentSoil).toBe(25);
    // 1h: 23 (>= 20)
    // 3h: 19 (< 25) => IRRIGATE_SOON
    expect(prediction!.predicted1h).toBe(23);
    expect(prediction!.predicted3h).toBe(19);
    expect(prediction!.action).toBe('IRRIGATE_SOON');
    expect(prediction!.urgency).toBe('medium');
    expect(prediction!.message).toContain('Soil moisture will drop to 19% in 3 hours');

    // Verify written to Firestore
    const stored = await firestore().doc(`farms/${farmId}/ai/irrigation`).get();
    expect(stored.exists).toBe(true);
    expect(stored.data()?.action).toBe('IRRIGATE_SOON');
    expect(stored.data()?.urgency).toBe('medium');
  });

  it('triggers IRRIGATE_NOW with high urgency when predicted1h < 20', async () => {
    const deviceId = `dev_irrig3_${Date.now()}`;
    const now = new Date('2026-10-29T12:00:00.000Z');
    // Depletion: 32% at 4 hours ago down to 20% at 0 hours ago => 3% drop per hour
    // 1h: 20 - 3 = 17 (< 20)
    await seedReadings(
      deviceId,
      [
        { soilMoisture: 32, hoursAgo: 4 },
        { soilMoisture: 26, hoursAgo: 2 },
        { soilMoisture: 20, hoursAgo: 0 },
      ],
      now
    );

    const prediction = await computeIrrigationPrediction(farmId, deviceId, now);

    expect(prediction).not.toBeNull();
    expect(prediction!.currentSoil).toBe(20);
    expect(prediction!.predicted1h).toBe(17);
    expect(prediction!.action).toBe('IRRIGATE_NOW');
    expect(prediction!.urgency).toBe('high');
    expect(prediction!.message).toContain('Irrigate now');
  });

  it('overrides to WAIT_FOR_RAIN when heavy rain is forecast (rainNext6hMm > 5)', async () => {
    const deviceId = `dev_irrig4_${Date.now()}`;
    const now = new Date('2026-10-29T12:00:00.000Z');
    // Set heavy rain forecast
    await firestore().doc(`farms/${farmId}/weather/latest`).set({
      rainNext6hMm: 14.5,
      rainNext24hMm: 28.0,
      fetchedAt: now.toISOString(),
      timezone: 'Asia/Kolkata',
    });

    // Readings with soil currently 35% dropping at 2%/h
    // Without rain: 1h=33, 3h=29
    // With rain (50% slower drop = 1%/h): 1h=34, 3h=32
    // predicted1h >= 20, predicted3h >= 25, rainNext6hMm > 5 => WAIT_FOR_RAIN
    await seedReadings(
      deviceId,
      [
        { soilMoisture: 45, hoursAgo: 5 },
        { soilMoisture: 40, hoursAgo: 2.5 },
        { soilMoisture: 35, hoursAgo: 0 },
      ],
      now
    );

    const prediction = await computeIrrigationPrediction(farmId, deviceId, now);

    expect(prediction).not.toBeNull();
    expect(prediction!.action).toBe('WAIT_FOR_RAIN');
    expect(prediction!.urgency).toBe('low');
    expect(prediction!.message).toContain('Rain expected in the next 6 hours (14.5 mm)');
  });

  it('returns NO_ACTION when soil moisture is healthy and no rain or stress is imminent', async () => {
    const deviceId = `dev_irrig5_${Date.now()}`;
    const now = new Date('2026-10-29T12:00:00.000Z');
    // Soil 50% dropping 1%/h -> 1h=49, 3h=47
    await seedReadings(
      deviceId,
      [
        { soilMoisture: 55, hoursAgo: 5 },
        { soilMoisture: 52.5, hoursAgo: 2.5 },
        { soilMoisture: 50, hoursAgo: 0 },
      ],
      now
    );

    const prediction = await computeIrrigationPrediction(farmId, deviceId, now);

    expect(prediction).not.toBeNull();
    expect(prediction!.currentSoil).toBe(50);
    expect(prediction!.action).toBe('NO_ACTION');
    expect(prediction!.urgency).toBe('none');
    expect(prediction!.message).toContain('healthy');
  });
});
