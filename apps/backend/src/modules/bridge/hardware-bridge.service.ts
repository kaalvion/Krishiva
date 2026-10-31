import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { acknowledgeCommand, type CommandAction } from '../commands/commands.service.js';

let slaveUnsubscribe: (() => void) | null = null;
let devicesUnsubscribe: (() => void) | null = null;

/**
 * Bridges an issued actuator command to the legacy MASTER/COMMANDS document
 * so physical ESP32 relays (RELAY1, RELAY2, RELAY3, RELAY4) are flipped in Firestore.
 */
export async function syncLegacyRelayCommand(
  farmId: string,
  deviceId: string,
  action: CommandAction,
  commandId: string,
  durationSeconds?: number | null
): Promise<boolean> {
  try {
    // 1. Try directly: farms/{farmId}/DEVICES/{deviceId}/MASTER/COMMANDS
    let masterCommandsRef = firestore().doc(`farms/${farmId}/DEVICES/${deviceId}/MASTER/COMMANDS`);
    let masterSnap = await masterCommandsRef.get();

    // 2. If not found, search if any device under farms/{farmId}/DEVICES has MASTER/COMMANDS
    if (!masterSnap.exists) {
      const devicesSnap = await firestore().collection(`farms/${farmId}/DEVICES`).get();
      for (const d of devicesSnap.docs) {
        const candidateRef = d.ref.collection('MASTER').doc('COMMANDS');
        const candidateSnap = await candidateRef.get();
        if (candidateSnap.exists) {
          masterCommandsRef = candidateRef;
          masterSnap = candidateSnap;
          break;
        }
      }
    }

    if (!masterSnap.exists) {
      return false;
    }

    const updates: Record<string, any> = {};
    if (action === 'PUMP_ON') {
      updates.RELAY1 = true;
      updates.RELAY1_SOURCE = 'APP';
    } else if (action === 'PUMP_OFF') {
      updates.RELAY1 = false;
      updates.RELAY1_SOURCE = 'APP';
    } else if (action === 'VALVE_ON') {
      updates.RELAY2 = true;
      updates.RELAY2_SOURCE = 'APP';
    } else if (action === 'VALVE_OFF') {
      updates.RELAY2 = false;
      updates.RELAY2_SOURCE = 'APP';
    } else if (action === 'LIGHT_ON') {
      updates.RELAY3 = true;
      updates.RELAY3_SOURCE = 'APP';
    } else if (action === 'LIGHT_OFF') {
      updates.RELAY3 = false;
      updates.RELAY3_SOURCE = 'APP';
    } else if (action === 'SIREN_ON') {
      updates.RELAY4 = true;
      updates.RELAY4_SOURCE = 'APP';
    } else if (action === 'SIREN_OFF') {
      updates.RELAY4 = false;
      updates.RELAY4_SOURCE = 'APP';
    }

    if (Object.keys(updates).length > 0) {
      await masterCommandsRef.update(updates);
      logger.info({ farmId, deviceId, action, updates }, 'Updated legacy MASTER/COMMANDS relay');

      // Immediately acknowledge command for the app
      await acknowledgeCommand(farmId, deviceId, commandId, true);

      // Auto-off timer if durationSeconds was provided
      if (durationSeconds && durationSeconds > 0 && action.endsWith('_ON')) {
        const offAction = action.replace('_ON', '_OFF') as CommandAction;
        setTimeout(async () => {
          try {
            const offUpdates: Record<string, any> = {};
            if (offAction === 'PUMP_OFF') {
              offUpdates.RELAY1 = false;
              offUpdates.RELAY1_SOURCE = 'TIMER';
            } else if (offAction === 'VALVE_OFF') {
              offUpdates.RELAY2 = false;
              offUpdates.RELAY2_SOURCE = 'TIMER';
            } else if (offAction === 'LIGHT_OFF') {
              offUpdates.RELAY3 = false;
              offUpdates.RELAY3_SOURCE = 'TIMER';
            } else if (offAction === 'SIREN_OFF') {
              offUpdates.RELAY4 = false;
              offUpdates.RELAY4_SOURCE = 'TIMER';
            }
            await masterCommandsRef.update(offUpdates);
            logger.info({ farmId, deviceId, offAction }, 'Auto-turned off relay after duration');
          } catch (err) {
            logger.warn({ err }, 'Failed to auto-off relay after duration');
          }
        }, durationSeconds * 1000);
      }

      return true;
    }
  } catch (err) {
    logger.error({ err, farmId, deviceId, action }, 'Failed to sync legacy relay command');
  }

  return false;
}

