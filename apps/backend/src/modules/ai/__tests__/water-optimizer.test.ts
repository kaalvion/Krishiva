import { describe, it, expect, beforeAll } from 'vitest';
import { firestore, initFirebase } from '../../../plugins/firebase.js';
import {
  calculateActualLitres,
  calculateOptimalLitres,
  calculateWaterEfficiency,
  generateWaterSuggestion,
  computeWaterReportForFarm,
  getCropCoefficient,
} from '../water-optimizer.service.js';

describe('Water Usage Optimizer Service', () => {
  beforeAll(() => {
    initFirebase();
  });

  describe('Pure Math: Actual Litres Calculation', () => {
    it('returns 0 for zero or negative duration', () => {
      expect(calculateActualLitres(0)).toBe(0);
      expect(calculateActualLitres(-10)).toBe(0);
    });

    it('calculates actual litres at 50 LPM flow rate accurately', () => {
      // 60 seconds = 1 minute -> 50 litres
      expect(calculateActualLitres(60)).toBe(50);
      // 1800 seconds = 30 minutes -> 1500 litres
      expect(calculateActualLitres(1800)).toBe(1500);
      // 3600 seconds = 60 minutes -> 3000 litres
      expect(calculateActualLitres(3600)).toBe(3000);
    });
  });

  describe('Pure Math: Optimal Litres & Crop Coefficients', () => {
    it('resolves correct crop coefficients (Kc)', () => {
      expect(getCropCoefficient('tomato')).toBe(1.05);
      expect(getCropCoefficient('grapes')).toBe(0.85);
      expect(getCropCoefficient('paddy')).toBe(1.15);
      expect(getCropCoefficient('wheat')).toBe(1.10);
      expect(getCropCoefficient('cotton')).toBe(1.05);
      expect(getCropCoefficient('sugarcane')).toBe(1.25);
      expect(getCropCoefficient('unknown_crop')).toBe(1.0);
      expect(getCropCoefficient(null)).toBe(1.0);
    });

    it('calculates optimal litres given et0, crop type and acreage', () => {
      // Tomato (Kc = 1.05), sum et0 = 10mm, 2 acres
      // ETc = 10 * 1.05 = 10.5 mm
      // optimalLitres = 10.5 * 4046 * 2 = 84966
      const tomato = calculateOptimalLitres(10, 'tomato', 2);
      expect(tomato.kc).toBe(1.05);
      expect(tomato.etcMm).toBe(10.5);
      expect(tomato.optimalLitres).toBe(84966);

      // Grapes (Kc = 0.85), sum et0 = 20mm, 1 acre
      // ETc = 20 * 0.85 = 17 mm
      // optimalLitres = 17 * 4046 * 1 = 68782
      const grapes = calculateOptimalLitres(20, 'grapes', 1);
      expect(grapes.kc).toBe(0.85);
      expect(grapes.etcMm).toBe(17);
      expect(grapes.optimalLitres).toBe(68782);

      // Default crop (Kc = 1.0), sum et0 = 10mm, 1 acre
      // optimalLitres = 10 * 4046 * 1 = 40460
      const defaultCrop = calculateOptimalLitres(10, 'corn', 1);
      expect(defaultCrop.optimalLitres).toBe(40460);
    });
  });

  describe('Pure Math: Efficiency & Actionable Suggestions', () => {
    it('calculates efficiency percentage correctly and handles division by zero', () => {
      expect(calculateWaterEfficiency(1000, 1000)).toBe(100);
      expect(calculateWaterEfficiency(2000, 1000)).toBe(50);
      expect(calculateWaterEfficiency(1000, 2000)).toBe(200);

      // Edge cases
      expect(calculateWaterEfficiency(0, 0)).toBe(100);
      expect(calculateWaterEfficiency(0, 500)).toBe(0);
    });

    it('suggests reducing session duration when water is overused (> 120% optimal)', () => {
      // actual: 2000, optimal: 1000 -> 100% excess
      const suggestion = generateWaterSuggestion(2000, 1000, 2);
      expect(suggestion).toContain('You are using 100% more water than the crop needs');
      expect(suggestion).toContain('Suggested: reduce each session');
    });

    it('suggests increasing irrigation when crop is under-watered (< 80% optimal)', () => {
      const suggestion = generateWaterSuggestion(700, 1000);
      expect(suggestion).toBe('Your crop may be under-watered. Consider increasing irrigation.');
    });

    it('indicates optimal usage when within 80% - 120% range', () => {
      const suggestion = generateWaterSuggestion(1000, 1000);
      expect(suggestion).toContain('Water usage is optimal');
    });
  });

  describe('End-to-End Firestore Integration', () => {
    it('computes water report from commands and weather, then writes to farms/{farmId}/ai/water_report', async () => {
      const farmId = `farm_water_${Date.now()}`;
      const deviceId = `dev_water_${Date.now()}`;

      // 1. Create farm doc
      await firestore().doc(`farms/${farmId}`).set({
        name: 'Water Test Farm',
        cropType: 'tomato',
        areaAcres: 1,
        createdAt: new Date().toISOString(),
      });

      // 2. Create device doc
      await firestore().doc(`farms/${farmId}/devices/${deviceId}`).set({
        name: 'Pump Controller',
        status: 'online',
        capabilities: ['pump'],
      });

      // 3. Create weather doc with dailySummary
      await firestore().doc(`farms/${farmId}/weather/latest`).set({
        source: 'open-meteo',
        timezone: 'Asia/Kolkata',
        dailySummary: [
          { date: '2026-10-20', tempMax: 32, tempMin: 22, et0Mm: 4.0 },
          { date: '2026-10-21', tempMax: 30, tempMin: 20, et0Mm: 6.0 },
        ],
        fetchedAt: new Date().toISOString(),
      });

      // 4. Create PUMP_ON command in last 30 days
      // 1800 seconds = 30 min -> 1500 litres actual
      await firestore().doc(`farms/${farmId}/devices/${deviceId}/commands/cmd_1`).set({
        action: 'PUMP_ON',
        durationSeconds: 1800,
        createdAt: new Date().toISOString(),
      });

      // Execute calculation
      const report = await computeWaterReportForFarm(farmId);
      expect(report).not.toBeNull();
      expect(report?.actualLitres).toBe(1500);

      // ETc = (4 + 6) * 1.05 = 10.5 mm
      // optimal = 10.5 * 4046 * 1 = 42483 litres
      expect(report?.optimalLitres).toBe(42483);
      expect(report?.cropCoefficient).toBe(1.05);
      expect(report?.suggestion).toBe('Your crop may be under-watered. Consider increasing irrigation.');

      // Check persisted doc
      const savedDoc = await firestore().doc(`farms/${farmId}/ai/water_report`).get();
      expect(savedDoc.exists).toBe(true);
      const data = savedDoc.data();
      expect(data?.actualLitres).toBe(1500);
      expect(data?.optimalLitres).toBe(42483);
    });
  });
});

