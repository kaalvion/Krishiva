import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { publishCommand } from '../../plugins/mqtt.js';

export const COMMAND_TIMEOUT_MS = 30000;

export const COMMAND_ACTIONS = [
  'PUMP_ON',
  'PUMP_OFF',
  'VALVE_ON',
  'VALVE_OFF',
  'LIGHT_ON',
  'LIGHT_OFF',
  'SIREN_ON',
  'SIREN_OFF',
] as const;

export type CommandAction = (typeof COMMAND_ACTIONS)[number];

export const ACTION_CAPABILITY_MAP: Record<CommandAction, string> = {
  PUMP_ON: 'pump',
  PUMP_OFF: 'pump',
  VALVE_ON: 'valve',
  VALVE_OFF: 'valve',
  LIGHT_ON: 'light',
  LIGHT_OFF: 'light',
  SIREN_ON: 'siren',
  SIREN_OFF: 'siren',
};

export const COMMAND_SOURCES = ['mobile', 'admin', 'scheduler', 'ai'] as const;
export type CommandSource = (typeof COMMAND_SOURCES)[number];

export const COMMAND_STATUSES = [
  'pending',
  'published',
  'acknowledged',
  'failed',
  'expired',
] as const;
export type CommandStatus = (typeof COMMAND_STATUSES)[number];

export interface CommandDoc {
  id: string;
  commandId: string;
  farmId: string;
  deviceId: string;
  action: CommandAction;
  status: CommandStatus;
  requestedBy: string;
  source: CommandSource;
  durationSeconds: number | null;
  createdAt: string;
  publishedAt: string | null;
  acknowledgedAt: string | null;
  error: string | null;
}

export interface IssueCommandParams {
  farmId: string;
  deviceId: string;
  action: CommandAction;
  requestedBy: string;
  source?: CommandSource;
  durationSeconds?: number | null;
}

/**
 * Map storing active timeout handles for issued commands.
 */
const activeTimers = new Map<string, NodeJS.Timeout>();

export function generateCommandId(): string {
  const timestamp = Date.now();
  const random6 = Math.random().toString(36).substring(2, 8);
  return `cmd-${timestamp}-${random6}`;
}

/**
 * Issues an actuator command:
 * 1. Creates farms/{farmId}/devices/{deviceId}/commands/{commandId} with status "pending".
 * 2. Publishes payload {commandId, action, durationSeconds, issuedAt} to MQTT.
 * 3. On success, sets status "published" and publishedAt, then arms a 30s timeout.
 * 4. On publish failure, sets status "failed" with error text.
 * 5. Returns { commandId, status: "pending" }.
 */
export async function issueCommand(params: IssueCommandParams): Promise<{
  commandId: string;
  status: 'pending';
}> {
  const { farmId, deviceId, action, requestedBy, source = 'admin', durationSeconds } = params;
  const commandId = generateCommandId();
  const now = new Date().toISOString();

  const commandRef = firestore().doc(`farms/${farmId}/devices/${deviceId}/commands/${commandId}`);

  const commandData: CommandDoc = {
    id: commandId,
    commandId,
    farmId,
    deviceId,
    action,
    status: 'pending',
    requestedBy,
    source,
    durationSeconds: durationSeconds ?? null,
    createdAt: now,
    publishedAt: null,
    acknowledgedAt: null,
    error: null,
  };

  // 1. Create document with status "pending"
  await commandRef.set(commandData);

  // 2. Publish payload to MQTT topic
  const mqttPayload: {
    commandId: string;
    action: CommandAction;
    durationSeconds?: number;
    issuedAt: string;
  } = {
    commandId,
    action,
    issuedAt: new Date().toISOString(),
  };

  if (durationSeconds !== undefined && durationSeconds !== null) {
    mqttPayload.durationSeconds = durationSeconds;
  }

  try {
    await publishCommand(farmId, deviceId, mqttPayload);

    // On success: status "published" + publishedAt
    const publishedAt = new Date().toISOString();
    await commandRef.update({
      status: 'published',
      publishedAt,
    });

    // 3. Start 30-second timeout: if still "published" after 30s, set status "expired"
    const timer = setTimeout(async () => {
      try {
        activeTimers.delete(commandId);
        const snap = await commandRef.get();
        if (snap.exists && snap.data()?.status === 'published') {
          await commandRef.update({
            status: 'expired',
            error: 'No acknowledgment received within 30 seconds',
          });
          logger.info({ farmId, deviceId, commandId }, 'Command marked as expired due to ACK timeout');
        }
      } catch (err) {
        logger.error({ err, farmId, deviceId, commandId }, 'Error in command expiration handler');
      }
    }, COMMAND_TIMEOUT_MS);

    activeTimers.set(commandId, timer);
  } catch (publishErr: any) {
    // On publish failure: status "failed" + error
    const errorText = publishErr?.message || String(publishErr);
    await commandRef.update({
      status: 'failed',
      error: errorText,
    });
    logger.error({ err: publishErr, farmId, deviceId, commandId }, 'Failed to publish command to MQTT');
  }

  return { commandId, status: 'pending' };
}

