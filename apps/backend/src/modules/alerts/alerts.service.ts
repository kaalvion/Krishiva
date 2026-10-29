import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { getDailyBucketNames } from '../telemetry/telemetry.routes.js';
import { enqueueAlert } from '../ai/alert-explainer.service.js';

export interface TelemetryReadingInput {
  nodeId: number;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  recordedAt: string;
  seq?: number;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export const ALERT_THRESHOLDS = {
  soilMoistureCritical: {
    threshold: 15,
    type: 'SOIL_MOISTURE_CRITICAL',
    severity: 'critical' as AlertSeverity,
    cooldownMinutes: 30,
    message: (val: number) => `Critical low soil moisture: ${val}% (threshold: <= 15%)`,
  },
  soilMoistureLow: {
    threshold: 25,
    type: 'SOIL_MOISTURE_LOW',
    severity: 'warning' as AlertSeverity,
    cooldownMinutes: 60,
    message: (val: number) => `Low soil moisture: ${val}% (below 25% for 2 consecutive readings)`,
  },
  heatStress: {
    threshold: 40,
    type: 'HEAT_STRESS',
    severity: 'warning' as AlertSeverity,
    cooldownMinutes: 120,
    message: (temp: number, hum: number) =>
      `Heat stress detected: temperature ${temp}°C and humidity ${hum}%`,
  },
  rapidDryDown: {
    threshold: 15,
    type: 'RAPID_DRY_DOWN',
    severity: 'warning' as AlertSeverity,
    cooldownMinutes: 360,
    message: (drop: number) => `Rapid soil moisture drop: ${drop.toFixed(1)}% drop in the last 3 hours`,
  },
} as const;

export interface CandidateAlert {
  type: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  cooldownKey: string;
  cooldownMinutes: number;
}

/**
 * In-memory cooldown tracking: cooldownKey -> expiration timestamp (epoch ms).
 * Prevents duplicate alerts without blocking MQTT ingestion.
 */
export const alertCooldownMap = new Map<string, number>();

/**
 * Resets in-memory alert cooldowns (useful for unit testing).
 */
export function clearAlertCooldowns(): void {
  alertCooldownMap.clear();
}

/**
 * Notification dispatcher stub for future notification integration (SMS/Push/Email).
 */
function sendNotificationStub(farmId: string, alert: CandidateAlert): void {
  logger.debug(
    { farmId, type: alert.type, severity: alert.severity },
    'Notification dispatch stub invoked'
  );
}

/**
 * Fetches historical device readings for the last N hours across daily UTC buckets.
 */
export async function getRecentReadings(
  farmId: string,
  deviceId: string,
  hours = 3,
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
          readings.push(doc.data() as TelemetryReadingInput);
        }
      } catch (err) {
        logger.warn(
          { err, farmId, deviceId, bucket },
          'Failed to retrieve telemetry bucket during alert check'
        );
      }
    })
  );

  readings.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  return readings;
}

/**
 * Evaluates a new telemetry reading against the 4 smart rules:
 * 1. LOW SOIL:      soil < 25 for 2 CONSECUTIVE readings (Cooldown: 60 mins)
 * 2. CRITICAL DRY:  soil < 15 for 1 reading (Cooldown: 30 mins)
 * 3. HEAT STRESS:   temp > 40 AND humidity < 30 (Cooldown: 120 mins)
 * 4. RAPID DRY-DOWN: soil drops > 15% in the last 3 hours (Cooldown: 360 mins)
 *
 * Uses in-memory Map for cooldowns to ensure fast execution on MQTT ingestion.
 * Writes fired alerts to farms/{farmId}/alerts with standard fields, aiExplanation: null,
 * and pushes { farmId, alertId } to the in-memory queue for Grok explanation.
 */
