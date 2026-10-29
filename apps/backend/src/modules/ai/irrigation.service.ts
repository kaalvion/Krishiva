import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { getDailyBucketNames } from '../telemetry/telemetry.routes.js';
import type { TelemetryReadingInput } from '../alerts/alerts.service.js';

export type IrrigationAction = 'IRRIGATE_NOW' | 'IRRIGATE_SOON' | 'WAIT_FOR_RAIN' | 'NO_ACTION';
export type IrrigationUrgency = 'high' | 'medium' | 'low' | 'none';

export interface IrrigationPrediction {
  currentSoil: number;
  predicted1h: number;
  predicted3h: number;
  predicted6h: number;
  action: IrrigationAction;
  urgency: IrrigationUrgency;
  message: string;
  computedAt: string;
}

/**
 * Queries the past N hours of device readings across daily UTC buckets.
 */
export async function fetchRecentSoilReadings(
  farmId: string,
  deviceId: string,
  hours = 6,
  now: Date = new Date()
): Promise<TelemetryReadingInput[]> {
  const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const startIso = startTime.toISOString();
  const bucketNames = getDailyBucketNames(startTime, now);

  const readings: TelemetryReadingInput[] = [];

  await Promise.all(
    bucketNames.map(async (bucket) => {
      try {
        const snap = await firestore()
          .collection(`farms/${farmId}/devices/${deviceId}/${bucket}`)
          .where('recordedAt', '>=', startIso)
          .get();

        for (const doc of snap.docs) {
          const data = doc.data() as TelemetryReadingInput;
          if (typeof data?.soilMoisture === 'number' && !isNaN(data.soilMoisture)) {
            readings.push(data);
          }
        }
      } catch (err) {
        // bucket missing or empty
      }
    })
  );

  readings.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  return readings;
}

/**
 * Computes predictive irrigation model for a device based on linear depletion and weather.
 * Writes result to farms/{farmId}/ai/irrigation.
 */
