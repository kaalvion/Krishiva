import { firestore } from '../../plugins/firebase.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { callGrok, isGrokEnabled } from './grok.client.js';
import { computeFarmHealth, type FarmHealthDoc } from './health-score.service.js';
import { getLatestWeather, type FarmWeatherDoc } from '../weather/weather.service.js';

export interface FarmBriefDoc {
  headline: string;
  body: string;
  actionNow: string;
  urgency: 'low' | 'medium' | 'high';
  generatedAt: string;
  model: string;
  cachedUntil: string;
}

const BRIEF_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Strips code fences and parses JSON safely.
 */
export function parseBriefJson(text: string): {
  headline: string;
  body: string;
  actionNow: string;
  urgency: 'low' | 'medium' | 'high';
} {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed.headline || typeof parsed.headline !== 'string') {
    throw new Error('Brief response missing "headline" string');
  }
  if (!parsed.body || typeof parsed.body !== 'string') {
    throw new Error('Brief response missing "body" string');
  }
  if (!parsed.actionNow || typeof parsed.actionNow !== 'string') {
    throw new Error('Brief response missing "actionNow" string');
  }

  let urgency: 'low' | 'medium' | 'high' = 'low';
  if (parsed.urgency === 'medium' || parsed.urgency === 'high' || parsed.urgency === 'low') {
    urgency = parsed.urgency;
  }

  return {
    headline: parsed.headline.trim(),
    body: parsed.body.trim(),
    actionNow: parsed.actionNow.trim(),
    urgency,
  };
}

/**
 * Returns existing brief if present and fresh, or generates a new one with Grok.
 */
export async function generateFarmBrief(
  farmId: string,
  force = false
): Promise<FarmBriefDoc | null> {
  if (!farmId) {
    throw new Error('farmId is required');
  }

  const briefRef = firestore().doc(`farms/${farmId}/ai/brief`);

  // Check 4-hour cache guard
  if (!force) {
    const existingSnap = await briefRef.get();
    if (existingSnap.exists) {
      const existingData = existingSnap.data() as FarmBriefDoc;
      const genTime = new Date(existingData.generatedAt).getTime();
      if (!isNaN(genTime) && Date.now() - genTime < BRIEF_CACHE_TTL_MS) {
        logger.debug({ farmId }, 'Returning cached farm brief');
        return existingData;
      }
    }
  }

  if (!isGrokEnabled()) {
    logger.debug({ farmId }, 'Grok is disabled, skipping farm brief generation');
    return null;
  }

  // Gather context for the farm
  const farmSnap = await firestore().doc(`farms/${farmId}`).get();
  if (!farmSnap.exists) {
    throw new Error(`Farm ${farmId} does not exist`);
  }
  const farm = farmSnap.data() as any;

  // Health score
  let health: FarmHealthDoc | null = null;
  const healthSnap = await firestore().doc(`farms/${farmId}/ai/health`).get();
  if (healthSnap.exists) {
    health = healthSnap.data() as FarmHealthDoc;
  } else {
    health = await computeFarmHealth(farmId);
  }

  // Devices & latest telemetry
  const devicesSnap = await firestore().collection(`farms/${farmId}/devices`).get();
  const deviceCount = devicesSnap.size;
  let onlineDeviceCount = 0;
  let latestReading: any = null;

  for (const devDoc of devicesSnap.docs) {
    const dev = devDoc.data();
    if (dev.status === 'online') {
      onlineDeviceCount++;
    }

    const currentSnap = await devDoc.ref.collection('latest').doc('current').get();
    if (currentSnap.exists && !latestReading) {
      latestReading = currentSnap.data();
    }
  }

  // Weather
  const weather: FarmWeatherDoc | null = await getLatestWeather(farmId);
  const dailySummary = weather?.dailySummary ?? [];

  // Active unacknowledged alerts
  const alertsSnap = await firestore()
    .collection(`farms/${farmId}/alerts`)
    .where('acknowledged', '==', false)
    .limit(5)
    .get();
  const alerts = alertsSnap.docs.map((d) => d.data());

  const systemPrompt =
    'You are Krishiva AI, an expert agricultural advisor for Indian farmers. Output strictly valid JSON matching the requested schema. No markdown, no prose outside JSON.';

  const userPrompt = `Farm context:
- Name: ${farm.name || 'Unknown'}
- Crop: ${farm.cropType || 'unspecified'}
- Area: ${farm.areaAcres ? `${farm.areaAcres} acres` : 'unspecified'}
- Health score: ${health?.score ?? 100}/100 (${health?.color ?? 'green'})
- Health reasons: ${health?.reasons?.join(', ') || 'none'}
- Devices: ${deviceCount} total, ${onlineDeviceCount} online
- Latest telemetry: soilMoisture=${latestReading?.soilMoisture ?? 'unknown'}%, temp=${latestReading?.temperature ?? 'unknown'}°C, humidity=${latestReading?.humidity ?? 'unknown'}%
- Weather: rain next 6h: ${weather?.rainNext6hMm ?? 'unknown'}mm, rain next 24h: ${weather?.rainNext24hMm ?? 'unknown'}mm, max temp today: ${dailySummary?.[0]?.tempMax ?? 'unknown'}°C
- Active alerts: ${alerts.map((a: any) => a.type || a.message).join(', ') || 'none'}

Generate a concise morning/evening farm brief. Respond with ONLY a JSON object:
{
  "headline": "1 punchy sentence, max 12 words",
  "body": "2-3 short sentences on soil, weather impact, and crop status",
  "actionNow": "1 clear imperative action for the farmer today, or 'No action needed'",
  "urgency": "low" | "medium" | "high"
}`;

  logger.info({ farmId, force }, 'Calling Grok to generate farm brief');

  const rawResponse = await callGrok([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const parsed = parseBriefJson(rawResponse);
  const now = Date.now();

  const briefDoc: FarmBriefDoc = {
    headline: parsed.headline,
    body: parsed.body,
    actionNow: parsed.actionNow,
    urgency: parsed.urgency,
    generatedAt: new Date(now).toISOString(),
    model: env.GROK_MODEL,
    cachedUntil: new Date(now + BRIEF_CACHE_TTL_MS).toISOString(),
  };

  await briefRef.set(briefDoc);
  logger.info({ farmId, headline: briefDoc.headline }, 'Farm brief generated and saved');

  return briefDoc;
}

/**
 * Reads cached brief from Firestore.
 */
export async function getLatestBrief(farmId: string): Promise<FarmBriefDoc | null> {
  const doc = await firestore().doc(`farms/${farmId}/ai/brief`).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as FarmBriefDoc;
}

/**
 * Generates briefs for all farms that need one (or if force=true).
 * Used during scheduled runs (06:00 and 18:00 local time) and on startup catch-up.
 */
export async function generateBriefsForAllFarms(force = false): Promise<void> {
  if (!isGrokEnabled()) {
    return;
  }

  try {
    const farmsSnap = await firestore().collection('farms').get();
    for (const farmDoc of farmsSnap.docs) {
      try {
        await generateFarmBrief(farmDoc.id, force);
      } catch (err: any) {
        logger.warn({ farmId: farmDoc.id, err: err?.message }, 'Failed generating brief for farm in batch');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error in generateBriefsForAllFarms');
  }
}
