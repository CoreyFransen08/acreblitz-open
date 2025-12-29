/**
 * MSW request handlers for National Weather Service API
 */

import { http, HttpResponse } from 'msw';

// Mock data for NWS Points response
export const mockPointsResponse = {
  properties: {
    gridId: 'TOP',
    gridX: 32,
    gridY: 81,
    forecastHourly:
      'https://api.weather.gov/gridpoints/TOP/32,81/forecast/hourly',
    observationStations: 'https://api.weather.gov/gridpoints/TOP/32,81/stations',
    relativeLocation: {
      properties: {
        city: 'Lebanon',
        state: 'KS',
      },
    },
  },
};

// Mock data for hourly forecast response
export const mockHourlyForecastResponse = {
  properties: {
    periods: [
      {
        startTime: '2024-01-15T13:00:00-06:00',
        temperature: 45,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: { value: 10 },
        relativeHumidity: { value: 65 },
        windSpeed: '10 mph',
        windDirection: 'S',
        icon: 'https://api.weather.gov/icons/land/day/few',
        shortForecast: 'Partly Sunny',
        isDaytime: true,
      },
      {
        startTime: '2024-01-15T14:00:00-06:00',
        temperature: 47,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: { value: 15 },
        relativeHumidity: { value: 60 },
        windSpeed: '12 mph',
        windDirection: 'SW',
        icon: 'https://api.weather.gov/icons/land/day/sct',
        shortForecast: 'Mostly Sunny',
        isDaytime: true,
      },
    ],
  },
};

// Mock data for observation stations response
export const mockStationsResponse = {
  features: [
    {
      id: 'https://api.weather.gov/stations/KLBL',
      properties: {
        stationIdentifier: 'KLBL',
        name: 'Liberal, Liberal Mid-America Regional Airport',
      },
    },
  ],
};

// Mock data for latest observation response
export const mockObservationResponse = {
  properties: {
    timestamp: '2024-01-15T12:00:00Z',
    temperature: { value: 7.2, unitCode: 'wmoUnit:degC' },
    textDescription: 'Partly Cloudy',
    icon: 'https://api.weather.gov/icons/land/day/few',
    relativeHumidity: { value: 65 },
    windSpeed: { value: 5.2, unitCode: 'wmoUnit:m_s-1' },
    windDirection: { value: 180, unitCode: 'wmoUnit:degree_(angle)' },
    barometricPressure: { value: 101325, unitCode: 'wmoUnit:Pa' },
  },
};

// Default handlers
export const handlers = [
  // Points endpoint - handles any lat,lon
  http.get('https://api.weather.gov/points/:coords', ({ params }) => {
    const coords = params.coords as string;
    const [lat] = coords.split(',').map(Number);

    // Return 404 for invalid coordinates (outside US)
    if (lat < 24 || lat > 50) {
      return HttpResponse.json(
        { detail: 'Data Unavailable For Requested Point' },
        { status: 404 }
      );
    }

    return HttpResponse.json(mockPointsResponse);
  }),

  // Hourly forecast endpoint
  http.get(
    'https://api.weather.gov/gridpoints/:office/:grid/forecast/hourly',
    () => {
      return HttpResponse.json(mockHourlyForecastResponse);
    }
  ),

  // Stations endpoint
  http.get('https://api.weather.gov/gridpoints/:office/:grid/stations', () => {
    return HttpResponse.json(mockStationsResponse);
  }),

  // Latest observation endpoint
  http.get(
    'https://api.weather.gov/stations/:stationId/observations/latest',
    () => {
      return HttpResponse.json(mockObservationResponse);
    }
  ),
];

// Error handlers for testing error scenarios
export const errorHandlers = {
  serverError: http.get('https://api.weather.gov/points/:coords', () => {
    return HttpResponse.json(
      { detail: 'Internal Server Error' },
      { status: 503 }
    );
  }),

  networkError: http.get('https://api.weather.gov/points/:coords', () => {
    return HttpResponse.error();
  }),
};
