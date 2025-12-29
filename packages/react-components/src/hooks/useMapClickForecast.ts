/**
 * Hook for managing click-to-forecast functionality on maps
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchDWMLForecast } from '../utils/dwmlParser';
import type {
  DWMLForecastData,
  UseClickForecastOptions,
  UseClickForecastResult,
} from '../types/clickForecast';

/**
 * Hook for fetching forecast data on map click
 *
 * Note: This hook does NOT use caching per the requirements.
 * Fresh data is fetched on every click.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, fetchForecast } = useMapClickForecast({
 *   enabled: true,
 *   forecastHours: 48,
 *   onForecastFetched: (data) => console.log(data),
 * });
 * ```
 */
export function useMapClickForecast(
  options: UseClickForecastOptions
): UseClickForecastResult {
  const {
    enabled,
    forecastHours = 48,
    onForecastFetched,
    onError,
    onModeChange,
  } = options;

  const [data, setData] = useState<DWMLForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeCoords, setActiveCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Track mounted state
  const isMountedRef = useRef(true);

  // Track callbacks without causing re-renders
  const onForecastFetchedRef = useRef(onForecastFetched);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onForecastFetchedRef.current = onForecastFetched;
    onErrorRef.current = onError;
  }, [onForecastFetched, onError]);

  // Notify mode changes
  useEffect(() => {
    onModeChange?.(enabled);
  }, [enabled, onModeChange]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchForecast = useCallback(
    async (lat: number, lng: number) => {
      if (!isMountedRef.current) return;

      setIsLoading(true);
      setError(null);
      setActiveCoords({ lat, lng });

      try {
        const forecastData = await fetchDWMLForecast(lat, lng);

        if (!isMountedRef.current) return;

        // Trim to requested hours
        if (forecastData.hourly.length > forecastHours) {
          forecastData.hourly = forecastData.hourly.slice(0, forecastHours);
        }

        setData(forecastData);
        onForecastFetchedRef.current?.(forecastData);
      } catch (err) {
        if (!isMountedRef.current) return;

        const fetchError =
          err instanceof Error ? err : new Error('Failed to fetch forecast');
        setError(fetchError);
        onErrorRef.current?.(fetchError);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [forecastHours]
  );

  const clearForecast = useCallback(() => {
    setData(null);
    setError(null);
    setActiveCoords(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    activeCoords,
    fetchForecast,
    clearForecast,
  };
}
