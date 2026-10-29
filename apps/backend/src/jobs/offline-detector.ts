import { firestore } from '../plugins/firebase.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const DEFAULT_OFFLINE_AFTER_MS = 15 * 60 * 1000; // 15 minutes

export interface OfflineDetectionResult {
  devicesChecked: number;
  devicesMarkedOffline: number;
  alertsCreated: number;
  errors: number;
}

/**
 * Scans all devices marked "online" and marks them "offline" if lastSeenAt is older than the threshold.
 * Respects rate limiting by ensuring only one unacknowledged DEVICE_OFFLINE alert exists per device.
 */
export async function detectOfflineDevices(
  now: Date = new Date(),
  overrideThresholdMs?: number
): Promise<OfflineDetectionResult> {
  const result: OfflineDetectionResult = {
    devicesChecked: 0,
    devicesMarkedOffline: 0,
    alertsCreated: 0,
    errors: 0,
  };

  const offlineThresholdMs =
    overrideThresholdMs ?? env.OFFLINE_AFTER_MS_OVERRIDE ?? DEFAULT_OFFLINE_AFTER_MS;
  const cutoffTime = new Date(now.getTime() - offlineThresholdMs);
  const thresholdMins = Math.max(1, Math.round(offlineThresholdMs / 60000));

  let farmsSnap: FirebaseFirestore.QuerySnapshot;
  try {
    farmsSnap = await firestore().collection('farms').get();
  } catch (err: any) {
    logger.error({ err }, 'Failed to fetch farms for offline device detection');
    result.errors++;
    return result;
  }

  for (const farmDoc of farmsSnap.docs) {
    const farmId = farmDoc.id;
    let devicesSnap: FirebaseFirestore.QuerySnapshot;

    try {
      devicesSnap = await farmDoc.ref.collection('devices').get();
    } catch (err: any) {
      logger.error({ err, farmId }, 'Failed to query devices for farm');
      result.errors++;
      continue;
    }

    const onlineDocs = devicesSnap.docs.filter((d) => d.data()?.status === 'online');
    result.devicesChecked += onlineDocs.length;

    for (const doc of onlineDocs) {
      const deviceId = doc.id;
      const deviceData = doc.data();

      try {
        const targetFarmId = farmId || deviceData.farmId || doc.ref.parent.parent?.id;
        if (!targetFarmId) {
          logger.warn({ deviceId }, 'Device is missing farmId reference, skipping offline check');
          continue;
        }

        const lastSeenStr = deviceData.lastSeenAt || deviceData.createdAt;
        if (!lastSeenStr) {
          continue;
        }

        const lastSeenDate = new Date(lastSeenStr);
        if (lastSeenDate >= cutoffTime) {
          // Device is still active within the threshold
          continue;
        }

        const timeSinceLastSeenMs = now.getTime() - lastSeenDate.getTime();
        const deviceName = deviceData.name || `Node #${deviceData.nodeId}`;

        // 1. Mark device status as offline
        await doc.ref.update({
          status: 'offline',
        });
        result.devicesMarkedOffline++;

        logger.warn(
          { deviceId, farmId: targetFarmId, deviceName, timeSinceLastSeenMs },
          `Device ${deviceName} (${deviceId}) marked offline due to inactivity`
        );

        // 2. Check if an unacknowledged DEVICE_OFFLINE alert already exists for this device
        const existingAlertsSnap = await firestore()
          .collection(`farms/${targetFarmId}/alerts`)
          .where('deviceId', '==', deviceId)
          .where('type', '==', 'DEVICE_OFFLINE')
          .where('acknowledged', '==', false)
          .limit(1)
          .get();

        if (!existingAlertsSnap.empty) {
          logger.debug(
            { deviceId, farmId: targetFarmId },
            'Suppressing duplicate DEVICE_OFFLINE alert (unacknowledged alert already exists)'
          );
          continue;
        }

        // 3. Create DEVICE_OFFLINE alert
        const alertData = {
          deviceId,
          type: 'DEVICE_OFFLINE',
          severity: 'warning' as const,
          message: `${deviceName} has not reported for ${thresholdMins}+ minutes`,
          value: Math.round(timeSinceLastSeenMs / 60000),
          threshold: thresholdMins,
          acknowledged: false,
          createdAt: now.toISOString(),
        };

        await firestore().collection(`farms/${targetFarmId}/alerts`).add(alertData);
        result.alertsCreated++;

        logger.info(
          { deviceId, farmId: targetFarmId, type: alertData.type },
          `Generated DEVICE_OFFLINE alert for ${deviceName}`
        );
      } catch (deviceErr: any) {
        logger.error({ deviceErr, deviceId }, 'Error evaluating device for offline status');
        result.errors++;
      }
    }
  }

  return result;
}