export async function computeIrrigationPrediction(
  farmId: string,
  deviceId?: string,
  now: Date = new Date()
): Promise<IrrigationPrediction | null> {
  // If no deviceId supplied, find the primary device with soil moisture capability or first device
  let targetDeviceId = deviceId;
  if (!targetDeviceId) {
    try {
      const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();
      if (devicesSnap.empty) {
        logger.warn({ farmId }, 'Cannot compute irrigation prediction: no devices registered');
        return null;
      }
      const match =
        devicesSnap.docs.find((d) =>
          d.data()?.capabilities?.some((c: string) => c.toLowerCase().includes('soil'))
        ) || devicesSnap.docs[0];
      targetDeviceId = match.id;
    } catch (err) {
      logger.error({ err, farmId }, 'Failed to resolve device for irrigation prediction');
      return null;
    }
  }

  // 1. Fetch last 6 hours of soil readings
  const readings = await fetchRecentSoilReadings(farmId, targetDeviceId, 6, now);

  // 2. Determine current soil moisture & depletion ratePerHour
  let currentSoil = 35.0; // fallback if no readings
  let ratePerHour = 3.0; // default fallback rate 3% per hour

  if (readings.length > 0) {
    currentSoil = readings[readings.length - 1].soilMoisture;
  } else {
    // Attempt to read latest current singleton
    try {
      const latestSnap = await firestore()
        .doc(`farms/${farmId}/devices/${targetDeviceId}/latest/current`)
        .get();
      if (latestSnap.exists && typeof latestSnap.data()?.soilMoisture === 'number') {
        currentSoil = latestSnap.data()!.soilMoisture;
      }
    } catch {
      // fallback
    }
  }

  if (readings.length >= 3) {
    const firstReading = readings[0];
    const lastReading = readings[readings.length - 1];
    const totalHours =
      (new Date(lastReading.recordedAt).getTime() - new Date(firstReading.recordedAt).getTime()) /
      (1000 * 60 * 60);

    if (totalHours > 0.1) {
      ratePerHour = (firstReading.soilMoisture - lastReading.soilMoisture) / totalHours;
    }
    // If soil moisture is increasing or constant, depletion rate is 0
    if (ratePerHour < 0) {
      ratePerHour = 0;
    }
  } else {
    ratePerHour = 3.0;
  }

  // 3. Fetch latest weather forecast
  let rainNext6hMm = 0;
  try {
    const weatherSnap = await firestore().doc(`farms/${farmId}/weather/latest`).get();
    if (weatherSnap.exists) {
      const weatherData = weatherSnap.data();
      if (typeof weatherData?.rainNext6hMm === 'number') {
        rainNext6hMm = weatherData.rainNext6hMm;
      }
    }
  } catch (weatherErr) {
    logger.warn({ weatherErr, farmId }, 'Failed to fetch weather for irrigation prediction');
  }

  // 4. Predict 1h, 3h, 6h ahead (offset by rain if rainNext6hMm > 5)
  const effectiveRate = rainNext6hMm > 5 ? ratePerHour * 0.5 : ratePerHour;

  const roundOne = (num: number) => Math.round(num * 10) / 10;
  const clampMoisture = (val: number) => Math.max(0, Math.min(100, roundOne(val)));

  const currentSoilRounded = roundOne(currentSoil);
  const predicted1h = clampMoisture(currentSoil - effectiveRate * 1);
  const predicted3h = clampMoisture(currentSoil - effectiveRate * 3);
  const predicted6h = clampMoisture(currentSoil - effectiveRate * 6);

  // 5. Determine Action & Urgency
  let action: IrrigationAction = 'NO_ACTION';
  let urgency: IrrigationUrgency = 'none';
  let message = '';

  if (predicted1h < 20) {
    action = 'IRRIGATE_NOW';
    urgency = 'high';
    message = `Soil moisture will drop to ${predicted1h}% in 1 hour. Irrigate now to prevent crop stress.`;
  } else if (predicted3h < 25) {
    action = 'IRRIGATE_SOON';
    urgency = 'medium';
    message = `Soil moisture will drop to ${predicted3h}% in 3 hours. Plan irrigation soon.`;
  } else if (rainNext6hMm > 5) {
    action = 'WAIT_FOR_RAIN';
    urgency = 'low';
    message = `Rain expected in the next 6 hours (${rainNext6hMm} mm). Hold off on irrigation.`;
  } else {
    action = 'NO_ACTION';
    urgency = 'none';
    message = `Soil moisture is healthy (${currentSoilRounded}%). No irrigation required at this time.`;
  }

  const prediction: IrrigationPrediction = {
    currentSoil: currentSoilRounded,
    predicted1h,
    predicted3h,
    predicted6h,
    action,
    urgency,
    message,
    computedAt: now.toISOString(),
  };

  // 7. Write to Firestore: farms/{farmId}/ai/irrigation
  try {
    await firestore().doc(`farms/${farmId}/ai/irrigation`).set(prediction);
    logger.info(
      { farmId, targetDeviceId, action, urgency, currentSoil: currentSoilRounded, predicted1h, predicted3h },
      'Irrigation prediction computed and stored'
    );
  } catch (writeErr) {
    logger.error({ writeErr, farmId }, 'Failed to persist irrigation prediction to Firestore');
  }

  return prediction;
}

/**
 * Cron routine to compute irrigation prediction for all active farms.
 */
export async function computeIrrigationForAllFarms(): Promise<void> {
  logger.info('Starting scheduled irrigation prediction run for all farms...');
  try {
    const farmsSnap = await firestore().collection('farms').get();
    for (const farmDoc of farmsSnap.docs) {
      const farmId = farmDoc.id;
      try {
        await computeIrrigationPrediction(farmId);
      } catch (err: any) {
        logger.warn({ err: err?.message, farmId }, 'Error computing irrigation for farm');
      }
    }
    logger.info({ processedFarms: farmsSnap.size }, 'Finished scheduled irrigation prediction run');
  } catch (err) {
    logger.error({ err }, 'Failed to run computeIrrigationForAllFarms');
  }
}
