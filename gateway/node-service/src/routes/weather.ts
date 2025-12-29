import { Router } from 'express';
import axios from 'axios';

export const weatherRouter = Router();

const WEATHER_API_BASE = 'https://api.weather.gov';
const USER_AGENT = 'AcreBlitz Gateway (https://acreblitz.com)';

// Cache for grid point data
const gridPointCache = new Map<
  string,
  { data: GridPointData; timestamp: number }
>();
const GRID_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface GridPointData {
  gridId: string;
  gridX: number;
  gridY: number;
  forecastHourly: string;
  observationStations: string;
  city: string;
  state: string;
}

interface WeatherData {
  location: {
    city: string;
    state: string;
    gridId: string;
    gridX: number;
    gridY: number;
  };
  currentConditions: {
    timestamp: string;
    temperature: number | null;
    temperatureUnit: string;
    description: string;
    icon: string;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    pressure: number | null;
  } | null;
  hourlyForecast: Array<{
    time: string;
    temperature: number;
    temperatureUnit: string;
    precipitationChance: number | null;
    relativeHumidity: number | null;
    windSpeed: string;
    windDirection: string;
    icon: string;
    shortForecast: string;
    isDaytime: boolean;
  }>;
  updated: string;
}

function celsiusToFahrenheit(celsius: number | null): number | null {
  if (celsius === null) return null;
  return Math.round((celsius * 9) / 5 + 32);
}

async function getGridPoint(lat: number, lon: number): Promise<GridPointData> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = gridPointCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < GRID_CACHE_TTL) {
    console.log('[Weather] Using cached grid point for:', cacheKey);
    return cached.data;
  }

  console.log('[Weather] Fetching grid point for:', cacheKey);

  const response = await axios.get(`${WEATHER_API_BASE}/points/${lat},${lon}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/geo+json',
    },
    timeout: 10000,
  });

  const props = response.data.properties;
  const data: GridPointData = {
    gridId: props.gridId,
    gridX: props.gridX,
    gridY: props.gridY,
    forecastHourly: props.forecastHourly,
    observationStations: props.observationStations,
    city: props.relativeLocation.properties.city,
    state: props.relativeLocation.properties.state,
  };

  gridPointCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

async function getHourlyForecast(url: string) {
  console.log('[Weather] Fetching hourly forecast');

  const response = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/geo+json',
    },
    timeout: 10000,
  });

  return response.data.properties.periods.map((period: any) => ({
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

async function getCurrentConditions(stationsUrl: string) {
  try {
    console.log('[Weather] Fetching observation stations');

    const stationsResponse = await axios.get(stationsUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/geo+json',
      },
      timeout: 10000,
    });

    const stations = stationsResponse.data.features;
    if (!stations || stations.length === 0) {
      console.warn('[Weather] No observation stations found');
      return null;
    }

    const stationId = stations[0].id;
    console.log('[Weather] Fetching latest observation from:', stationId);

    const obsResponse = await axios.get(`${stationId}/observations/latest`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/geo+json',
      },
      timeout: 10000,
    });

    const props = obsResponse.data.properties;
    const tempC = props.temperature?.value;
    const tempF = celsiusToFahrenheit(tempC);

    return {
      timestamp: props.timestamp,
      temperature: tempF,
      temperatureUnit: 'F',
      description: props.textDescription || 'N/A',
      icon: props.icon || '',
      humidity: props.relativeHumidity?.value ?? null,
      windSpeed: props.windSpeed?.value ?? null,
      windDirection: props.windDirection?.value ?? null,
      pressure: props.barometricPressure?.value ?? null,
    };
  } catch (error) {
    console.error('[Weather] Error fetching current conditions:', error);
    return null;
  }
}

weatherRouter.get('/forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // Validate parameters
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameters: lat and lon',
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'lat and lon must be valid numbers',
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'lat must be between -90 and 90',
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'lon must be between -180 and 180',
      });
    }

    console.log('[Weather] Getting weather for:', { latitude, longitude });

    // Get grid point information
    const gridPoint = await getGridPoint(latitude, longitude);

    // Fetch hourly forecast and current conditions in parallel
    const [hourlyForecast, currentConditions] = await Promise.all([
      getHourlyForecast(gridPoint.forecastHourly),
      getCurrentConditions(gridPoint.observationStations),
    ]);

    const weatherData: WeatherData = {
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

    res.json(weatherData);
  } catch (error) {
    console.error('[Weather] Error:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      return res.status(status).json({
        error: 'Weather API Error',
        message: error.message,
        details: error.response?.data,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
