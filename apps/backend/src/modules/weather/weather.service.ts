import { firestore } from '../../plugins/firebase.js';
import { logger } from '../../utils/logger.js';

export interface HourlyForecast {
  time: string;
  tempC: number;
  humidity: number;
  precipMm: number;
  precipProb: number;
  et0Mm?: number;
}

export interface DailySummary {
  date: string;
  tempMin: number;
  tempMax: number;
  precipSumMm: number;
  maxPrecipProb: number;
  et0Mm?: number;
  rainMm?: number;
}

export interface FarmWeatherDoc {
  fetchedAt: string;
  timezone: string;
  source: 'open-meteo';
  hourly: HourlyForecast[];
  dailySummary: DailySummary[];
  rainNext6hMm: number;
  rainNext24hMm: number;
}

export interface OpenMeteoHourlyResponse {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    precipitation_probability: number[];
    et0_fao_evapotranspiration?: (number | null)[];
  };
}

/**
 * Fetches 3-day hourly weather forecast from Open-Meteo and persists to
 * farms/{farmId}/weather/latest.
 */
export async function fetchWeatherForFarm(
  farmId: string,
  location?: { lat: number; lng: number } | null,
  timezone = 'Asia/Kolkata'
): Promise<FarmWeatherDoc | null> {
  if (!farmId) {
    throw new Error('farmId is required');
  }

  if (
    !location ||
    typeof location.lat !== 'number' ||
    typeof location.lng !== 'number' ||
    isNaN(location.lat) ||
    isNaN(location.lng)
  ) {
    throw new Error(`Farm ${farmId} does not have valid latitude and longitude coordinates`);
  }

  const tz = timezone && timezone.trim() ? timezone.trim() : 'Asia/Kolkata';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,et0_fao_evapotranspiration&forecast_days=3&timezone=${encodeURIComponent(tz)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err: any) {
    clearTimeout(timeoutId);
    logger.warn({ farmId, err: err?.message }, 'Open-Meteo fetch failed, keeping existing cached weather');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    logger.warn({ farmId, status: response.status, errorText }, 'Open-Meteo returned error status, keeping existing cached weather');
    throw new Error(`Open-Meteo API returned status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as OpenMeteoHourlyResponse;
  if (!data.hourly || !Array.isArray(data.hourly.time)) {
    throw new Error('Invalid response structure from Open-Meteo: missing hourly data');
  }

  const {
    time = [],
    temperature_2m = [],
    relative_humidity_2m = [],
    precipitation = [],
    precipitation_probability = [],
    et0_fao_evapotranspiration = [],
  } = data.hourly;

  const hourly: HourlyForecast[] = [];
  for (let i = 0; i < time.length; i++) {
    hourly.push({
      time: time[i],
      tempC: Number(temperature_2m[i] ?? 0),
      humidity: Number(relative_humidity_2m[i] ?? 0),
      precipMm: Number(precipitation[i] ?? 0),
      precipProb: Number(precipitation_probability[i] ?? 0),
      ...(et0_fao_evapotranspiration[i] != null
        ? { et0Mm: Number(et0_fao_evapotranspiration[i]) }
        : {}),
    });
  }

  // Calculate rain next 6h and 24h
  // We match timestamps against current time or take first 6/24 entries from now
  const nowMs = Date.now();
  // Buffer by 1 hour in case timestamps are in local timezone string without offset
  const futureHourly = hourly.filter((h) => {
    const t = new Date(h.time).getTime();
    return isNaN(t) || t >= nowMs - 60 * 60 * 1000;
  });

  const next6 = (futureHourly.length >= 6 ? futureHourly.slice(0, 6) : hourly.slice(0, 6));
  const next24 = (futureHourly.length >= 24 ? futureHourly.slice(0, 24) : hourly.slice(0, 24));

  const rainNext6hMm = Math.round(next6.reduce((sum, h) => sum + (h.precipMm || 0), 0) * 100) / 100;
  const rainNext24hMm = Math.round(next24.reduce((sum, h) => sum + (h.precipMm || 0), 0) * 100) / 100;

  // Compute daily summaries grouped by YYYY-MM-DD
  const dailyGroups = new Map<string, HourlyForecast[]>();
  for (const h of hourly) {
    const dateStr = h.time.split('T')[0];
    if (!dailyGroups.has(dateStr)) {
      dailyGroups.set(dateStr, []);
    }
    dailyGroups.get(dateStr)!.push(h);
  }

  const dailySummary: DailySummary[] = [];
  for (const [date, items] of dailyGroups.entries()) {
    const temps = items.map((item) => item.tempC);
    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);
    const precipSumMm = Math.round(items.reduce((s, it) => s + (it.precipMm || 0), 0) * 100) / 100;
    const maxPrecipProb = Math.max(...items.map((it) => it.precipProb || 0));
    const et0Sum = Math.round(items.reduce((s, it) => s + (it.et0Mm || 0), 0) * 100) / 100;

    dailySummary.push({
      date,
      tempMin: isFinite(tempMin) ? tempMin : 0,
      tempMax: isFinite(tempMax) ? tempMax : 0,
      precipSumMm,
      maxPrecipProb: isFinite(maxPrecipProb) ? maxPrecipProb : 0,
      et0Mm: et0Sum,
      rainMm: precipSumMm,
    });
  }

  const weatherDoc: FarmWeatherDoc = {
    fetchedAt: new Date().toISOString(),
    timezone: tz,
    source: 'open-meteo',
    hourly,
    dailySummary,
    rainNext6hMm,
    rainNext24hMm,
  };

  // Write to farms/{farmId}/weather/latest
  await firestore().doc(`farms/${farmId}/weather/latest`).set(weatherDoc);

  logger.info(
    { farmId, rainNext6hMm, rainNext24hMm, pointsCount: hourly.length },
    'Successfully fetched and updated farm weather'
  );

  return weatherDoc;
}

/**
 * Reads cached weather document for a farm.
 */
export async function getLatestWeather(farmId: string): Promise<FarmWeatherDoc | null> {
  const doc = await firestore().doc(`farms/${farmId}/weather/latest`).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data() as FarmWeatherDoc;
}

/**
 * Periodically called by scheduler: fetches weather for all farms that have
 * at least 1 device with status == "online".
 */
export async function fetchWeatherForAllActiveFarms(): Promise<void> {
  try {
    const farmsSnap = await firestore().collection('farms').get();
    if (farmsSnap.empty) {
      return;
    }

    for (const farmDoc of farmsSnap.docs) {
      const devicesSnap = await farmDoc.ref.collection('devices').get();
      const hasOnlineDevice = devicesSnap.docs.some((d) => d.data()?.status === 'online');

      if (!hasOnlineDevice) {
        continue;
      }

      const farmId = farmDoc.id;
      const farmData = farmDoc.data();
      const location = farmData?.location as { lat: number; lng: number } | undefined;
      const timezone = (farmData?.timezone as string) || 'Asia/Kolkata';

      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        logger.debug({ farmId }, 'Skipping weather fetch: farm lacks coordinates');
        continue;
      }

      try {
        await fetchWeatherForFarm(farmId, location, timezone);
      } catch (err: any) {
        logger.warn({ farmId, err: err?.message }, 'Failed to refresh active farm weather in cron');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error during fetchWeatherForAllActiveFarms execution');
  }
}

