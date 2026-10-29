import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';

export interface HealthInput {
  soilMoisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  deviceCount: number;
  onlineDeviceCount: number;
  unacknowledgedAlertCount: number;
}

export interface HealthResult {
  score: number;
  color: 'green' | 'yellow' | 'red';
  reasons: string[];
}

export interface FarmHealthDoc {
  score: number;
  color: 'green' | 'yellow' | 'red';
  reasons: string[];
  source: 'rule_v1';
  evaluatedAt: string;
  metrics: {
    soilMoisture?: number | null;
    temperature?: number | null;
    humidity?: number | null;
    deviceCount: number;
    onlineDeviceCount: number;
    unacknowledgedAlertCount: number;
  };
}

/**
 * Pure deterministic health score computation.
 * Max score: 100. Clamped between 0 and 100.
 */
export function computeHealthScore(input: HealthInput): HealthResult {
  let score = 100;
  const reasons: string[] = [];

  // 1. Soil moisture (optimal 25-75%)
  if (input.soilMoisture === undefined || input.soilMoisture === null || isNaN(input.soilMoisture)) {
    reasons.push('missing_soilMoisture');
  } else if (input.soilMoisture < 25) {
    score -= 25;
    reasons.push('Low soil moisture (<25%)');
  } else if (input.soilMoisture > 75) {
    score -= 15;
    reasons.push('Waterlogged soil (>75%)');
  }

  // 2. Temperature (optimal 15-35°C)
  if (input.temperature === undefined || input.temperature === null || isNaN(input.temperature)) {
    reasons.push('missing_temperature');
  } else if (input.temperature < 15) {
    score -= 15;
    reasons.push('Low temperature (<15°C)');
  } else if (input.temperature > 35) {
    score -= 20;
    reasons.push('High temperature (>35°C)');
  }

  // 3. Humidity (optimal 40-80%)
  if (input.humidity === undefined || input.humidity === null || isNaN(input.humidity)) {
    reasons.push('missing_humidity');
  } else if (input.humidity < 40) {
    score -= 10;
    reasons.push('Low humidity (<40%)');
  } else if (input.humidity > 80) {
    score -= 10;
    reasons.push('High humidity (>80%)');
  }

  // 4. Device connectivity
  if (input.deviceCount === 0) {
    reasons.push('no_devices');
  } else {
    const offlineCount = Math.max(0, input.deviceCount - input.onlineDeviceCount);
    if (offlineCount > 0) {
      const offlinePenalty = 15 * (offlineCount / input.deviceCount);
      score -= offlinePenalty;
      reasons.push(`${offlineCount} of ${input.deviceCount} devices offline`);
    }
  }

  // 5. Active unacknowledged alerts (-5 each, capped at -20)
  if (input.unacknowledgedAlertCount > 0) {
    const alertPenalty = Math.min(20, input.unacknowledgedAlertCount * 5);
    score -= alertPenalty;
    reasons.push(`${input.unacknowledgedAlertCount} unacknowledged alerts`);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let color: 'green' | 'yellow' | 'red';
  if (finalScore >= 80) {
    color = 'green';
  } else if (finalScore >= 60) {
    color = 'yellow';
  } else {
    color = 'red';
  }

  return {
    score: finalScore,
    color,
    reasons,
  };
}

/**
 * Computes the health score for a specific farm by querying its devices,
 * current telemetry snapshots, and active alerts, then writes the result to
 * farms/{farmId}/ai/health/current.
 */
export async function computeFarmHealth(farmId: string): Promise<FarmHealthDoc> {
  const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();
  const deviceCount = devicesSnap.size;

  let onlineDeviceCount = 0;
  const soilMoistureValues: number[] = [];
  const temperatureValues: number[] = [];
  const humidityValues: number[] = [];

  // Read latest/current for each device
  for (const devDoc of devicesSnap.docs) {
    const devData = devDoc.data();
    if (devData.status === 'online') {
      onlineDeviceCount++;
    }

    const latestSnap = await devDoc.ref.collection('latest').doc('current').get();
    if (latestSnap.exists) {
      const latestData = latestSnap.data();
      if (typeof latestData?.soilMoisture === 'number' && !isNaN(latestData.soilMoisture)) {
        soilMoistureValues.push(latestData.soilMoisture);
      }
      if (typeof latestData?.temperature === 'number' && !isNaN(latestData.temperature)) {
        temperatureValues.push(latestData.temperature);
      }
      if (typeof latestData?.humidity === 'number' && !isNaN(latestData.humidity)) {
        humidityValues.push(latestData.humidity);
      }
    }
  }

  // Read unacknowledged alerts count
  const alertsSnap = await firestore()
    .collection(`farms/${farmId}/alerts`)
    .where('acknowledged', '==', false)
    .get();
  const unacknowledgedAlertCount = alertsSnap.size;

  // Pick worst-case readings:
  // Soil: lowest if dry (<25), highest if saturated (>75), else average
  let worstSoil: number | null = null;
  if (soilMoistureValues.length > 0) {
    const minSoil = Math.min(...soilMoistureValues);
    const maxSoil = Math.max(...soilMoistureValues);
    if (minSoil < 25) {
      worstSoil = minSoil;
    } else if (maxSoil > 75) {
      worstSoil = maxSoil;
    } else {
      worstSoil = Math.round(soilMoistureValues.reduce((a, b) => a + b, 0) / soilMoistureValues.length);
    }
  }

  // Temp: highest if hot (>35), lowest if freezing (<15), else average
  let worstTemp: number | null = null;
  if (temperatureValues.length > 0) {
    const minTemp = Math.min(...temperatureValues);
    const maxTemp = Math.max(...temperatureValues);
    if (maxTemp > 35) {
      worstTemp = maxTemp;
    } else if (minTemp < 15) {
      worstTemp = minTemp;
    } else {
      worstTemp = Math.round((temperatureValues.reduce((a, b) => a + b, 0) / temperatureValues.length) * 10) / 10;
    }
  }

  // Humidity: lowest if dry (<40), highest if soggy (>80), else average
  let worstHumidity: number | null = null;
  if (humidityValues.length > 0) {
    const minHum = Math.min(...humidityValues);
    const maxHum = Math.max(...humidityValues);
    if (minHum < 40) {
      worstHumidity = minHum;
    } else if (maxHum > 80) {
      worstHumidity = maxHum;
    } else {
      worstHumidity = Math.round(humidityValues.reduce((a, b) => a + b, 0) / humidityValues.length);
    }
  }

  const healthInput: HealthInput = {
    soilMoisture: worstSoil,
    temperature: worstTemp,
    humidity: worstHumidity,
    deviceCount,
    onlineDeviceCount,
    unacknowledgedAlertCount,
  };

  const { score, color, reasons } = computeHealthScore(healthInput);

  const healthDoc: FarmHealthDoc = {
    score,
    color,
    reasons,
    source: 'rule_v1',
    evaluatedAt: new Date().toISOString(),
    metrics: healthInput,
  };

  await firestore().doc(`farms/${farmId}/ai/health`).set(healthDoc);

  logger.debug({ farmId, score, color }, 'Evaluated and persisted farm health score');
  return healthDoc;
}

/**
 * Periodically called by scheduler: computes health scores for all farms.
 */
export async function computeHealthForAllFarms(): Promise<void> {
  try {
    const farmsSnap = await firestore().collection('farms').get();
    for (const farmDoc of farmsSnap.docs) {
      try {
        await computeFarmHealth(farmDoc.id);
      } catch (err: any) {
        logger.warn({ farmId: farmDoc.id, err: err?.message }, 'Failed to compute health score for farm');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error in computeHealthForAllFarms');
  }
}
