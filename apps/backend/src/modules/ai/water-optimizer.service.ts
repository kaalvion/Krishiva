import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';

export const PUMP_FLOW_LPM = 50; // Litres per minute
export const LITRES_PER_MM_ACRE = 4046; // 1 mm of water across 1 acre = 4046 litres

/**
 * Crop coefficient (Kc) mapping for evapotranspiration adjustment.
 */
export const CROP_KC_MAP: Record<string, number> = {
  tomato: 1.05,
  grapes: 0.85,
  paddy: 1.15,
  rice: 1.15,
  wheat: 1.10,
  cotton: 1.05,
  sugarcane: 1.25,
};

export interface WaterReport {
  farmId?: string;
  actualLitres: number;
  optimalLitres: number;
  efficiencyPct: number;
  suggestion: string;
  totalPumpSeconds: number;
  pumpSessionsCount: number;
  et0SumMm: number;
  cropCoefficient: number;
  cropType: string;
  areaAcres: number;
  computedAt: string;
}

/**
 * Resolves crop coefficient (Kc), defaulting to 1.0 for unknown crops.
 */
export function getCropCoefficient(cropType?: string | null): number {
  if (!cropType) return 1.0;
  const normalized = cropType.toLowerCase().trim();
  return CROP_KC_MAP[normalized] ?? 1.0;
}

/**
 * Pure calculation: actual litres given cumulative pump duration in seconds.
 * actualLitres = (totalSeconds / 60) * 50
 */
export function calculateActualLitres(totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.round(((totalSeconds / 60) * PUMP_FLOW_LPM) * 100) / 100;
}

/**
 * Pure calculation: optimal litres given ET0 sum (mm), crop type, and farm area (acres).
 * ETc = sum(et0Mm) * Kc
 * optimalLitres = ETc * 4046 * farm.areaAcres
 */
export function calculateOptimalLitres(
  sumEt0Mm: number,
  cropType: string | undefined | null,
  areaAcres: number
): { optimalLitres: number; kc: number; etcMm: number } {
  const kc = getCropCoefficient(cropType);
  const etcMm = Math.max(0, sumEt0Mm) * kc;
  const acres = Math.max(0, areaAcres || 1);
  const optimalLitres = Math.round(etcMm * LITRES_PER_MM_ACRE * acres * 100) / 100;
  return { optimalLitres, kc, etcMm };
}

/**
 * Pure calculation: water efficiency percentage: (optimalLitres / actualLitres) * 100.
 * Handles division by zero safely.
 */
export function calculateWaterEfficiency(actualLitres: number, optimalLitres: number): number {
  if (actualLitres <= 0) {
    return optimalLitres <= 0 ? 100 : 0;
  }
  return Math.round((optimalLitres / actualLitres) * 1000) / 10;
}

/**
 * Generates recommendation suggestion based on actual vs optimal litres.
 */
export function generateWaterSuggestion(
  actualLitres: number,
  optimalLitres: number,
  pumpSessionsCount = 1
): string {
  if (actualLitres > optimalLitres * 1.2) {
    const xPct = Math.round(((actualLitres - optimalLitres) / (optimalLitres || 1)) * 100);
    const excessSeconds = (actualLitres - optimalLitres) * (60 / PUMP_FLOW_LPM);
    const sessions = Math.max(1, pumpSessionsCount);
    const yMinutes = Math.max(1, Math.round((excessSeconds / 60) / sessions));
    return `You are using ${xPct}% more water than the crop needs. Suggested: reduce each session by ${yMinutes} minutes.`;
  }

  if (actualLitres < optimalLitres * 0.8) {
    return 'Your crop may be under-watered. Consider increasing irrigation.';
  }

  return 'Water usage is optimal for current crop needs and evapotranspiration conditions.';
}

/**
 * Computes water usage vs optimal for a farm over the last 30 days and writes to
 * farms/{farmId}/ai/water_report.
 */
export async function computeWaterReportForFarm(
  farmId: string,
  now: Date = new Date()
): Promise<WaterReport | null> {
  if (!farmId) {
    throw new Error('farmId is required');
  }

  const farmDocSnap = await firestore().doc(`farms/${farmId}`).get();
  if (!farmDocSnap.exists) {
    logger.warn({ farmId }, 'Cannot compute water report: farm document not found');
    return null;
  }

  const farmData = farmDocSnap.data() || {};
  const areaAcres = Number(farmData.areaAcres) || 1;
  const cropType = farmData.cropType || 'default';

  // 1. Fetch commands from the last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  let totalPumpSeconds = 0;
  let pumpSessionsCount = 0;

  try {
    const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();
    for (const devDoc of devicesSnap.docs) {
      const cmdsSnap = await devDoc.ref.collection('commands').get();
      for (const cmdDoc of cmdsSnap.docs) {
        const cmd = cmdDoc.data();
        if (cmd?.action === 'PUMP_ON') {
          const createdAt = cmd.createdAt || '';
          if (!createdAt || createdAt >= thirtyDaysAgoIso) {
            const sec = Number(cmd.durationSeconds) || 0;
            totalPumpSeconds += sec;
            pumpSessionsCount++;
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err, farmId }, 'Failed to query commands for water report calculation');
  }

  const actualLitres = calculateActualLitres(totalPumpSeconds);

  // 2. Fetch weather/latest and sum et0Mm from dailySummary (last 30 days)
  let sumEt0Mm = 0;
  try {
    const weatherSnap = await firestore().doc(`farms/${farmId}/weather/latest`).get();
    if (weatherSnap.exists) {
      const weatherData = weatherSnap.data();
      const daily = weatherData?.dailySummary || [];
      for (const day of daily) {
        sumEt0Mm += Number(day?.et0Mm ?? day?.et0 ?? 0);
      }
      // If dailySummary lacked et0Mm, check hourly forecast
      if (sumEt0Mm === 0 && Array.isArray(weatherData?.hourly)) {
        for (const h of weatherData.hourly) {
          sumEt0Mm += Number(h?.et0Mm || 0);
        }
      }
    }
  } catch (err) {
    logger.warn({ err, farmId }, 'Failed to fetch weather for water report calculation');
  }

  // 3. Optimal litres
  const { optimalLitres, kc } = calculateOptimalLitres(sumEt0Mm, cropType, areaAcres);

  // 4. Efficiency percentage
  const efficiencyPct = calculateWaterEfficiency(actualLitres, optimalLitres);

  // 5. Actionable suggestion
  const suggestion = generateWaterSuggestion(actualLitres, optimalLitres, pumpSessionsCount);

  // 6. Persist to farms/{farmId}/ai/water_report
  const report: WaterReport = {
    farmId,
    actualLitres,
    optimalLitres,
    efficiencyPct,
    suggestion,
    totalPumpSeconds,
    pumpSessionsCount,
    et0SumMm: Math.round(sumEt0Mm * 100) / 100,
    cropCoefficient: kc,
    cropType,
    areaAcres,
    computedAt: now.toISOString(),
  };

  await firestore().doc(`farms/${farmId}/ai/water_report`).set(report);
  logger.info({ farmId, actualLitres, optimalLitres, efficiencyPct }, 'Water report persisted');
  return report;
}

/**
 * Computes water reports for all active farms.
 */
export async function computeWaterReportsForAllFarms(): Promise<void> {
  try {
    const farmsSnap = await firestore().collection('farms').get();
    for (const farmDoc of farmsSnap.docs) {
      try {
        await computeWaterReportForFarm(farmDoc.id);
      } catch (err) {
        logger.warn({ farmId: farmDoc.id, err }, 'Failed to compute water report for farm');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to enumerate farms for water reports');
  }
}