/**
 * Handles device command acknowledgment:
 * 1. Validates command existence (warns and ignores unknown commandIds).
 * 2. Ignores ACKs for commands already expired or failed.
 * 3. Updates status to "acknowledged" (on success) or "failed" with acknowledgedAt.
 */
export async function acknowledgeCommand(
  farmId: string,
  deviceId: string,
  commandId: string,
  success: boolean,
  error?: string
): Promise<void> {
  const commandRef = firestore().doc(`farms/${farmId}/devices/${deviceId}/commands/${commandId}`);
  const snap = await commandRef.get();

  if (!snap.exists) {
    logger.warn({ farmId, deviceId, commandId }, 'Received ACK for unknown commandId, ignoring');
    return;
  }

  const currentData = snap.data();
  const currentStatus = currentData?.status;

  if (currentStatus === 'expired' || currentStatus === 'failed') {
    logger.warn(
      { farmId, deviceId, commandId, currentStatus },
      'Ignoring ACK for command that is already expired or failed'
    );
    return;
  }

  // Clear in-memory timeout
  const timer = activeTimers.get(commandId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(commandId);
  }

  const acknowledgedAt = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: success ? 'acknowledged' : 'failed',
    acknowledgedAt,
  };

  if (!success && error) {
    updateData.error = error;
  }

  await commandRef.update(updateData);
  logger.info({ farmId, deviceId, commandId, success }, 'Command ACK processed successfully');
}

/**
 * Periodic sweep job: expires any "published" commands older than 30s.
 * Ensures command expiration persists even across server restarts.
 */
export async function sweepExpiredCommands(): Promise<number> {
  let expiredCount = 0;
  const now = Date.now();

  try {
    const snap = await firestore()
      .collectionGroup('commands')
      .where('status', '==', 'published')
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const pubTime = data.publishedAt
        ? new Date(data.publishedAt).getTime()
        : new Date(data.createdAt).getTime();

      if (now - pubTime >= COMMAND_TIMEOUT_MS) {
        await doc.ref.update({
          status: 'expired',
          error: 'No acknowledgment received within 30 seconds',
        });
        expiredCount++;
      }
    }
  } catch (err: any) {
    if (
      err?.code === 9 ||
      err?.message?.includes('COLLECTION_GROUP') ||
      err?.message?.includes('index')
    ) {
      // Fallback while COLLECTION_GROUP index is building in Firestore
      try {
        const farmsSnap = await firestore().collection('farms').get();
        for (const farmDoc of farmsSnap.docs) {
          const devSnap = await farmDoc.ref.collection('devices').get();
          for (const devDoc of devSnap.docs) {
            const cmdSnap = await devDoc.ref
              .collection('commands')
              .where('status', '==', 'published')
              .get();

            for (const cmdDoc of cmdSnap.docs) {
              const data = cmdDoc.data();
              const pubTime = data.publishedAt
                ? new Date(data.publishedAt).getTime()
                : new Date(data.createdAt).getTime();

              if (now - pubTime >= COMMAND_TIMEOUT_MS) {
                await cmdDoc.ref.update({
                  status: 'expired',
                  error: 'No acknowledgment received within 30 seconds',
                });
                expiredCount++;
              }
            }
          }
        }
      } catch (fallbackErr) {
        logger.error({ err: fallbackErr }, 'Error in fallback sweepExpiredCommands');
      }
    } else {
      logger.error({ err }, 'Error executing sweepExpiredCommands');
    }
  }

  if (expiredCount > 0) {
    logger.info({ expiredCount }, 'Swept expired published commands');
  }
  return expiredCount;
}
