import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { firestore, initFirebase } from '../../../plugins/firebase.js';
import * as anomalyService from '../anomaly.service.js';
import {
  checkAnomaly,
  baselineCache,
  clearBaselineCache,
  setCachedBaseline,
} from '../anomaly.service.js';

describe('Z-Score Statistical Anomaly Detection Service', () => {
  const farmId = 'anomalyTestFarm';
  const deviceId = 'anomalyTestDevice';

  beforeAll(() => {
    initFirebase();
  });

  beforeEach(async () => {
    clearBaselineCache();
    vi.restoreAllMocks();

    // Clean up test anomalies
    const snap = await firestore().collection(`farms/${farmId}/anomalies`).get();
    for (const d of snap.docs) {
      await d.ref.delete();
    }
  });

  it('Test Z-score math: given μ=25, σ=2, a value of 32 should be flagged with z=3.5', async () => {
    const fixedIso = '2026-10-29T10:00:00.000Z'; // Hour = 10 UTC
    const hour = 10;

    // Seed in-memory baseline
    setCachedBaseline(farmId, deviceId, 'temperature', hour, {
      mean: 25,
      stdDev: 2,
      sampleCount: 14,
    });
    // Set normal baselines for other fields so they are not flagged
    setCachedBaseline(farmId, deviceId, 'humidity', hour, {
      mean: 50,
      stdDev: 5,
      sampleCount: 14,
    });
    setCachedBaseline(farmId, deviceId, 'soilMoisture', hour, {
      mean: 35,
      stdDev: 3,
      sampleCount: 14,
    });

    const reading = {
      nodeId: 1,
      temperature: 32,
      humidity: 50,
      soilMoisture: 35,
      recordedAt: fixedIso,
    };

    const detected = await checkAnomaly(farmId, deviceId, reading);

    expect(detected.length).toBe(1);
    const anomaly = detected[0];
    expect(anomaly.field).toBe('temperature');
    expect(anomaly.value).toBe(32);
    expect(anomaly.expected).toBe(25);
    expect(anomaly.zScore).toBe(3.5);
    expect(anomaly.severity).toBe('warning');
    expect(anomaly.message).toBe('temperature = 32°C (expected ~25°C)');

    // Verify written to Firestore
    const querySnap = await firestore()
      .collection(`farms/${farmId}/anomalies`)
      .where('deviceId', '==', deviceId)
      .where('field', '==', 'temperature')
      .get();

    expect(querySnap.empty).toBe(false);
    expect(querySnap.size).toBe(1);
    const firestoreData = querySnap.docs[0].data();
    expect(firestoreData.zScore).toBe(3.5);
    expect(firestoreData.value).toBe(32);
    expect(firestoreData.expected).toBe(25);
    expect(firestoreData.severity).toBe('warning');
    expect(firestoreData.message).toBe('temperature = 32°C (expected ~25°C)');
  });

  it('flags severe anomaly as critical when |z| > 4', async () => {
    const fixedIso = '2026-10-29T14:00:00.000Z'; // Hour = 14 UTC
    const hour = 14;

    setCachedBaseline(farmId, deviceId, 'soilMoisture', hour, {
      mean: 40,
      stdDev: 3,
      sampleCount: 10,
    });
    setCachedBaseline(farmId, deviceId, 'temperature', hour, {
      mean: 25,
      stdDev: 2,
      sampleCount: 10,
    });
    setCachedBaseline(farmId, deviceId, 'humidity', hour, {
      mean: 60,
      stdDev: 5,
      sampleCount: 10,
    });

    // Soil moisture of 10 -> z = (10 - 40) / 3 = -10 (|z| = 10 > 4)
    const reading = {
      nodeId: 1,
      temperature: 25,
      humidity: 60,
      soilMoisture: 10,
      recordedAt: fixedIso,
    };

    const detected = await checkAnomaly(farmId, deviceId, reading);
    expect(detected.length).toBe(1);
    expect(detected[0].field).toBe('soilMoisture');
    expect(detected[0].zScore).toBe(-10);
    expect(detected[0].severity).toBe('critical');
    expect(detected[0].message).toBe('soilMoisture = 10% (expected ~40%)');
  });

  it('Test cache hits: a second call for the same farm/device/field/hour should not query Firestore again', async () => {
    const fixedIso = '2026-10-29T08:00:00.000Z';
    const hour = 8;

    // Pre-populate baseline cache
    setCachedBaseline(farmId, deviceId, 'temperature', hour, {
      mean: 22,
      stdDev: 1.5,
      sampleCount: 10,
    });
    setCachedBaseline(farmId, deviceId, 'humidity', hour, {
      mean: 65,
      stdDev: 4,
      sampleCount: 10,
    });
    setCachedBaseline(farmId, deviceId, 'soilMoisture', hour, {
      mean: 30,
      stdDev: 2,
      sampleCount: 10,
    });

    const spyFetch = vi.spyOn(anomalyService, 'fetchHistoricalReadings');

    // 1st call
    await checkAnomaly(farmId, deviceId, {
      nodeId: 1,
      temperature: 22,
      humidity: 65,
      soilMoisture: 30,
      recordedAt: fixedIso,
    });

    // 2nd call
    await checkAnomaly(farmId, deviceId, {
      nodeId: 1,
      temperature: 23,
      humidity: 64,
      soilMoisture: 31,
      recordedAt: fixedIso,
    });

    // Should NOT have queried Firestore for historical readings since cache was hit
    expect(spyFetch).not.toHaveBeenCalled();
  });

  it('Test cache miss: a call for an hour with no historical data should skip gracefully', async () => {
    const fixedIso = '2026-10-29T03:00:00.000Z'; // Hour = 3 UTC
    clearBaselineCache();

    // Device with no history in daily buckets
    const emptyDevId = `emptyDev_${Date.now()}`;
    const reading = {
      nodeId: 1,
      temperature: 24,
      humidity: 50,
      soilMoisture: 30,
      recordedAt: fixedIso,
    };

    const detected = await checkAnomaly(farmId, emptyDevId, reading);

    // No baselines exist, so no false positives are generated
    expect(detected).toEqual([]);

    // Check no documents were written to Firestore
    const snap = await firestore()
      .collection(`farms/${farmId}/anomalies`)
      .where('deviceId', '==', emptyDevId)
      .get();
    expect(snap.empty).toBe(true);
  });

  it('handles zero or negligible standard deviation without divide-by-zero errors', async () => {
    const fixedIso = '2026-10-29T12:00:00.000Z';
    const hour = 12;

    // σ is 0 (all historical readings were identical)
    setCachedBaseline(farmId, deviceId, 'temperature', hour, {
      mean: 25,
      stdDev: 0,
      sampleCount: 10,
    });
    setCachedBaseline(farmId, deviceId, 'humidity', hour, {
      mean: 50,
      stdDev: 0,
      sampleCount: 10,
    });
    setCachedBaseline(farmId, deviceId, 'soilMoisture', hour, {
      mean: 30,
      stdDev: 0,
      sampleCount: 10,
    });

    const reading = {
      nodeId: 1,
      temperature: 28,
      humidity: 52,
      soilMoisture: 31,
      recordedAt: fixedIso,
    };

    // Should not throw or generate NaN zScores
    const detected = await checkAnomaly(farmId, deviceId, reading);
    expect(detected).toEqual([]);
  });
});

