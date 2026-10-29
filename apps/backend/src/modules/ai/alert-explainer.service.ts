import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';
import { callGrok, isGrokEnabled, type ChatMessage } from './grok.client.js';

export interface QueuedAlert {
  farmId: string;
  alertId: string;
}

/**
 * In-memory FIFO queue for alerts pending Grok AI explanation.
 */
export const alertQueue: QueuedAlert[] = [];

/**
 * Pushes a new alert identifier to the processing queue.
 */
export function enqueueAlert(farmId: string, alertId: string): void {
  alertQueue.push({ farmId, alertId });
  logger.debug({ farmId, alertId, queueLength: alertQueue.length }, 'Alert enqueued for AI explanation');
}

/**
 * Clears the alert queue in-memory.
 */
export function clearAlertQueue(): void {
  alertQueue.length = 0;
}

/**
 * Returns current snapshot of queued alerts (read-only view).
 */
export function getAlertQueue(): QueuedAlert[] {
  return [...alertQueue];
}

/**
 * Background processor that pops up to 5 items from the alert queue,
 * queries relevant reading context, invokes Grok to generate a short explanation,
 * and updates farms/{farmId}/alerts/{alertId} with `aiExplanation`.
 */
export async function processAlertQueue(maxBatchSize = 5): Promise<number> {
  // If AI is disabled, clear the queue to prevent memory leaks and return 0
  if (!isGrokEnabled()) {
    if (alertQueue.length > 0) {
      logger.info({ droppedCount: alertQueue.length }, 'AI disabled: clearing alertQueue to prevent memory leak');
      alertQueue.length = 0;
    }
    return 0;
  }

  if (alertQueue.length === 0) {
    return 0;
  }

  // Pop up to maxBatchSize items
  const batch = alertQueue.splice(0, maxBatchSize);
  let processedCount = 0;

  for (const item of batch) {
    try {
      const alertRef = firestore().doc(`farms/${item.farmId}/alerts/${item.alertId}`);
      const alertSnap = await alertRef.get();

      if (!alertSnap.exists) {
        logger.warn(
          { farmId: item.farmId, alertId: item.alertId },
          'Alert doc not found during AI explanation processing, skipping'
        );
        continue;
      }

      const alertData = alertSnap.data() || {};
      if (alertData.aiExplanation) {
        logger.debug(
          { farmId: item.farmId, alertId: item.alertId },
          'Alert already has aiExplanation, skipping'
        );
        continue;
      }

      // Fetch latest device reading for environmental context
      let soil: number | string = 'N/A';
      let temp: number | string = 'N/A';

      if (alertData.deviceId) {
        try {
          const latestSnap = await firestore()
            .doc(`farms/${item.farmId}/devices/${alertData.deviceId}/latest/current`)
            .get();

          if (latestSnap.exists) {
            const latestData = latestSnap.data();
            if (typeof latestData?.soilMoisture === 'number') {
              soil = latestData.soilMoisture;
            }
            if (typeof latestData?.temperature === 'number') {
              temp = latestData.temperature;
            }
          }
        } catch (fetchErr) {
          logger.warn(
            { fetchErr, deviceId: alertData.deviceId },
            'Failed to retrieve latest reading for alert explanation'
          );
        }
      }

      // Fallback context based on alert type/value if latest was missing
      if (soil === 'N/A' && (alertData.type?.includes('SOIL') || alertData.type?.includes('DRY'))) {
        soil = alertData.value ?? 'N/A';
      }
      if (temp === 'N/A' && alertData.type === 'HEAT_STRESS') {
        temp = alertData.value ?? 'N/A';
      }

      const promptMessages: ChatMessage[] = [
        {
          role: 'system',
          content:
            "You are Krishiva's agronomy assistant. Write a 1-sentence actionable explanation for the farmer based on this alert. Keep it under 20 words. No markdown.",
        },
        {
          role: 'user',
          content: `Alert: ${alertData.message}. Current soil: ${soil}%, Temp: ${temp}C.`,
        },
      ];

      const rawExplanation = await callGrok(promptMessages, {
        temperature: 0.3,
        max_tokens: 60,
      });

      const cleanExplanation = rawExplanation
        .replace(/[`*]/g, '')
        .replace(/^["']|["']$/g, '')
        .trim();

      await alertRef.update({
        aiExplanation: cleanExplanation,
      });

      processedCount++;
      logger.info(
        { farmId: item.farmId, alertId: item.alertId, aiExplanation: cleanExplanation },
        'Alert document updated with Grok aiExplanation'
      );
    } catch (err: any) {
      logger.error(
        { err: err?.message || err, farmId: item.farmId, alertId: item.alertId },
        'Failed to process alert item in AI explanation queue'
      );
    }
  }

  return processedCount;
}

