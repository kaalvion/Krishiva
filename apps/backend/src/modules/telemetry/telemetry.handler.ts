import { z } from 'zod';
import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { checkAlerts } from '../alerts/alerts.service.js';

export const telemetryPayloadSchema = z.object({
  nodeId: z.coerce
    .number({ required_error: 'nodeId is required' })
    .int('nodeId must be an integer')
    .min(1, 'nodeId must be between 1 and 4')
    .max(4, 'nodeId must be between 1 and 4'),
  temperature: z
    .number({ required_error: 'temperature is required' })
    .min(-50, 'temperature must be between -50 and 80')
    .max(80, 'temperature must be between -50 and 80'),
  humidity: z
    .number({ required_error: 'humidity is required' })
    .min(0, 'humidity must be between 0 and 100')
    .max(100, 'humidity must be between 0 and 100'),
  soilMoisture: z
    .number({ required_error: 'soilMoisture is required' })
    .min(0, 'soilMoisture must be between 0 and 100')
    .max(100, 'soilMoisture must be between 0 and 100'),
  recordedAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'recordedAt must be a valid ISO datetime string',
    })
    .optional()
    .default(() => new Date().toISOString()),
  seq: z.coerce.number().int().optional(),
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

  // Compute UTC daily bucket collection name: readings_YYYY_MM_DD
  const recDate = new Date(telemetryData.recordedAt);
  const yyyy = recDate.getUTCFullYear();
  const mm = String(recDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(recDate.getUTCDate()).padStart(2, '0');
  const bucketName = `readings_${yyyy}_${mm}_${dd}`;
  const bucketCollectionPath = `farms/${farmId}/devices/${deviceId}/${bucketName}`;

  const readingRecord = {
    nodeId: telemetryData.nodeId,
    temperature: telemetryData.temperature,
    humidity: telemetryData.humidity,
    soilMoisture: telemetryData.soilMoisture,
    recordedAt: telemetryData.recordedAt,
    receivedAt: now,
    ...(telemetryData.seq !== undefined ? { seq: telemetryData.seq } : {}),
  };

  try {
    const bucketRef = firestore().collection(bucketCollectionPath);

    // 1. Write to daily bucket with deduplication when seq is provided
    if (telemetryData.seq !== undefined && telemetryData.seq !== null) {
      const docId = `seq_${telemetryData.seq}`;
      const docRef = bucketRef.doc(docId);
      try {
        await docRef.create(readingRecord);
      } catch (err: any) {
        // If document already exists (code 6), skip duplicate reading
        if (
          err?.code === 6 ||
          err?.message?.includes('ALREADY_EXISTS') ||
          err?.details?.includes('Already exists')
        ) {
          logger.info(
            { seq: telemetryData.seq, deviceId, farmId, bucketName },
            `Duplicate reading seq_${telemetryData.seq} skipped`
          );
          return;
        }
        throw err;
      }
    } else {
      const docRef = bucketRef.doc();
      await docRef.create(readingRecord);
    }

    // 2. Update singleton latest/current document
    const latestDocPath = `farms/${farmId}/devices/${deviceId}/latest/current`;
    const latestDocRef = firestore().doc(latestDocPath);
    await latestDocRef.set(
      {
        ...readingRecord,
        status: 'online',
      },
      { merge: true }
    );

    // 3. Update device status and lastSeenAt if device doc exists
    const deviceRef = firestore().doc(`farms/${farmId}/devices/${deviceId}`);
    const deviceSnap = await deviceRef.get();
    if (deviceSnap.exists) {
      await deviceRef.update({
        lastSeenAt: now,
        status: 'online',
      });
    }

    logger.info(
      { farmId, deviceId, nodeId: telemetryData.nodeId, bucketName },
      'Telemetry reading recorded successfully'
    );

    // 4. Trigger alert evaluation (isolated in try/catch to never break ingestion)
    try {
      await checkAlerts(farmId, deviceId, readingRecord);
    } catch (alertErr) {
      logger.error(
        { err: alertErr, farmId, deviceId },
        'Alert check failed during telemetry ingestion'
      );
    }
  } catch (err) {
    logger.error({ err, farmId, deviceId }, 'Failed to persist telemetry reading to Firestore');
    throw err;
  }
}
