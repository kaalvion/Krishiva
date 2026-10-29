import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { getDailyBucketNames } from '../telemetry/telemetry.routes.js';
import type { TelemetryReadingInput } from '../alerts/alerts.service.js';

export type AnomalyField = 'temperature' | 'humidity' | 'soilMoisture';

export interface BaselineStats {
  mean: number;
  stdDev: number;
  sampleCount: number;
  lastComputedAt?: number;
}

export interface AnomalyRecord {
  deviceId: string;
  field: AnomalyField;
  value: number;
  expected: number;
  zScore: number;
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
}

/**
 * In-memory baseline cache: `${farmId}:${deviceId}:${field}:${hour}` -> BaselineStats
 * Protects Firestore read quota by serving O(1) lookups during daytime ingestion.
 */
export const baselineCache = new Map<string, BaselineStats>();

export function getBaselineCacheKey(
  farmId: string,
  deviceId: string,
  field: AnomalyField,
  hour: number
): string {
  return `${farmId}:${deviceId}:${field}:${hour}`;
}

export function clearBaselineCache(): void {
  baselineCache.clear();
}

export function setCachedBaseline(
  farmId: string,
  deviceId: string,
  field: AnomalyField,
  hour: number,
  stats: BaselineStats
): void {
  const key = getBaselineCacheKey(farmId, deviceId, field, hour);
  baselineCache.set(key, stats);
}

/**
 * Formats user-friendly field units for anomaly messages.
 */
function getFieldUnit(field: AnomalyField): string {
  switch (field) {
    case 'temperature':
      return '°C';
    case 'humidity':
    case 'soilMoisture':
      return '%';
  }
}

/**
 * Queries the past N days of device readings across daily UTC buckets.
 */
export async function fetchHistoricalReadings(
  farmId: string,
  deviceId: string,
  days = 14,
  now: Date = new Date()
): Promise<Array<{ temperature?: number; humidity?: number; soilMoisture?: number; recordedAt: string }>> {
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startIso = startTime.toISOString();
  const bucketNames = getDailyBucketNames(startTime, now);

  const readings: Array<{ temperature?: number; humidity?: number; soilMoisture?: number; recordedAt: string }> = [];

  await Promise.all(
    bucketNames.map(async (bucket) => {
      try {
        const snap = await firestore()
          .collection(`farms/${farmId}/devices/${deviceId}/${bucket}`)
          .where('recordedAt', '>=', startIso)
          .get();

        for (const doc of snap.docs) {
          readings.push(doc.data() as any);
        }
      } catch (err) {
        // bucket missing or inaccessible, handled gracefully
      }
    })
  );

  return readings;
}

/**
 * Pre-computes 14-day 24-hour baselines for a single device and populates `baselineCache`.
 */
export async function computeDeviceBaselines(
  farmId: string,
  deviceId: string,
  days = 14,
  now: Date = new Date()
): Promise<void> {
  const readings = await fetchHistoricalReadings(farmId, deviceId, days, now);
  const fields: AnomalyField[] = ['temperature', 'humidity', 'soilMoisture'];

  // Group readings by UTC hour 0-23
  const hourlyReadings: Map<number, typeof readings> = new Map();
  for (let h = 0; h < 24; h++) {
    hourlyReadings.set(h, []);
  }

  for (const r of readings) {
    if (!r.recordedAt) continue;
    const hour = new Date(r.recordedAt).getUTCHours();
    if (hour >= 0 && hour <= 23) {
      hourlyReadings.get(hour)?.push(r);
    }
  }

  for (const field of fields) {
    for (let h = 0; h < 24; h++) {
      const bucket = hourlyReadings.get(h) || [];
      const values: number[] = [];

      for (const item of bucket) {
        const val = item[field];
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          values.push(val);
        }
      }

      const key = getBaselineCacheKey(farmId, deviceId, field, h);

      if (values.length < 2) {
        // Insufficient data to establish variance
        baselineCache.set(key, {
          mean: values.length === 1 ? values[0] : 0,
          stdDev: 0,
          sampleCount: values.length,
          lastComputedAt: Date.now(),
        });
        continue;
      }

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
      const stdDev = Math.sqrt(variance);

      baselineCache.set(key, {
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        sampleCount: values.length,
        lastComputedAt: Date.now(),
      });
    }
  }
}

