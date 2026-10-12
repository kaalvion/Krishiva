import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';

export interface TelemetryReadingInput {
  nodeId: number;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  recordedAt: string;
  seq?: number;
}

export const ALERT_THRESHOLDS = {
  soilMoistureCritical: {
    threshold: 15,
    type: 'SOIL_MOISTURE_CRITICAL',
    severity: 'critical' as const,
    message: (val: number) => `Critical low soil moisture: ${val}% (threshold: <= 15%)`,
  },
  soilMoistureLow: {
    threshold: 25,
    type: 'SOIL_MOISTURE_LOW',
    severity: 'warning' as const,
    message: (val: number) => `Low soil moisture: ${val}% (threshold: <= 25%)`,
  },
  temperatureHigh: {
    threshold: 42,
    type: 'TEMPERATURE_HIGH',
    severity: 'warning' as const,
    message: (val: number) => `High ambient temperature: ${val}°C (threshold: >= 42°C)`,
  },
  humidityHigh: {
    threshold: 90,
    type: 'HUMIDITY_HIGH',
    severity: 'info' as const,
    message: (val: number) => `High relative humidity: ${val}% (threshold: >= 90%)`,
  },
} as const;

export type AlertSeverity = 'critical' | 'warning' | 'info';

interface CandidateAlert {
  type: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
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
 * Evaluates a new telemetry reading against defined environmental thresholds.
 * Emits alerts to farms/{farmId}/alerts with a 30-minute deduplication rate limit.
 */
export async function checkAlerts(
  farmId: string,
  deviceId: string,
  reading: TelemetryReadingInput
): Promise<void> {
  const candidateAlerts: CandidateAlert[] = [];

  // 1. Soil moisture evaluation
  if (reading.soilMoisture <= ALERT_THRESHOLDS.soilMoistureCritical.threshold) {
    candidateAlerts.push({
      type: ALERT_THRESHOLDS.soilMoistureCritical.type,
      severity: ALERT_THRESHOLDS.soilMoistureCritical.severity,
      message: ALERT_THRESHOLDS.soilMoistureCritical.message(reading.soilMoisture),
      value: reading.soilMoisture,
      threshold: ALERT_THRESHOLDS.soilMoistureCritical.threshold,
    });
  } else if (reading.soilMoisture <= ALERT_THRESHOLDS.soilMoistureLow.threshold) {
    candidateAlerts.push({
      type: ALERT_THRESHOLDS.soilMoistureLow.type,
      severity: ALERT_THRESHOLDS.soilMoistureLow.severity,
      message: ALERT_THRESHOLDS.soilMoistureLow.message(reading.soilMoisture),
      value: reading.soilMoisture,
      threshold: ALERT_THRESHOLDS.soilMoistureLow.threshold,
    });
  }

  // 2. Temperature evaluation
  if (reading.temperature >= ALERT_THRESHOLDS.temperatureHigh.threshold) {
    candidateAlerts.push({
      type: ALERT_THRESHOLDS.temperatureHigh.type,
      severity: ALERT_THRESHOLDS.temperatureHigh.severity,
      message: ALERT_THRESHOLDS.temperatureHigh.message(reading.temperature),
      value: reading.temperature,
      threshold: ALERT_THRESHOLDS.temperatureHigh.threshold,
    });
  }

  // 3. Humidity evaluation
  if (reading.humidity >= ALERT_THRESHOLDS.humidityHigh.threshold) {
    candidateAlerts.push({
      type: ALERT_THRESHOLDS.humidityHigh.type,
      severity: ALERT_THRESHOLDS.humidityHigh.severity,
      message: ALERT_THRESHOLDS.humidityHigh.message(reading.humidity),
      value: reading.humidity,
      threshold: ALERT_THRESHOLDS.humidityHigh.threshold,
    });
  }

  if (candidateAlerts.length === 0) {
    return;
  }

  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

  for (const alert of candidateAlerts) {
    try {
      // Query unacknowledged alerts for the same device and type
      const existingQuery = await firestore()
        .collection(`farms/${farmId}/alerts`)
        .where('deviceId', '==', deviceId)
        .where('type', '==', alert.type)
        .where('acknowledged', '==', false)
        .get();

      // Rate limit check: skip if an alert was created within the last 30 minutes
      const hasRecent = existingQuery.docs.some((doc) => {
        const data = doc.data();
        if (!data.createdAt) return false;
        return new Date(data.createdAt).getTime() >= thirtyMinutesAgo;
      });

      if (hasRecent) {
        logger.debug(
          { farmId, deviceId, type: alert.type },
          'Suppressing alert due to 30-minute rate limit window'
        );
        continue;
      }

      const alertData = {
        deviceId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };

      await firestore().collection(`farms/${farmId}/alerts`).add(alertData);

      logger.warn(
        { farmId, deviceId, type: alert.type, severity: alert.severity },
        `Alert triggered: ${alert.message}`
      );

      sendNotificationStub(farmId, alert);
    } catch (err) {
      logger.error(
        { err, farmId, deviceId, type: alert.type },
        'Error processing candidate alert'
      );
    }
  }
}
