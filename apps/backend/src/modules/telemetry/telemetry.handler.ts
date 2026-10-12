import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';

export const telemetryPayloadSchema = z.object({
  nodeId: z.coerce
    .number({ required_error: 'nodeId is required' })
    .int('nodeId must be an integer')
    .min(1, 'nodeId must be between 1 and 4')
    .max(4, 'nodeId must be between 1 and 4'),
  temperature: z.number({ required_error: 'temperature is required' }),
  humidity: z.number({ required_error: 'humidity is required' }),
  soilMoisture: z.number({ required_error: 'soilMoisture is required' }),
  recordedAt: z.union([z.string(), z.number()], {
    required_error: 'recordedAt must be an ISO string or epoch timestamp',
  }),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

/**
 * Handles incoming telemetry messages from MQTT broker.
 * Topic pattern: krishiva/{farmId}/{deviceId}/telemetry
 */
export async function handleTelemetryMessage(
  topic: string,
  payload: Buffer | string
): Promise<void> {
  const parts = topic.split('/');
  if (parts.length < 4 || parts[0] !== 'krishiva' || parts[3] !== 'telemetry') {
    logger.warn({ topic }, 'Ignoring message with unexpected topic format');
    return;
  }

  const farmId = parts[1];
  const deviceId = parts[2];

  let rawJson: unknown;
  try {
    const rawString = typeof payload === 'string' ? payload : payload.toString('utf8');
    rawJson = JSON.parse(rawString);
  } catch (err) {
    logger.error({ err, topic }, 'Failed to parse telemetry JSON payload');
    return;
  }

  const parseResult = telemetryPayloadSchema.safeParse(rawJson);
  if (!parseResult.success) {
    logger.warn(
      { errors: parseResult.error.issues, topic },
      'Invalid telemetry payload schema'
    );
    return;
  }

  const telemetryData = parseResult.data;
  const now = new Date().toISOString();

  try {
    const docPath = `farms/${farmId}/devices/${deviceId}/latest/current`;
    const docRef = firestore().doc(docPath);

    // 1. Update latest reading document
    await docRef.set(
      {
        ...telemetryData,
        receivedAt: now,
        status: 'online',
      },
      { merge: true }
    );

    // 2. If device document exists, update lastSeenAt and set status to 'online'
    const deviceRef = firestore().doc(`farms/${farmId}/devices/${deviceId}`);
    const deviceSnap = await deviceRef.get();
    if (deviceSnap.exists) {
      await deviceRef.update({
        lastSeenAt: now,
        status: 'online',
      });
    }

    logger.info(
      { farmId, deviceId, nodeId: telemetryData.nodeId, docPath },
      'Telemetry saved to Firestore'
    );
  } catch (err) {
    logger.error({ err, farmId, deviceId }, 'Failed to write telemetry to Firestore');
    throw err;
  }
}
