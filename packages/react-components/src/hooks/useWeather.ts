import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWeatherData } from '../utils/weatherApi';
import type {
  WeatherData,
  UseWeatherOptions,
  UseWeatherResult,
} from '../types/weather';

/**
 * Hook for fetching and managing weather data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useWeather({
 *   latitude: 39.7456,
 *   longitude: -97.0892,
 *   refreshInterval: 300000, // 5 minutes
 * });
 * ```
 */
export function useWeather(options: UseWeatherOptions): UseWeatherResult {
  const {
    latitude,
    longitude,
    refreshInterval = 0,
    onDataLoad,
    onError,
  } = options;

  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Memoize callbacks to avoid unnecessary re-renders
  const onDataLoadRef = useRef(onDataLoad);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onDataLoadRef.current = onDataLoad;
    onErrorRef.current = onError;
  }, [onDataLoad, onError]);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const weatherData = await fetchWeatherData(latitude, longitude);

      if (!isMountedRef.current) return;

      setData(weatherData);
      setLastUpdated(new Date());
      onDataLoadRef.current?.(weatherData);
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [latitude, longitude]);

  // Initial fetch and coordinate changes
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [refreshInterval, fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    lastUpdated,
  };
}
