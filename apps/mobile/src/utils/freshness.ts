export type EffectiveDeviceStatus = 'online' | 'offline' | 'never_reported';

export interface FreshnessInfo {
  isLive: boolean;
  isNeverReported: boolean;
  label: string;
  badgeText: string;
  variant: 'success' | 'warning' | 'neutral';
  ageMs: number | null;
}

/**
 * Safely converts any timestamp representation (Firestore Timestamp, ISO 8601 string,
 * epoch milliseconds, Date object) to epoch milliseconds.
 * Returns 0 if value is missing, invalid, or null.
 */
export function toMillis(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  // Firestore Timestamp with toMillis()
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  // Firestore Timestamp-like { seconds, nanoseconds }
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof (value as { seconds: unknown }).seconds === 'number') {
    const s = (value as { seconds: number }).seconds;
    const ns = 'nanoseconds' in value && typeof (value as { nanoseconds: unknown }).nanoseconds === 'number'
      ? (value as { nanoseconds: number }).nanoseconds
      : 0;
    return s * 1000 + Math.floor(ns / 1e6);
  }
  // Firestore Timestamp with toDate()
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  // Standard JS Date
  if (value instanceof Date) {
    return value.getTime();
  }
  // Epoch numbers
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  // ISO strings or datetime strings
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Computes device online/offline/never_reported status on the client.
 * Never trusts stale stored backend status fields.
 * Online if last seen within 15 minutes (900,000 ms), otherwise offline.
 */
export function computeEffectiveStatus(
  lastSeenAt?: unknown,
  recordedAt?: unknown,
  nowMs: number = Date.now()
): EffectiveDeviceStatus {
  const lastSeenMs = toMillis(lastSeenAt);
  const recMs = toMillis(recordedAt);
  const mostRecentMs = Math.max(lastSeenMs, recMs);

  if (mostRecentMs <= 0) {
    return 'never_reported';
  }

  const diffMs = nowMs - mostRecentMs;
  if (diffMs <= 15 * 60 * 1000) {
    return 'online';
  }
  return 'offline';
}

/**
 * Evaluates telemetry reading freshness:
 * - Within 10 minutes: Live (success)
 * - Older than 10 minutes: Stale (warning) with relative time
 * - No reading: Never reported (neutral)
 */
export function getReadingFreshness(
  recordedAt?: unknown,
  nowMs: number = Date.now()
): FreshnessInfo {
  const recMs = toMillis(recordedAt);

  if (recMs <= 0) {
    return {
      isLive: false,
      isNeverReported: true,
      label: 'No readings yet',
      badgeText: 'No Data',
      variant: 'neutral',
      ageMs: null,
    };
  }

  const ageMs = Math.max(0, nowMs - recMs);

  if (ageMs <= 10 * 60 * 1000) {
    return {
      isLive: true,
      isNeverReported: false,
      label: 'Live',
      badgeText: 'Live',
      variant: 'success',
      ageMs,
    };
  }

  const rel = formatRelativeTime(ageMs);
  return {
    isLive: false,
    isNeverReported: false,
    label: `Last updated ${rel}`,
    badgeText: rel,
    variant: 'warning',
    ageMs,
  };
}

/**
 * Formats elapsed duration into concise human-readable relative strings.
 */
export function formatRelativeTime(diffMs: number): string {
  if (diffMs < 45000) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Produces a staleness note for sensor summary averages if any contributing reading
 * is older than 10 minutes (e.g. "Based on readings up to 3 h old").
 */
export function getAveragesStalenessNote(
  readings: Array<{ recordedAt?: unknown }>,
  nowMs: number = Date.now()
): string | null {
  if (!readings || readings.length === 0) return null;

  let maxAgeMs = 0;
  let hasStale = false;

  for (const r of readings) {
    const ms = toMillis(r.recordedAt);
    if (ms > 0) {
      const age = nowMs - ms;
      if (age > maxAgeMs) maxAgeMs = age;
      if (age > 10 * 60 * 1000) hasStale = true;
    }
  }

  if (!hasStale || maxAgeMs <= 0) return null;

  const hours = Math.round(maxAgeMs / (60 * 60 * 1000));
  if (hours >= 1) {
    return `Based on readings up to ${hours} h old`;
  }
  const mins = Math.round(maxAgeMs / 60000);
  return `Based on readings up to ${mins} m old`;
}

/**
 * Formats a timestamp into the farm's configured IANA timezone (default: 'Asia/Kolkata').
 */
export function formatInTimezone(
  dateOrValue: unknown,
  timezone: string = 'Asia/Kolkata',
  options?: Intl.DateTimeFormatOptions
): string {
  const ms = toMillis(dateOrValue);
  if (ms <= 0) return 'Never';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  try {
    return new Intl.DateTimeFormat('en-IN', defaultOptions).format(new Date(ms));
  } catch {
    // Fallback if timezone string is unrecognized by the device runtime
    try {
      return new Intl.DateTimeFormat('en-IN', {
        ...defaultOptions,
        timeZone: 'Asia/Kolkata',
      }).format(new Date(ms));
    } catch {
      return new Date(ms).toLocaleString();
    }
  }
}

