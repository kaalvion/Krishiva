import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { getDailyBucketNames } from '../telemetry/telemetry.routes.js';

export const BASE_TEMPERATURE_C = 10;
export const MAX_PENALTY_CAP = 0.40; // 40% maximum allowable yield loss penalty

/**
 * Base yields in kg per acre by crop type.
 */
export const BASE_YIELDS_KG_PER_ACRE: Record<string, number> = {
  rice: 2200,
  paddy: 2200,
  wheat: 1800,
  tomato: 12000,
};

export const DEFAULT_BASE_YIELD = 2000;

export interface StressEventsSummary {
  droughtDays: number;
  heatStressDays: number;
  floodDays: number;
  accumulatedGDD: number;
}

export interface YieldReport {
  farmId?: string;
  crop: string;
  baseYield: number;
  predictedYield: number;
  yieldLossPct: number;
  stressEvents: StressEventsSummary;
  confidencePct: number;
  message: string;
  computedAt: string;
  usingDefaultPlantingDate?: boolean;
}

export interface DailyTelemetryData {
  date: string;
  tempMax: number;
  tempMin: number;
  soilMoistures: number[];
}

/**
 * Pure calculation: Growing Degree Days (GDD) for a single day:
 * GDD = max(0, ((tempMax + tempMin) / 2) - 10)
 */
export function calculateDailyGDD(tempMax: number, tempMin: number): number {
  const avgTemp = (tempMax + tempMin) / 2;
  return Math.max(0, avgTemp - BASE_TEMPERATURE_C);
}

/**
 * Pure calculation: accumulated GDD from an array of daily temp ranges.
 */
