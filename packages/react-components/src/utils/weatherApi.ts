/**
 * Weather API utilities for fetching data from National Weather Service
 *
 * API Documentation: https://www.weather.gov/documentation/services-web-api
 */

import type {
  WeatherData,
  CurrentConditions,
  HourlyForecastPeriod,
  NWSPointResponse,
  NWSHourlyForecastResponse,
  NWSStationsResponse,
  NWSObservationResponse,
} from '../types/weather';

const WEATHER_API_BASE = 'https://api.weather.gov';
const USER_AGENT = 'AcreBlitz Weather Component (https://acreblitz.com)';

// Grid point cache to reduce API calls
interface GridPointCache {
  data: GridPointData;
  timestamp: number;
}

interface GridPointData {
  gridId: string;
  gridX: number;
  gridY: number;
  forecastHourly: string;
  observationStations: string;
  city: string;
  state: string;
}

const gridPointCache = new Map<string, GridPointCache>();
const GRID_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate cache key for coordinates
 */
function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/**
 * Fetch with retry logic for NWS API
 */
async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/geo+json',
        },
      });

      if (response.ok) return response;

      // Retry on 503 (service temporarily unavailable)
      if (response.status === 503 && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Get grid point information for coordinates
 * Results are cached for 24 hours
 */
async function getGridPoint(lat: number, lon: number): Promise<GridPointData> {
  const cacheKey = getCacheKey(lat, lon);
  const cached = gridPointCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < GRID_CACHE_TTL) {
    return cached.data;
  }

  const response = await fetchWithRetry(
    `${WEATHER_API_BASE}/points/${lat},${lon}`
  );
  const json: NWSPointResponse = await response.json();

  const data: GridPointData = {
    gridId: json.properties.gridId,
    gridX: json.properties.gridX,
    gridY: json.properties.gridY,
    forecastHourly: json.properties.forecastHourly,
    observationStations: json.properties.observationStations,
    city: json.properties.relativeLocation.properties.city,
    state: json.properties.relativeLocation.properties.state,
  };

  gridPointCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

/**
 * Get hourly forecast from NWS
 */
async function getHourlyForecast(
  url: string
): Promise<HourlyForecastPeriod[]> {
  const response = await fetchWithRetry(url);
  const json: NWSHourlyForecastResponse = await response.json();

  return json.properties.periods.map((period) => ({
    time: period.startTime,
    temperature: period.temperature,
    temperatureUnit: period.temperatureUnit,
    precipitationChance: period.probabilityOfPrecipitation?.value ?? null,
    relativeHumidity: period.relativeHumidity?.value ?? null,
    windSpeed: period.windSpeed,
    windDirection: period.windDirection,
    icon: period.icon,
    shortForecast: period.shortForecast,
    isDaytime: period.isDaytime,
  }));
}

/**
 * Get current conditions from nearest observation station
 */
async function getCurrentConditions(
  stationsUrl: string
): Promise<CurrentConditions | null> {
  try {
    const stationsResponse = await fetchWithRetry(stationsUrl);
    const stationsJson: NWSStationsResponse = await stationsResponse.json();

    if (!stationsJson.features?.length) return null;

    const stationId = stationsJson.features[0].id;
    const obsResponse = await fetchWithRetry(`${stationId}/observations/latest`);
    const obsJson: NWSObservationResponse = await obsResponse.json();
    const props = obsJson.properties;

    return {
      timestamp: props.timestamp,
      temperature: props.temperature?.value ?? null,
      temperatureUnit: 'C', // NWS returns Celsius
      description: props.textDescription || 'N/A',
      icon: props.icon || '',
      humidity: props.relativeHumidity?.value ?? null,
      windSpeed: props.windSpeed?.value ?? null,
      windDirection: props.windDirection?.value ?? null,
      pressure: props.barometricPressure?.value ?? null,
    };
  } catch {
    // Current conditions are optional - don't fail if unavailable
    return null;
  }
}

/**
 * Fetch complete weather data for a location
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  // Validate coordinates
  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180');
  }

  // Get grid point (cached)
  const gridPoint = await getGridPoint(latitude, longitude);

  // Fetch forecast and conditions in parallel
  const [hourlyForecast, currentConditions] = await Promise.all([
    getHourlyForecast(gridPoint.forecastHourly),
    getCurrentConditions(gridPoint.observationStations),
  ]);

  return {
    location: {
      city: gridPoint.city,
      state: gridPoint.state,
      gridId: gridPoint.gridId,
      gridX: gridPoint.gridX,
      gridY: gridPoint.gridY,
    },
    currentConditions,
    hourlyForecast,
    updated: new Date().toISOString(),
  };
}

/**
 * Clear the grid point cache (useful for testing)
 */
export function clearWeatherCache(): void {
  gridPointCache.clear();
}
