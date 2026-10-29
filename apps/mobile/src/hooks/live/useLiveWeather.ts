import { useState, useEffect } from 'react';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { loadSnapshot, saveSnapshot } from '../../services/snapshotCache';
import { useIsScreenFocused } from '../useIsScreenFocused';

export interface WeatherHourly {
  time: string;
  tempC: number;
  humidity: number;
  precipMm: number;
  precipProb: number;
  et0Mm?: number;
}

export interface WeatherDailySummary {
  date: string;
  tempMin: number;
  tempMax: number;
  precipSumMm: number;
  maxPrecipProb: number;
}

export interface FarmWeather {
  fetchedAt: string;
  timezone: string;
  source: string;
  hourly: WeatherHourly[];
  dailySummary: WeatherDailySummary[];
  rainNext6hMm: number;
  rainNext24hMm: number;
}

export interface UseLiveWeatherResult {
  weather: FarmWeather | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
}

export function useLiveWeather(farmId?: string): UseLiveWeatherResult {
  const isFocused = useIsScreenFocused();
  const [weather, setWeather] = useState<FarmWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const uid = auth.currentUser?.uid;

  // 1. Load initial cached snapshot
  useEffect(() => {
    if (!uid || !farmId) {
      setWeather(null);
      setLoading(false);
      return;
    }

    loadSnapshot<FarmWeather>(uid, 'weather', farmId).then((cached) => {
      if (cached && cached.data) {
        setWeather((prev) => prev ?? cached.data);
        setFromCache(true);
        setLastSyncedAt(cached.savedAt);
        setLoading(false);
      }
    });
  }, [uid, farmId]);

  // 2. Real-time Firestore onSnapshot listener
  useEffect(() => {
    if (!uid || !farmId || !isFocused) {
      return;
    }

    let unsubscribe: Unsubscribe | null = null;

    try {
      const weatherDocRef = doc(db, 'farms', farmId, 'weather', 'latest');

      unsubscribe = onSnapshot(
        weatherDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as FarmWeather;
            setWeather(data);
            setFromCache(false);
            setLastSyncedAt(new Date().toISOString());
            setError(null);
            saveSnapshot(uid, 'weather', data, farmId).catch(() => {});
          } else {
            setWeather(null);
          }
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
    } catch (err: any) {
      setError(err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [uid, farmId, isFocused]);

  return {
    weather,
    loading,
    error,
    fromCache,
    lastSyncedAt,
  };
}

export default useLiveWeather;