export function calculateAccumulatedGDD(
  dailyTemps: Array<{ tempMax: number; tempMin: number }>
): number {
  let total = 0;
  for (const day of dailyTemps) {
    total += calculateDailyGDD(day.tempMax, day.tempMin);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Pure calculation: calculates yield penalty from stress event day counts.
 * penalty = (0.03 * droughtDays) + (0.02 * heatStressDays) + (0.05 * floodDays)
 * Capped at 0.40 (40% max loss).
 */
export function calculateYieldPenalty(
  droughtDays: number,
  heatStressDays: number,
  floodDays: number
): { rawPenalty: number; penalty: number; yieldLossPct: number } {
  const rawPenalty = 0.03 * droughtDays + 0.02 * heatStressDays + 0.05 * floodDays;
  const penalty = Math.min(MAX_PENALTY_CAP, Math.round(rawPenalty * 1000) / 1000);
  const yieldLossPct = Math.round(penalty * 100 * 10) / 10;
  return { rawPenalty, penalty, yieldLossPct };
}

/**
 * Pure calculation: resolves base and predicted yield given crop and penalty.
 * Predicted Yield = Base Yield * (1 - penalty)
 */
export function predictCropYield(
  cropType: string | undefined | null,
  penalty: number
): { crop: string; baseYield: number; predictedYield: number } {
  const crop = (cropType || 'default').toLowerCase().trim();
  const baseYield = BASE_YIELDS_KG_PER_ACRE[crop] ?? DEFAULT_BASE_YIELD;
  const effectivePenalty = Math.min(MAX_PENALTY_CAP, Math.max(0, penalty));
  const predictedYield = Math.round(baseYield * (1 - effectivePenalty));
  return { crop, baseYield, predictedYield };
}

/**
 * Evaluates stress days from grouped daily telemetry data:
 * - droughtDays: days where soilMoisture < 20%
 * - heatStressDays: days where tempMax > 38°C
 * - floodDays: days where soilMoisture > 90%
 */
export function evaluateStressDays(dailyData: DailyTelemetryData[]): {
  droughtDays: number;
  heatStressDays: number;
  floodDays: number;
  accumulatedGDD: number;
} {
  let droughtDays = 0;
  let heatStressDays = 0;
  let floodDays = 0;
  let accumulatedGDD = 0;

  for (const day of dailyData) {
    // GDD
    accumulatedGDD += calculateDailyGDD(day.tempMax, day.tempMin);

    // Heat stress
    if (day.tempMax > 38) {
      heatStressDays++;
    }

    // Drought: any soil moisture reading < 20%
    if (day.soilMoistures.some((sm) => sm < 20)) {
      droughtDays++;
    }

    // Flood: any soil moisture reading > 90%
    if (day.soilMoistures.some((sm) => sm > 90)) {
      floodDays++;
    }
  }

  return {
    droughtDays,
    heatStressDays,
    floodDays,
    accumulatedGDD: Math.round(accumulatedGDD * 10) / 10,
  };
}

/**
 * Computes predicted yield for a farm based on GDD and historical telemetry stress events.
 * Persists to farms/{farmId}/ai/yield_report.
 */
export async function predictYieldForFarm(
  farmId: string,
  now: Date = new Date()
): Promise<YieldReport | null> {
  if (!farmId) {
    throw new Error('farmId is required');
  }

  const farmDocSnap = await firestore().doc(`farms/${farmId}`).get();
  if (!farmDocSnap.exists) {
    logger.warn({ farmId }, 'Cannot predict yield: farm not found');
    return null;
  }

  const farmData = farmDocSnap.data() || {};
  const crop = (farmData.cropType || 'default').toLowerCase().trim();

  // 1. Resolve planting date
  let plantingDate: Date;
  let usingDefaultPlantingDate = false;

  if (farmData.plantingDate && !isNaN(new Date(farmData.plantingDate).getTime())) {
    plantingDate = new Date(farmData.plantingDate);
  } else {
    usingDefaultPlantingDate = true;
    plantingDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 2. Fetch historical telemetry from plantingDate to today
  const bucketNames = getDailyBucketNames(plantingDate, now);
  const plantingIso = plantingDate.toISOString();

  // Map: 'YYYY-MM-DD' -> DailyTelemetryData
  const dailyGroups = new Map<string, { temps: number[]; soils: number[] }>();

  try {
    const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();
    for (const devDoc of devicesSnap.docs) {
      for (const bucket of bucketNames) {
        try {
          const readingsSnap = await devDoc.ref
            .collection(bucket)
            .where('recordedAt', '>=', plantingIso)
            .get();

          for (const doc of readingsSnap.docs) {
            const data = doc.data();
            const recordedAt = data?.recordedAt;
            if (!recordedAt) continue;

            const dateKey = recordedAt.split('T')[0];
            if (!dailyGroups.has(dateKey)) {
              dailyGroups.set(dateKey, { temps: [], soils: [] });
            }

            const group = dailyGroups.get(dateKey)!;
            if (typeof data.temperature === 'number') {
              group.temps.push(data.temperature);
            }
            if (typeof data.soilMoisture === 'number') {
              group.soils.push(data.soilMoisture);
            }
          }
        } catch {
          // Gracefully continue if bucket is absent
        }
      }
    }
  } catch (err) {
    logger.warn({ err, farmId }, 'Error reading telemetry for yield prediction');
  }

  // Convert map to DailyTelemetryData
  const dailyData: DailyTelemetryData[] = [];
  for (const [date, values] of dailyGroups.entries()) {
    if (values.temps.length === 0 && values.soils.length === 0) continue;
    const tempMax = values.temps.length > 0 ? Math.max(...values.temps) : 25;
    const tempMin = values.temps.length > 0 ? Math.min(...values.temps) : 15;
    dailyData.push({
      date,
      tempMax,
      tempMin,
      soilMoistures: values.soils,
    });
  }

  // 3 & 4. Calculate GDD & count stress events
  const { droughtDays, heatStressDays, floodDays, accumulatedGDD } = evaluateStressDays(dailyData);

  // 5 & 6. Base yield & penalty (capped at 40%)
  const { penalty, yieldLossPct } = calculateYieldPenalty(droughtDays, heatStressDays, floodDays);
  const { baseYield, predictedYield } = predictCropYield(crop, penalty);

  // Confidence & message
  let confidencePct = 85;
  if (usingDefaultPlantingDate) {
    confidencePct = 60;
  }
  if (dailyData.length < 5) {
    confidencePct = Math.max(30, confidencePct - 20);
  }

  let message: string;
  if (penalty === 0) {
    message = `Growth conditions are optimal for ${crop}. Predicted yield is at 100% potential (${predictedYield} kg/acre) with ${accumulatedGDD} accumulated GDD.`;
  } else {
    message = `Predicted yield is reduced by ${yieldLossPct}% (${predictedYield} kg/acre) due to stress events (${droughtDays} drought days, ${heatStressDays} heat stress days, ${floodDays} flood days).`;
  }

  if (usingDefaultPlantingDate) {
    message += ' (Note: Default planting date of 30 days ago was used because plantingDate was not configured).';
  }

  // 8. Write to farms/{farmId}/ai/yield_report
  const report: YieldReport = {
    farmId,
    crop,
    baseYield,
    predictedYield,
    yieldLossPct,
    stressEvents: {
      droughtDays,
      heatStressDays,
      floodDays,
      accumulatedGDD,
    },
    confidencePct,
    message,
    computedAt: now.toISOString(),
    ...(usingDefaultPlantingDate ? { usingDefaultPlantingDate: true } : {}),
  };

  await firestore().doc(`farms/${farmId}/ai/yield_report`).set(report);
  logger.info({ farmId, crop, baseYield, predictedYield, yieldLossPct }, 'Yield report persisted');
  return report;
}

/**
 * Predicts yield for all active farms.
 */
export async function predictYieldForAllFarms(): Promise<void> {
  try {
    const farmsSnap = await firestore().collection('farms').get();
    for (const farmDoc of farmsSnap.docs) {
      try {
        await predictYieldForFarm(farmDoc.id);
      } catch (err) {
        logger.warn({ farmId: farmDoc.id, err }, 'Failed to compute yield report for farm');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to enumerate farms for yield reports');
  }
}

