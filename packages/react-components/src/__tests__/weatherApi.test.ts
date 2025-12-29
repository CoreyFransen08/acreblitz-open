import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import { fetchWeatherData, clearWeatherCache } from '../utils/weatherApi';
import { mockPointsResponse } from '../__mocks__/handlers';

describe('weatherApi', () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  describe('fetchWeatherData', () => {
    it('fetches complete weather data successfully', async () => {
      const data = await fetchWeatherData(39.7456, -97.0892);

      expect(data).toBeDefined();
      expect(data.location).toEqual({
        city: 'Lebanon',
        state: 'KS',
        gridId: 'TOP',
        gridX: 32,
        gridY: 81,
      });
      expect(data.hourlyForecast).toHaveLength(2);
      expect(data.currentConditions).toBeDefined();
      expect(data.updated).toBeDefined();
    });

    it('returns location data correctly', async () => {
      const data = await fetchWeatherData(39.7456, -97.0892);

      expect(data.location.city).toBe('Lebanon');
      expect(data.location.state).toBe('KS');
      expect(data.location.gridId).toBe('TOP');
    });

    it('returns hourly forecast with correct structure', async () => {
      const data = await fetchWeatherData(39.7456, -97.0892);
      const firstPeriod = data.hourlyForecast[0];

      expect(firstPeriod.time).toBeDefined();
      expect(firstPeriod.temperature).toBe(45);
      expect(firstPeriod.temperatureUnit).toBe('F');
      expect(firstPeriod.precipitationChance).toBe(10);
      expect(firstPeriod.relativeHumidity).toBe(65);
      expect(firstPeriod.windSpeed).toBe('10 mph');
      expect(firstPeriod.windDirection).toBe('S');
      expect(firstPeriod.isDaytime).toBe(true);
    });

    it('returns current conditions with correct structure', async () => {
      const data = await fetchWeatherData(39.7456, -97.0892);
      const conditions = data.currentConditions;

      expect(conditions).not.toBeNull();
      expect(conditions?.temperature).toBeCloseTo(7.2, 1);
      expect(conditions?.temperatureUnit).toBe('C');
      expect(conditions?.description).toBe('Partly Cloudy');
      expect(conditions?.humidity).toBe(65);
      expect(conditions?.windSpeed).toBeCloseTo(5.2, 1);
      expect(conditions?.windDirection).toBe(180);
      expect(conditions?.pressure).toBe(101325);
    });
  });

  describe('coordinate validation', () => {
    it('throws error for latitude below -90', async () => {
      await expect(fetchWeatherData(-91, 0)).rejects.toThrow(
        'Invalid latitude: must be between -90 and 90'
      );
    });

    it('throws error for latitude above 90', async () => {
      await expect(fetchWeatherData(91, 0)).rejects.toThrow(
        'Invalid latitude: must be between -90 and 90'
      );
    });

    it('throws error for longitude below -180', async () => {
      await expect(fetchWeatherData(0, -181)).rejects.toThrow(
        'Invalid longitude: must be between -180 and 180'
      );
    });

    it('throws error for longitude above 180', async () => {
      await expect(fetchWeatherData(0, 181)).rejects.toThrow(
        'Invalid longitude: must be between -180 and 180'
      );
    });

    it('accepts valid edge case coordinates', async () => {
      // Update mock for valid edge cases
      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          return HttpResponse.json(mockPointsResponse);
        })
      );

      // Should not throw for boundary values
      await expect(fetchWeatherData(40, -180)).resolves.toBeDefined();
      await expect(fetchWeatherData(40, 180)).resolves.toBeDefined();
    });
  });

  describe('caching', () => {
    it('uses cached grid point data on subsequent calls', async () => {
      let callCount = 0;

      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          callCount++;
          return HttpResponse.json(mockPointsResponse);
        })
      );

      // First call - should hit the API
      await fetchWeatherData(39.7456, -97.0892);
      expect(callCount).toBe(1);

      // Second call with same coordinates - should use cache
      await fetchWeatherData(39.7456, -97.0892);
      expect(callCount).toBe(1); // Still 1, cache was used
    });

    it('makes new request for different coordinates', async () => {
      let callCount = 0;

      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          callCount++;
          return HttpResponse.json(mockPointsResponse);
        })
      );

      await fetchWeatherData(39.7456, -97.0892);
      await fetchWeatherData(40.0, -98.0);

      expect(callCount).toBe(2);
    });

    it('clearWeatherCache clears the cache', async () => {
      let callCount = 0;

      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          callCount++;
          return HttpResponse.json(mockPointsResponse);
        })
      );

      await fetchWeatherData(39.7456, -97.0892);
      expect(callCount).toBe(1);

      clearWeatherCache();

      await fetchWeatherData(39.7456, -97.0892);
      expect(callCount).toBe(2); // New call after cache clear
    });
  });

  describe('error handling', () => {
    it('handles 404 for invalid location', async () => {
      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          return HttpResponse.json(
            { detail: 'Data Unavailable For Requested Point' },
            { status: 404 }
          );
        })
      );

      await expect(fetchWeatherData(39.7456, -97.0892)).rejects.toThrow(
        'HTTP 404'
      );
    });

    it('handles network errors', async () => {
      server.use(
        http.get('https://api.weather.gov/points/:coords', () => {
          return HttpResponse.error();
        })
      );

      await expect(fetchWeatherData(39.7456, -97.0892)).rejects.toThrow();
    });

    it('continues without current conditions if observation fails', async () => {
      server.use(
        http.get(
          'https://api.weather.gov/stations/:stationId/observations/latest',
          () => {
            return HttpResponse.json(
              { detail: 'Station not found' },
              { status: 404 }
            );
          }
        )
      );

      const data = await fetchWeatherData(39.7456, -97.0892);

      // Should still return data, just without current conditions
      expect(data).toBeDefined();
      expect(data.location).toBeDefined();
      expect(data.hourlyForecast).toBeDefined();
      expect(data.currentConditions).toBeNull();
    });
  });
});
