import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { acknowledgeCommand } from './commands.service.js';

export const ackPayloadSchema = z.object({
  commandId: z.string({ required_error: 'commandId is required' }).min(1),
  success: z.boolean({ required_error: 'success is required' }),
  error: z.string().optional(),
});

export type AckPayload = z.infer<typeof ackPayloadSchema>;

/**
 * Handles incoming command acknowledgment messages from MQTT broker.
 * Topic pattern: krishiva/{farmId}/{deviceId}/ack
 */
export async function handleAckMessage(
  topic: string,
  payload: Buffer | string
): Promise<void> {
  const parts = topic.split('/');
  if (parts.length < 4 || parts[0] !== 'krishiva' || parts[3] !== 'ack') {
    logger.warn({ topic }, 'Ignoring message with unexpected ACK topic format');
    return;
  }

  const farmId = parts[1];
  const deviceId = parts[2];

  let rawJson: unknown;
  try {
    const rawString = typeof payload === 'string' ? payload : payload.toString('utf8');
    rawJson = JSON.parse(rawString);
  } catch (err) {
    logger.warn({ err, topic }, 'Failed to parse command ACK JSON payload, ignoring');
    return;
  }

  const parseResult = ackPayloadSchema.safeParse(rawJson);
  if (!parseResult.success) {
    logger.warn(
      { errors: parseResult.error.issues, topic },
      'Invalid command ACK payload schema, ignoring'
    );
    return;
  }

  const { commandId, success, error } = parseResult.data;
  await acknowledgeCommand(farmId, deviceId, commandId, success, error);
}