/**
 * Real-time Hardware Bridge:
 * Listens to Firestore collections written directly by legacy/GSM hardware
 * (`farms/{farmId}/DEVICES/{masterMac}/SLAVE/{nodeDoc}`) and automatically
 * projects the live telemetry into the Krishiva v2 schema:
 * `farms/{farmId}/devices/{mac}/latest/current` and `readings_YYYY_MM_DD`.
 */
export async function startHardwareBridge(): Promise<void> {
  if (slaveUnsubscribe || devicesUnsubscribe) {
    logger.debug('Hardware bridge is already running');
    return;
  }

  logger.info('Starting Real-Time Hardware Bridge for legacy ESP32/GSM gateways...');

  try {
    // 1. Listen to all SLAVE sensor node documents across all farms
    slaveUnsubscribe = firestore()
      .collectionGroup('SLAVE')
      .onSnapshot(
        async (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') continue;

            const doc = change.doc;
            const parts = doc.ref.path.split('/');
            // Expected path: farms/{farmId}/DEVICES/{masterMac}/SLAVE/{nodeDocId}
            if (parts.length < 6 || parts[0] !== 'farms' || parts[2] !== 'DEVICES') {
              continue;
            }

            const farmId = parts[1];
            const data = doc.data();
            const mac = data.MAC || doc.id;
            const temp = data.TEMP !== undefined && data.TEMP !== null ? Number(data.TEMP) : null;
            const humidity = data.HUMIDITY !== undefined && data.HUMIDITY !== null ? Number(data.HUMIDITY) : null;
            const soil = data.SOIL_MOISTURE !== undefined && data.SOIL_MOISTURE !== null ? Number(data.SOIL_MOISTURE) : null;
            const status = data.STATUS ? String(data.STATUS).toLowerCase() : 'online';

            let lastSeenAt = new Date().toISOString();
            if (data.LAST_SEEN && typeof data.LAST_SEEN.toDate === 'function') {
              lastSeenAt = data.LAST_SEEN.toDate().toISOString();
            }

            let nodeId = 1;
            const rawNodeId = data['NODE ID'] || doc.id;
            if (typeof rawNodeId === 'string') {
              const match = rawNodeId.match(/\d+/);
              if (match) {
                // Offset by 1 so gateway is node 1, slave 1 is node 2, slave 2 is node 3
                nodeId = parseInt(match[0], 10) + 1;
              }
            }

            try {
              // Write to v2 latest/current
              const currentDocRef = firestore().doc(`farms/${farmId}/devices/${mac}/latest/current`);
              await currentDocRef.set(
                {
                  nodeId,
                  temperature: temp,
                  humidity,
                  soilMoisture: soil,
                  recordedAt: lastSeenAt,
                  receivedAt: new Date().toISOString(),
                  status,
                },
                { merge: true }
              );

              // Update device status and lastSeenAt
              const deviceDocRef = firestore().doc(`farms/${farmId}/devices/${mac}`);
              await deviceDocRef.set(
                {
                  status,
                  lastSeenAt,
                },
                { merge: true }
              );

              // Also write to daily bucket for historical trends & AI models
              const recDate = new Date(lastSeenAt);
              if (!isNaN(recDate.getTime())) {
                const yyyy = recDate.getUTCFullYear();
                const mm = String(recDate.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(recDate.getUTCDate()).padStart(2, '0');
                const bucketName = `readings_${yyyy}_${mm}_${dd}`;
                await firestore()
                  .collection(`farms/${farmId}/devices/${mac}/${bucketName}`)
                  .add({
                    nodeId,
                    temperature: temp,
                    humidity,
                    soilMoisture: soil,
                    recordedAt: lastSeenAt,
                    receivedAt: new Date().toISOString(),
                  });
              }

              logger.debug(
                { farmId, mac, temp, humidity, soil, lastSeenAt },
                'Hardware bridge: Synced SLAVE reading to v2 schema'
              );
            } catch (syncErr) {
              logger.warn({ syncErr, farmId, mac }, 'Failed to sync SLAVE node to v2 schema');
            }
          }
        },
        (err) => {
          logger.error({ err }, 'Error in Hardware Bridge SLAVE listener');
        }
      );

    // 2. Listen to master gateway documents under farms/{farmId}/DEVICES
    devicesUnsubscribe = firestore()
      .collectionGroup('DEVICES')
      .onSnapshot(
        async (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') continue;

            const doc = change.doc;
            const parts = doc.ref.path.split('/');
            // Expected: farms/{farmId}/DEVICES/{masterMac}
            if (parts.length !== 4 || parts[0] !== 'farms' || parts[2] !== 'DEVICES') {
              continue;
            }

            const farmId = parts[1];
            const masterMac = doc.id;
            const data = doc.data();

            let lastSeenAt = new Date().toISOString();
            if (data.LAST_SEEN && typeof data.LAST_SEEN.toDate === 'function') {
              lastSeenAt = data.LAST_SEEN.toDate().toISOString();
            }

            const status = data.STATUS ? String(data.STATUS).toLowerCase() : 'online';

            try {
              await firestore().doc(`farms/${farmId}/devices/${masterMac}`).set(
                {
                  status,
                  lastSeenAt,
                },
                { merge: true }
              );
            } catch (err) {
              logger.warn({ err, farmId, masterMac }, 'Failed to sync master gateway status');
            }
          }
        },
        (err) => {
          logger.error({ err }, 'Error in Hardware Bridge DEVICES listener');
        }
      );

    logger.info('Real-Time Hardware Bridge active and listening for live ESP32 updates');

    // Sync existing legacy schedules for all hardware farms on startup
    try {
      const hardwareFarmsSnap = await firestore().collectionGroup('MASTER').get();
      const farmIds = new Set<string>();
      for (const doc of hardwareFarmsSnap.docs) {
        const parts = doc.ref.path.split('/');
        if (parts[0] === 'farms') {
          farmIds.add(parts[1]);
        }
      }
      for (const fid of farmIds) {
        await syncLegacySchedules(fid).catch(() => {});
      }
    } catch (e) {
      logger.warn({ err: e }, 'Failed initial sync of legacy schedules');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Hardware Bridge');
  }
}

