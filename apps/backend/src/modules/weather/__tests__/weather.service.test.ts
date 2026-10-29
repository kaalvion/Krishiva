import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { fetchWeatherForFarm, getLatestWeather } from '../weather.service.js';
import { firestore, initFirebase } from '../../../plugins/firebase.js';

describe('Weather Service', () => {
  const farmId = 'weather-test-farm-1';
  const originalFetch = global.fetch;

  beforeAll(() => {
    initFirebase();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects immediately when location is missing or coordinates are invalid', async () => {
    await expect(fetchWeatherForFarm(farmId, null as any)).rejects.toThrow(
      /valid latitude and longitude/
    );

    await expect(
      fetchWeatherForFarm(farmId, { lat: 'invalid' as any, lng: 76.77 })
    ).rejects.toThrow(/valid latitude and longitude/);
  });

  it('fetches Open-Meteo forecast, computes summaries, and writes to Firestore (happy path)', async () => {
    const mockHourlyTimes = [
      '2026-10-29T00:00',
      '2026-10-29T01:00',
      '2026-10-29T02:00',
      '2026-10-29T03:00',
      '2026-10-29T04:00',
      '2026-10-29T05:00',
      '2026-10-29T06:00',
      '2026-10-29T07:00',
    ];

    const mockApiResponse = {
      hourly: {
        time: mockHourlyTimes,
        temperature_2m: [20, 21, 22, 23, 24, 25, 26, 27],
        relative_humidity_2m: [60, 62, 65, 70, 75, 72, 68, 65],
        precipitation: [0, 0, 1.2, 2.5, 0.5, 0, 0, 0],
        precipitation_probability: [0, 5, 40, 80, 20, 0, 0, 0],
        et0_fao_evapotranspiration: [0.1, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    const result = await fetchWeatherForFarm(
      farmId,
      { lat: 30.7333, lng: 76.7794 },
      'Asia/Kolkata'
    );

    expect(result).not.toBeNull();
    expect(result?.source).toBe('open-meteo');
    expect(result?.hourly.length).toBe(8);
    expect(result?.hourly[0].tempC).toBe(20);
    expect(result?.hourly[0].humidity).toBe(60);
    expect(result?.hourly[2].precipMm).toBe(1.2);
    expect(result?.dailySummary.length).toBe(1);
    expect(result?.dailySummary[0].tempMin).toBe(20);
    expect(result?.dailySummary[0].tempMax).toBe(27);
    expect(result?.dailySummary[0].maxPrecipProb).toBe(80);

    // Check that it was persisted to Firestore
    const cached = await getLatestWeather(farmId);
    expect(cached).not.toBeNull();
    expect(cached?.source).toBe('open-meteo');
    expect(cached?.timezone).toBe('Asia/Kolkata');
  });

  it('leaves existing cached weather untouched on API error and throws', async () => {
    // Write an existing document
    const existingDoc = {
      fetchedAt: '2026-10-28T12:00:00.000Z',
      timezone: 'Asia/Kolkata',
      source: 'open-meteo' as const,
      hourly: [],
      dailySummary: [],
      rainNext6hMm: 0,
      rainNext24hMm: 0,
    };
    await firestore().doc(`farms/${farmId}/weather/latest`).set(existingDoc);

    // Mock API error response
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as any);

    await expect(
      fetchWeatherForFarm(farmId, { lat: 30.7333, lng: 76.7794 }, 'Asia/Kolkata')
    ).rejects.toThrow(/Open-Meteo API returned status 503/);

    // Ensure existing cache remains untouched
    const cachedAfterFailure = await getLatestWeather(farmId);
    expect(cachedAfterFailure).not.toBeNull();
    expect(cachedAfterFailure?.fetchedAt).toBe('2026-10-28T12:00:00.000Z');
  });
});

