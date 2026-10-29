import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../health-score.service.js';

describe('Health Score Engine (computeHealthScore)', () => {
  it('1. returns 100 and green when all conditions are optimal and all devices online', () => {
    const result = computeHealthScore({
      soilMoisture: 50,
      temperature: 25,
      humidity: 60,
      deviceCount: 2,
      onlineDeviceCount: 2,
      unacknowledgedAlertCount: 0,
    });

    expect(result.score).toBe(100);
    expect(result.color).toBe('green');
    expect(result.reasons).toEqual([]);
  });

  it('2. deducts 25 points for low soil moisture (<25%) and assigns yellow/red accordingly', () => {
    const result = computeHealthScore({
      soilMoisture: 20,
      temperature: 25,
      humidity: 60,
      deviceCount: 1,
      onlineDeviceCount: 1,
      unacknowledgedAlertCount: 0,
    });

    expect(result.score).toBe(75);
    expect(result.color).toBe('yellow');
    expect(result.reasons).toContain('Low soil moisture (<25%)');
  });

  it('3. applies proportional offline device penalty', () => {
    // 1 of 2 devices offline -> 15 * (1/2) = 7.5 penalty -> 100 - 7.5 = 92.5 -> rounds to 93
    const result = computeHealthScore({
      soilMoisture: 50,
      temperature: 25,
      humidity: 60,
      deviceCount: 2,
      onlineDeviceCount: 1,
      unacknowledgedAlertCount: 0,
    });

    expect(result.score).toBe(93);
    expect(result.color).toBe('green');
    expect(result.reasons).toContain('1 of 2 devices offline');

    // 2 of 2 devices offline -> -15 points -> 85
    const allOffline = computeHealthScore({
      soilMoisture: 50,
      temperature: 25,
      humidity: 60,
      deviceCount: 2,
      onlineDeviceCount: 0,
      unacknowledgedAlertCount: 0,
    });

    expect(allOffline.score).toBe(85);
    expect(allOffline.reasons).toContain('2 of 2 devices offline');
  });

  it('4. applies alert penalty capped at 20 points', () => {
    // 5 alerts * 5 = 25, capped at 20 -> 100 - 20 = 80
    const result = computeHealthScore({
      soilMoisture: 50,
      temperature: 25,
      humidity: 60,
      deviceCount: 1,
      onlineDeviceCount: 1,
      unacknowledgedAlertCount: 5,
    });

    expect(result.score).toBe(80);
    expect(result.color).toBe('green');
    expect(result.reasons).toContain('5 unacknowledged alerts');
  });

  it('5. handles missing telemetry neutrally with missing_* reason codes', () => {
    const result = computeHealthScore({
      soilMoisture: null,
      temperature: undefined,
      humidity: null,
      deviceCount: 0,
      onlineDeviceCount: 0,
      unacknowledgedAlertCount: 0,
    });

    expect(result.score).toBe(100);
    expect(result.color).toBe('green');
    expect(result.reasons).toContain('missing_soilMoisture');
    expect(result.reasons).toContain('missing_temperature');
    expect(result.reasons).toContain('missing_humidity');
    expect(result.reasons).toContain('no_devices');
  });
});

