import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { firestore, initFirebase } from '../../../plugins/firebase.js';
import * as grokClient from '../grok.client.js';
import {
  enqueueAlert,
  clearAlertQueue,
  alertQueue,
  processAlertQueue,
} from '../alert-explainer.service.js';

describe('Alert Explainer Background Service', () => {
  const farmId = 'explainerTestFarm';
  const deviceId = 'explainerTestDevice';
  const alertId = 'explainerTestAlert1';

  beforeAll(() => {
    initFirebase();
  });

  beforeEach(() => {
    clearAlertQueue();
    vi.restoreAllMocks();
  });

  it('successfully pops items from the queue, calls Grok, and updates Firestore with aiExplanation', async () => {
    // 1. Seed device latest reading
    await firestore()
      .doc(`farms/${farmId}/devices/${deviceId}/latest/current`)
      .set({
        soilMoisture: 21.5,
        temperature: 32.0,
        humidity: 45.0,
        recordedAt: new Date().toISOString(),
        status: 'online',
      });

    // 2. Seed alert document with aiExplanation: null
    const alertRef = firestore().doc(`farms/${farmId}/alerts/${alertId}`);
    await alertRef.set({
      deviceId,
      type: 'SOIL_MOISTURE_LOW',
      severity: 'warning',
      message: 'Low soil moisture: 21.5% (below 25% for 2 consecutive readings)',
      value: 21.5,
      threshold: 25,
      acknowledged: false,
      createdAt: new Date().toISOString(),
      aiExplanation: null,
      cooldownKey: `${deviceId}_SOIL_MOISTURE_LOW`,
    });

    // 3. Mock Grok client
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(true);
    const mockExplanation = 'Irrigate field soon to prevent root stress and maintain yield.';
    const callGrokSpy = vi
      .spyOn(grokClient, 'callGrok')
      .mockResolvedValue(mockExplanation);

    // 4. Enqueue alert
    enqueueAlert(farmId, alertId);
    expect(alertQueue.length).toBe(1);

    // 5. Run processAlertQueue
    const processedCount = await processAlertQueue();

    expect(processedCount).toBe(1);
    expect(alertQueue.length).toBe(0); // Pop was successful
    expect(callGrokSpy).toHaveBeenCalledTimes(1);

    // Verify prompt content sent to Grok
    const passedMessages = callGrokSpy.mock.calls[0][0];
    expect(passedMessages[0].role).toBe('system');
    expect(passedMessages[0].content).toContain("Krishiva's agronomy assistant");
    expect(passedMessages[1].role).toBe('user');
    expect(passedMessages[1].content).toContain('Alert: Low soil moisture: 21.5%');
    expect(passedMessages[1].content).toContain('Current soil: 21.5%');
    expect(passedMessages[1].content).toContain('Temp: 32C');

    // 6. Verify Firestore alert document was updated
    const updatedSnap = await alertRef.get();
    expect(updatedSnap.exists).toBe(true);
    const data = updatedSnap.data();
    expect(data?.aiExplanation).toBe(mockExplanation);

    // Teardown
    await alertRef.delete();
  });

  it('clears the queue without calling Grok if AI is disabled (preventing memory leaks)', async () => {
    // 1. Mock Grok disabled
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(false);
    const callGrokSpy = vi.spyOn(grokClient, 'callGrok');

    // 2. Enqueue multiple alert items
    enqueueAlert(farmId, 'alertA');
    enqueueAlert(farmId, 'alertB');
    enqueueAlert(farmId, 'alertC');
    expect(alertQueue.length).toBe(3);

    // 3. Process queue
    const processedCount = await processAlertQueue();

    expect(processedCount).toBe(0);
    expect(callGrokSpy).not.toHaveBeenCalled();
    expect(alertQueue.length).toBe(0); // Queue should be cleared to prevent memory leaks
  });

  it('respects batch size and limits processing to max 5 items per run', async () => {
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(true);
    vi.spyOn(grokClient, 'callGrok').mockResolvedValue('Short explanation text.');

    // Mock alert doc exists
    for (let i = 1; i <= 7; i++) {
      enqueueAlert(farmId, `batchAlert_${i}`);
    }
    expect(alertQueue.length).toBe(7);

    // Run processAlertQueue with default maxBatchSize = 5
    // Note: since the batchAlert docs don't exist in Firestore, processAlertQueue will skip them after popping
    const processed = await processAlertQueue(5);

    // 5 items were popped from queue, 2 should remain
    expect(alertQueue.length).toBe(2);
  });
});

