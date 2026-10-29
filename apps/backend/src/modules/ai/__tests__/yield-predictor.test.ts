import { describe, it, expect, beforeAll } from 'vitest';
import { firestore, initFirebase } from '../../../plugins/firebase.js';
import {
  calculateDailyGDD,
  calculateAccumulatedGDD,
  calculateYieldPenalty,
  predictCropYield,
  predictYieldForFarm,
  MAX_PENALTY_CAP,
} from '../yield-predictor.service.js';

describe('Yield Prediction & GDD Service', () => {
  beforeAll(() => {
    initFirebase();
  });

  describe('Pure Math: Growing Degree Days (GDD)', () => {
    it('calculates daily GDD with 10°C base temperature correctly', () => {
      // (30 + 20) / 2 = 25 -> 25 - 10 = 15
      expect(calculateDailyGDD(30, 20)).toBe(15);

      // (36 + 24) / 2 = 30 -> 30 - 10 = 20
      expect(calculateDailyGDD(36, 24)).toBe(20);

      // Cold day: (12 + 4) / 2 = 8 -> max(0, 8 - 10) = 0
      expect(calculateDailyGDD(12, 4)).toBe(0);

      // Exactly at base: (15 + 5) / 2 = 10 -> 10 - 10 = 0
      expect(calculateDailyGDD(15, 5)).toBe(0);
    });

    it('accumulates GDD over multiple days accurately', () => {
      const days = [
        { tempMax: 30, tempMin: 20 }, // 15
        { tempMax: 12, tempMin: 4 },  // 0
        { tempMax: 36, tempMin: 24 }, // 20
      ];
      expect(calculateAccumulatedGDD(days)).toBe(35);
    });
  });

  describe('Pure Math: Stress Penalties & 40% Cap', () => {
    it('calculates standard stress penalties accurately', () => {
      // 2 drought days (0.06), 1 heat day (0.02), 0 flood days
      // penalty = 0.08 (8%)
      const result = calculateYieldPenalty(2, 1, 0);
      expect(result.rawPenalty).toBeCloseTo(0.08);
      expect(result.penalty).toBe(0.08);
      expect(result.yieldLossPct).toBe(8);
    });

    it('strictly caps stress penalties at 40% (0.40) regardless of extreme stress counts', () => {
      // 10 drought days (0.30) + 10 heat days (0.20) + 4 flood days (0.20) = 0.70 (70%)
      const extreme = calculateYieldPenalty(10, 10, 4);
      expect(extreme.rawPenalty).toBeCloseTo(0.70);
      expect(extreme.penalty).toBe(MAX_PENALTY_CAP);
      expect(extreme.penalty).toBe(0.40);
      expect(extreme.yieldLossPct).toBe(40);
    });

    it('predicts crop yield correctly accounting for penalties and base yield', () => {
      // Rice: base 2200, 0% loss -> 2200
      const riceOptimal = predictCropYield('rice', 0);
      expect(riceOptimal.baseYield).toBe(2200);
      expect(riceOptimal.predictedYield).toBe(2200);

      // Tomato: base 12000, 10% penalty -> 10800
      const tomatoStress = predictCropYield('tomato', 0.10);
      expect(tomatoStress.baseYield).toBe(12000);
      expect(tomatoStress.predictedYield).toBe(10800);

      // Wheat: base 1800, extreme stress (raw 0.60 capped at 0.40) -> 1800 * 0.60 = 1080
      const wheatExtreme = predictCropYield('wheat', 0.60);
      expect(wheatExtreme.baseYield).toBe(1800);
      expect(wheatExtreme.predictedYield).toBe(1080);
    });
  });

  describe('End-to-End Firestore Integration', () => {
    it('predicts yield, counts telemetry stress days, and writes to farms/{farmId}/ai/yield_report', async () => {
      const farmId = `farm_yield_${Date.now()}`;
      const deviceId = `dev_yield_${Date.now()}`;
      const now = new Date('2026-10-25T12:00:00.000Z');

      // 1. Create farm with tomato crop and configured plantingDate (3 days ago)
      await firestore().doc(`farms/${farmId}`).set({
        name: 'Yield Test Farm',
        cropType: 'tomato',
        plantingDate: '2026-10-22T00:00:00.000Z',
        areaAcres: 2,
        createdAt: new Date().toISOString(),
      });

      // 2. Create device
      await firestore().doc(`farms/${farmId}/devices/${deviceId}`).set({
        name: 'Field Node 1',
        status: 'online',
      });

      // 3. Write telemetry readings into daily buckets:
      // Day 1 (2026-10-22): Normal conditions (T=28, Soil=45)
      await firestore()
        .collection(`farms/${farmId}/devices/${deviceId}/readings_2026_10_22`)
        .add({
          nodeId: 1,
          temperature: 28,
          humidity: 60,
          soilMoisture: 45,
          recordedAt: '2026-10-22T10:00:00.000Z',
        });

      // Day 2 (2026-10-23): Drought stress condition (Soil=16 < 20)
      await firestore()
        .collection(`farms/${farmId}/devices/${deviceId}/readings_2026_10_23`)
        .add({
          nodeId: 1,
          temperature: 30,
          humidity: 50,
          soilMoisture: 16,
          recordedAt: '2026-10-23T10:00:00.000Z',
        });

      // Day 3 (2026-10-24): Heat stress condition (Temp=41 > 38)
      await firestore()
        .collection(`farms/${farmId}/devices/${deviceId}/readings_2026_10_24`)
        .add({
          nodeId: 1,
          temperature: 41,
          humidity: 35,
          soilMoisture: 35,
          recordedAt: '2026-10-24T14:00:00.000Z',
        });

      // Execute prediction
      const report = await predictYieldForFarm(farmId, now);

      expect(report).not.toBeNull();
      expect(report?.crop).toBe('tomato');
      expect(report?.baseYield).toBe(12000);
      expect(report?.stressEvents.droughtDays).toBe(1);
      expect(report?.stressEvents.heatStressDays).toBe(1);
      expect(report?.stressEvents.floodDays).toBe(0);

      // Penalty = 0.03 (drought) + 0.02 (heat) = 0.05 (5%)
      // Predicted yield = 12000 * 0.95 = 11400
      expect(report?.yieldLossPct).toBe(5);
      expect(report?.predictedYield).toBe(11400);

      // Verify Firestore document persistence
      const savedDoc = await firestore().doc(`farms/${farmId}/ai/yield_report`).get();
      expect(savedDoc.exists).toBe(true);
      const data = savedDoc.data();
      expect(data?.crop).toBe('tomato');
      expect(data?.predictedYield).toBe(11400);
      expect(data?.message).toContain('Predicted yield is reduced by 5%');
    });

    it('falls back to 30 days ago default planting date when plantingDate is null/missing', async () => {
      const farmId = `farm_yield_default_${Date.now()}`;

      await firestore().doc(`farms/${farmId}`).set({
        name: 'No Planting Date Farm',
        cropType: 'wheat',
        plantingDate: null,
        areaAcres: 1,
      });

      const report = await predictYieldForFarm(farmId);
      expect(report).not.toBeNull();
      expect(report?.crop).toBe('wheat');
      expect(report?.baseYield).toBe(1800);
      expect(report?.usingDefaultPlantingDate).toBe(true);
      expect(report?.message).toContain('Default planting date of 30 days ago was used');
    });
  });
});