export function stopHardwareBridge(): void {
  if (slaveUnsubscribe) {
    slaveUnsubscribe();
    slaveUnsubscribe = null;
  }
  if (devicesUnsubscribe) {
    devicesUnsubscribe();
    devicesUnsubscribe = null;
  }
  logger.info('Hardware bridge stopped');
}

/**
 * Synchronizes Krishiva schedules to physical ESP32 gateway MASTER/COMMANDS (SCHEDULES array).
 */
export async function syncLegacySchedules(farmId: string, targetDeviceId?: string): Promise<void> {
  try {
    let deviceIds: string[] = [];
    if (targetDeviceId) {
      deviceIds = [targetDeviceId];
    } else {
      const devicesSnap = await firestore().collection(`farms/${farmId}/DEVICES`).get();
      deviceIds = devicesSnap.docs.map((d) => d.id);
    }

    if (deviceIds.length === 0) return;

    // Get farm doc for timezone
    const farmDoc = await firestore().doc(`farms/${farmId}`).get();
    const timezone = farmDoc.data()?.timezone || 'Asia/Kolkata';

    // Get all active schedules for this farm
    const schedulesSnap = await firestore().collection(`farms/${farmId}/schedules`).get();
    const allSchedules = schedulesSnap.docs.map((d) => d.data());

    // Helper to format date YYYY-MM-DD
    let todayStr: string;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      todayStr = formatter.format(new Date());
    } catch {
      const now = new Date();
      todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    for (const devId of deviceIds) {
      let masterCommandsRef = firestore().doc(`farms/${farmId}/DEVICES/${devId}/MASTER/COMMANDS`);
      let masterSnap = await masterCommandsRef.get();

      if (!masterSnap.exists) {
        // Try searching under other devices
        const allDevs = await firestore().collection(`farms/${farmId}/DEVICES`).get();
        for (const candidate of allDevs.docs) {
          const cRef = candidate.ref.collection('MASTER').doc('COMMANDS');
          const cSnap = await cRef.get();
          if (cSnap.exists) {
            masterCommandsRef = cRef;
            masterSnap = cSnap;
            break;
          }
        }
      }

      if (!masterSnap.exists) continue;

      const existingData = masterSnap.data() || {};
      const currentHardwareSchedules: string[] = Array.isArray(existingData.SCHEDULES)
        ? [...existingData.SCHEDULES]
        : [];

      // Filter schedules that belong to this device and are enabled
      const deviceSchedules = allSchedules.filter(
        (s) => s.deviceId === devId && s.enabled !== false
      );

      // Convert Krishiva schedules into hardware strings (e.g. "R1,2026-10-31,16:30,16:45,ONCE")
      const activeStrings: string[] = deviceSchedules.map((s) => {
        let relay = 'R1';
        const act = String(s.action || '').toUpperCase();
        if (act.includes('PUMP')) relay = 'R1';
        else if (act.includes('VALVE')) relay = 'R2';
        else if (act.includes('LIGHT')) relay = 'R3';
        else if (act.includes('SIREN')) relay = 'R4';

        const startTime = s.time;
        const [hStr, mStr] = startTime.split(':');
        const h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        const durationMins =
          s.durationSeconds && s.durationSeconds > 0
            ? Math.max(1, Math.round(s.durationSeconds / 60))
            : 1;
        const totalMins = h * 60 + m + durationMins;
        const endH = Math.floor((totalMins / 60) % 24);
        const endM = totalMins % 60;
        const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        const repeat = 'ONCE';

        return `${relay},${todayStr},${startTime},${endTime},${repeat}`;
      });

      // Avoid duplicates for the same relay and start time
      const activeRelayStarts = new Set(
        activeStrings.map((str) => {
          const parts = str.split(',');
          return `${parts[0]}_${parts[2]}`;
        })
      );

      const preservedOld = currentHardwareSchedules.filter((str) => {
        const parts = str.split(',');
        const key = `${parts[0]}_${parts[2]}`;
        return !activeRelayStarts.has(key);
      });

      const finalSchedules = [...activeStrings, ...preservedOld];

      await masterCommandsRef.set(
        {
          SCHEDULES: finalSchedules,
        },
        { merge: true }
      );

      // Also update SCHEDULES count on parent DEVICE doc
      const devDocRef = firestore().doc(`farms/${farmId}/DEVICES/${devId}`);
      await devDocRef.set(
        {
          SCHEDULES: finalSchedules.length,
        },
        { merge: true }
      );

      logger.info(
        { farmId, devId, finalSchedules, count: finalSchedules.length },
        'Successfully synced schedule to hardware MASTER/COMMANDS'
      );
    }
  } catch (err) {
    logger.error({ err, farmId, targetDeviceId }, 'Failed to sync schedules to legacy hardware');
  }
}