export async function checkAlerts(
  farmId: string,
  deviceId: string,
  reading: TelemetryReadingInput
): Promise<void> {
  const now = new Date();
  const nowMs = now.getTime();

  // 1. Fetch last 3 hours of readings for trend & consecutive analysis
  let recentReadings: TelemetryReadingInput[] = [];
  try {
    recentReadings = await getRecentReadings(farmId, deviceId, 3, now);
  } catch (err) {
    logger.warn({ err, farmId, deviceId }, 'Could not fetch recent readings; evaluating with current reading only');
  }

  // Ensure current reading is included in the chronological list
  const exists = recentReadings.some(
    (r) => r.recordedAt === reading.recordedAt || (reading.seq !== undefined && r.seq === reading.seq)
  );
  if (!exists) {
    recentReadings.push(reading);
  }
  recentReadings.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const currentIndex = recentReadings.findIndex(
    (r) => r.recordedAt === reading.recordedAt || (reading.seq !== undefined && r.seq === reading.seq)
  );
  const prevReading = currentIndex > 0 ? recentReadings[currentIndex - 1] : null;

  const candidateAlerts: CandidateAlert[] = [];

  // RULE 1: LOW SOIL (soil < 25 for 2 CONSECUTIVE readings, cooldown: 60 mins)
  if (reading.soilMoisture < 25) {
    const isConsecutive = prevReading !== null && prevReading.soilMoisture < 25;
    if (isConsecutive) {
      candidateAlerts.push({
        type: ALERT_THRESHOLDS.soilMoistureLow.type,
        severity: ALERT_THRESHOLDS.soilMoistureLow.severity,
        message: ALERT_THRESHOLDS.soilMoistureLow.message(reading.soilMoisture),
        value: reading.soilMoisture,
        threshold: ALERT_THRESHOLDS.soilMoistureLow.threshold,
        cooldownKey: `${deviceId}_${ALERT_THRESHOLDS.soilMoistureLow.type}`,
        cooldownMinutes: ALERT_THRESHOLDS.soilMoistureLow.cooldownMinutes,
      });
    }
  }

  // RULE 2: CRITICAL DRY (soil < 15 for 1 reading, cooldown: 30 mins)
  if (reading.soilMoisture < 15) {
    candidateAlerts.push({
      type: ALERT_THRESHOLDS.soilMoistureCritical.type,
      severity: ALERT_THRESHOLDS.soilMoistureCritical.severity,
      message: ALERT_THRESHOLDS.soilMoistureCritical.message(reading.soilMoisture),
      value: reading.soilMoisture,
      threshold: ALERT_THRESHOLDS.soilMoistureCritical.threshold,
      cooldownKey: `${deviceId}_${ALERT_THRESHOLDS.soilMoistureCritical.type}`,
      cooldownMinutes: ALERT_THRESHOLDS.soilMoistureCritical.cooldownMinutes,
    });
  }

  // RULE 3: HEAT STRESS (temp > 40 AND humidity < 30, cooldown: 120 mins)
  if (reading.temperature > 40 && reading.humidity < 30) {
    candidateAlerts.push({
      type: ALERT_THRESHOLDS.heatStress.type,
      severity: ALERT_THRESHOLDS.heatStress.severity,
      message: ALERT_THRESHOLDS.heatStress.message(reading.temperature, reading.humidity),
      value: reading.temperature,
      threshold: ALERT_THRESHOLDS.heatStress.threshold,
      cooldownKey: `${deviceId}_${ALERT_THRESHOLDS.heatStress.type}`,
      cooldownMinutes: ALERT_THRESHOLDS.heatStress.cooldownMinutes,
    });
  }

  // RULE 4: RAPID DRY-DOWN (soil drops > 15% in last 3 hours, cooldown: 360 mins)
  if (recentReadings.length > 1) {
    const windowReadings = recentReadings.slice(0, currentIndex + 1);
    const maxPriorSoil = Math.max(...windowReadings.map((r) => r.soilMoisture));
    const drop = maxPriorSoil - reading.soilMoisture;

    if (drop > 15) {
      candidateAlerts.push({
        type: ALERT_THRESHOLDS.rapidDryDown.type,
        severity: ALERT_THRESHOLDS.rapidDryDown.severity,
        message: ALERT_THRESHOLDS.rapidDryDown.message(drop),
        value: Number(drop.toFixed(1)),
        threshold: ALERT_THRESHOLDS.rapidDryDown.threshold,
        cooldownKey: `${deviceId}_${ALERT_THRESHOLDS.rapidDryDown.type}`,
        cooldownMinutes: ALERT_THRESHOLDS.rapidDryDown.cooldownMinutes,
      });
    }
  }

  if (candidateAlerts.length === 0) {
    return;
  }

  // Process candidate alerts with in-memory cooldown enforcement
  for (const alert of candidateAlerts) {
    try {
      const cooldownExpiresAt = alertCooldownMap.get(alert.cooldownKey);
      if (cooldownExpiresAt && nowMs < cooldownExpiresAt) {
        logger.debug(
          { farmId, deviceId, cooldownKey: alert.cooldownKey },
          'Suppressing alert due to active in-memory cooldown'
        );
        continue;
      }

      // Record in-memory cooldown immediately
      alertCooldownMap.set(alert.cooldownKey, nowMs + alert.cooldownMinutes * 60 * 1000);

      const alertData = {
        deviceId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        acknowledged: false,
        createdAt: now.toISOString(),
        aiExplanation: null,
        cooldownKey: alert.cooldownKey,
      };

      const docRef = await firestore().collection(`farms/${farmId}/alerts`).add(alertData);

      // Enqueue alert for background AI explanation
      enqueueAlert(farmId, docRef.id);

      logger.warn(
        { farmId, deviceId, alertId: docRef.id, type: alert.type, severity: alert.severity },
        `Smart alert triggered: ${alert.message}`
      );

      sendNotificationStub(farmId, alert);
    } catch (err) {
      logger.error(
        { err, farmId, deviceId, type: alert.type },
        'Error processing smart candidate alert'
      );
    }
  }
}
