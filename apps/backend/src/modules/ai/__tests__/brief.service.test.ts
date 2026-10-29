import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { generateFarmBrief, getLatestBrief, parseBriefJson } from '../brief.service.js';
import { firestore, initFirebase } from '../../../plugins/firebase.js';
import * as grokClient from '../grok.client.js';

describe('Farm Brief Service', () => {
  const farmId = 'brief-test-farm-1';

  beforeAll(async () => {
    initFirebase();
    // Seed farm document once
    await firestore().doc(`farms/${farmId}`).set({
      name: 'Alpha Wheat Farm',
      cropType: 'Wheat',
      areaAcres: 12,
      location: { lat: 30.7333, lng: 76.7794 },
      timezone: 'Asia/Kolkata',
    });
    // Seed health document to avoid computing across network on every test
    await firestore().doc(`farms/${farmId}/ai/health`).set({
      score: 85,
      color: 'green',
      reasons: [],
      source: 'rule_v1',
      evaluatedAt: new Date().toISOString(),
      metrics: {
        deviceCount: 1,
        onlineDeviceCount: 1,
        unacknowledgedAlertCount: 0,
      },
    });
  });

  afterAll(async () => {
    await firestore().doc(`farms/${farmId}`).delete().catch(() => {});
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    // Clean up brief doc
    await firestore().doc(`farms/${farmId}/ai/brief`).delete().catch(() => {});
  });

  it('1. returns null when Grok AI is disabled', async () => {
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(false);

    const result = await generateFarmBrief(farmId, true);
    expect(result).toBeNull();
  });

  it('2. generates brief on valid Grok response and caches it (happy path)', async () => {
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(true);
    vi.spyOn(grokClient, 'callGrok').mockResolvedValue(
      JSON.stringify({
        headline: 'Wheat is thriving with optimal moisture',
        body: 'Soil moisture is steady at 55%. Weather remains clear for the next 24 hours with no rainfall expected.',
        actionNow: 'No action needed today.',
        urgency: 'low',
      })
    );

    const result = await generateFarmBrief(farmId, true);

    expect(result).not.toBeNull();
    expect(result?.headline).toBe('Wheat is thriving with optimal moisture');
    expect(result?.actionNow).toBe('No action needed today.');
    expect(result?.urgency).toBe('low');
    expect(result?.cachedUntil).toBeDefined();

    // Check Firestore
    const cached = await getLatestBrief(farmId);
    expect(cached).not.toBeNull();
    expect(cached?.headline).toBe('Wheat is thriving with optimal moisture');
  });

  it('3. rejects / throws when Grok returns malformed json or missing required keys', async () => {
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(true);

    // Missing actionNow
    vi.spyOn(grokClient, 'callGrok').mockResolvedValue(
      JSON.stringify({
        headline: 'Soil dry',
        body: 'Moisture is low.',
      })
    );

    await expect(generateFarmBrief(farmId, true)).rejects.toThrow(
      /missing "actionNow"/
    );
  });

  it('4. generates brief successfully when weather data is null / missing', async () => {
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(true);
    vi.spyOn(grokClient, 'callGrok').mockResolvedValue(
      JSON.stringify({
        headline: 'Clear skies expected, monitor soil',
        body: 'Local forecast unavailable. Soil moisture is within target range.',
        actionNow: 'Check irrigation pump status.',
        urgency: 'medium',
      })
    );

    // Ensure no weather document exists
    await firestore().doc(`farms/${farmId}/weather/latest`).delete().catch(() => {});

    const result = await generateFarmBrief(farmId, true);

    expect(result).not.toBeNull();
    expect(result?.headline).toBe('Clear skies expected, monitor soil');
    expect(result?.urgency).toBe('medium');
  });

  it('5. generates brief successfully when farm has 0 devices registered', async () => {
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(true);
    vi.spyOn(grokClient, 'callGrok').mockResolvedValue(
      JSON.stringify({
        headline: 'Connect sensor nodes to monitor crops',
        body: 'No telemetry nodes detected for this farm.',
        actionNow: 'Add a new hardware device.',
        urgency: 'high',
      })
    );

    const result = await generateFarmBrief(farmId, true);

    expect(result).not.toBeNull();
    expect(result?.headline).toBe('Connect sensor nodes to monitor crops');
    expect(result?.urgency).toBe('high');
  });

  it('6. respects 4-hour cache guard when force=false', async () => {
    vi.spyOn(grokClient, 'isGrokEnabled').mockReturnValue(true);
    const callGrokSpy = vi.spyOn(grokClient, 'callGrok');

    // Pre-seed a recent brief
    const recentBrief = {
      headline: 'Cached brief headline',
      body: 'Cached brief body',
      actionNow: 'No action',
      urgency: 'low' as const,
      generatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30m ago
      model: 'grok-2-latest',
      cachedUntil: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
    };
    await firestore().doc(`farms/${farmId}/ai/brief`).set(recentBrief);

    const result = await generateFarmBrief(farmId, false);

    expect(result?.headline).toBe('Cached brief headline');
    expect(callGrokSpy).not.toHaveBeenCalled();
  });
});
