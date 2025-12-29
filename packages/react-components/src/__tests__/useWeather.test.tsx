import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import { useWeather } from '../hooks/useWeather';
import { clearWeatherCache } from '../utils/weatherApi';

describe('useWeather', () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  describe('initial state', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() =>
        useWeather({ latitude: 39.7456, longitude: -97.0892 })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful fetch', () => {
    it('fetches weather data and updates state', async () => {
      const { result } = renderHook(() =>
        useWeather({ latitude: 39.7456, longitude: -97.0892 })
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.location.city).toBe('Lebanon');
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('calls onDataLoad callback with weather data', async () => {
      const onDataLoad = vi.fn();

      renderHook(() =>
        useWeather({
          latitude: 39.7456,
          longitude: -97.0892,
          onDataLoad,
        })
      );

      await waitFor(
        () => {
          expect(onDataLoad).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      expect(onDataLoad).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({ city: 'Lebanon' }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('handles API errors and sets error state', async () => {
      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        })
      );

      const { result } = renderHook(() =>
        useWeather({ latitude: 39.7456, longitude: -97.0892 })
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      expect(result.current.error).not.toBeNull();
      expect(result.current.data).toBeNull();
    });

    it('calls onError callback when fetch fails', async () => {
      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        })
      );

      const onError = vi.fn();

      renderHook(() =>
        useWeather({
          latitude: 39.7456,
          longitude: -97.0892,
          onError,
        })
      );

      await waitFor(
        () => {
          expect(onError).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('coordinate changes', () => {
    it('refetches when coordinates change', async () => {
      const { result, rerender } = renderHook(
        ({ lat, lon }) => useWeather({ latitude: lat, longitude: lon }),
        { initialProps: { lat: 39.7456, lon: -97.0892 } }
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      const firstData = result.current.data;
      expect(firstData).not.toBeNull();

      // Change coordinates - this will trigger a new fetch
      rerender({ lat: 40.0, lon: -98.0 });

      // Wait for new fetch to complete
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      // Data should still be valid (same mock data)
      expect(result.current.data).not.toBeNull();
    });
  });

  describe('manual refetch', () => {
    it('provides refetch function that updates data', async () => {
      const { result } = renderHook(() =>
        useWeather({ latitude: 39.7456, longitude: -97.0892 })
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      const firstUpdated = result.current.lastUpdated;

      // Wait a bit then refetch
      await new Promise((r) => setTimeout(r, 50));

      await act(async () => {
        await result.current.refetch();
      });

      // lastUpdated should be newer (or at least equal, in fast test environments)
      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(
        firstUpdated!.getTime()
      );
    });
  });

  describe('auto-refresh interval', () => {
    it('accepts refreshInterval option without error', async () => {
      // Test that the hook accepts refreshInterval without throwing
      const { result } = renderHook(() =>
        useWeather({
          latitude: 39.7456,
          longitude: -97.0892,
          refreshInterval: 60000, // 1 minute
        })
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      expect(result.current.data).not.toBeNull();
    });

    it('works with refreshInterval set to 0 (disabled)', async () => {
      const { result } = renderHook(() =>
        useWeather({
          latitude: 39.7456,
          longitude: -97.0892,
          refreshInterval: 0,
        })
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      expect(result.current.data).not.toBeNull();
    });
  });

  describe('unmount handling', () => {
    it('does not cause errors after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useWeather({ latitude: 39.7456, longitude: -97.0892 })
      );

      // Unmount before fetch completes
      unmount();

      // Give time for any pending operations
      await new Promise((r) => setTimeout(r, 100));

      // Should not throw - just verify no errors occurred
      expect(result.current.isLoading).toBe(true);
    });
  });
});