/**
 * Rebuilds 14-day baselines across all farms & devices.
 * Invoked daily at 2:00 AM by the background scheduler to keep cache hot.
 */
export async function rebuildBaselines(): Promise<void> {
  logger.info('Starting daily baseline rebuild for Z-score anomaly detection...');
  baselineCache.clear();

  try {
    const farmsSnap = await firestore().collection('farms').get();
    for (const farmDoc of farmsSnap.docs) {
      const farmId = farmDoc.id;
      let devicesSnap: FirebaseFirestore.QuerySnapshot;
      try {
        devicesSnap = await farmDoc.ref.collection('devices').get();
      } catch (devErr) {
        logger.warn({ devErr, farmId }, 'Failed to list devices during baseline rebuild');
        continue;
      }

      for (const devDoc of devicesSnap.docs) {
        const deviceId = devDoc.id;
        try {
          await computeDeviceBaselines(farmId, deviceId);
        } catch (err) {
          logger.warn({ err, farmId, deviceId }, 'Failed to compute baseline for device');
        }
      }
    }
    logger.info({ cachedEntries: baselineCache.size }, 'Daily baseline rebuild completed');
  } catch (err) {
    logger.error({ err }, 'Error during rebuildBaselines execution');
  }
}

/**
 * Evaluates telemetry reading against hourly statistical baselines using Z-score.
 * Flagged when |z| > 3.
 * Writes detected anomalies to farms/{farmId}/anomalies/{anomalyId}.
 */
export async function checkAnomaly(
  farmId: string,
  deviceId: string,
  reading: TelemetryReadingInput
): Promise<AnomalyRecord[]> {
  const anomalies: AnomalyRecord[] = [];
  const fields: AnomalyField[] = ['temperature', 'humidity', 'soilMoisture'];
  const recordedAt = reading.recordedAt || new Date().toISOString();
  const hour = new Date(recordedAt).getUTCHours();

  for (const field of fields) {
    const val = reading[field];
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      continue;
    }

    const cacheKey = getBaselineCacheKey(farmId, deviceId, field, hour);
    let stats = baselineCache.get(cacheKey);

    // Cache miss: compute device baselines on-demand and retrieve
    if (!stats) {
      try {
        await computeDeviceBaselines(farmId, deviceId);
        stats = baselineCache.get(cacheKey);
      } catch (err) {
        logger.warn(
          { err, farmId, deviceId, field, hour },
          'Failed to compute on-demand baseline on cache miss'
        );
      }
    }

    // If still no stats or baseline is degenerate, skip
    if (!stats || stats.sampleCount < 2 || stats.stdDev <= 0.001) {
      continue;
    }

    const z = (val - stats.mean) / stats.stdDev;
    if (Math.abs(z) > 3) {
      const unit = getFieldUnit(field);
      const expectedRounded = Math.round(stats.mean * 10) / 10;
      const valueRounded = Math.round(val * 10) / 10;
      const severity: 'warning' | 'critical' = Math.abs(z) > 4 ? 'critical' : 'warning';
      const message = `${field} = ${valueRounded}${unit} (expected ~${expectedRounded}${unit})`;

      const anomalyRecord: AnomalyRecord = {
        deviceId,
        field,
        value: valueRounded,
        expected: expectedRounded,
        zScore: Math.round(z * 100) / 100,
        severity,
        message,
        createdAt: new Date().toISOString(),
      };

      try {
        await firestore().collection(`farms/${farmId}/anomalies`).add(anomalyRecord);
        anomalies.push(anomalyRecord);
        logger.warn(
          { farmId, deviceId, field, zScore: anomalyRecord.zScore, message },
          'Z-score anomaly detected and stored'
        );
      } catch (err) {
        logger.error(
          { err, farmId, deviceId, field },
          'Failed to write anomaly record to Firestore'
        );
      }
    }
  }

  return anomalies;
}

