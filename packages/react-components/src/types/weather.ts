/**
 * Weather Types for @acreblitz/react-components
 *
 * Data sourced from National Weather Service API (api.weather.gov)
 */

// Location information
export interface WeatherLocation {
  city: string;
  state: string;
  gridId: string;
  gridX: number;
  gridY: number;
}

// Current weather conditions
export interface CurrentConditions {
  timestamp: string;
  temperature: number | null;
  temperatureUnit: string;
  description: string;
  icon: string;
  humidity: number | null;
  windSpeed: number | null; // m/s from API
  windDirection: number | null; // degrees from API
  pressure: number | null; // Pa from API
}

// Hourly forecast period
export interface HourlyForecastPeriod {
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
}

// Combined weather data
export interface WeatherData {
  location: WeatherLocation;
  currentConditions: CurrentConditions | null;
  hourlyForecast: HourlyForecastPeriod[];
  updated: string;
}

// Weather component props
export interface WeatherProps {
  /** Latitude of the location (-90 to 90) */
  latitude: number;

  /** Longitude of the location (-180 to 180) */
  longitude: number;

  /** Optional class name for the root container */
  className?: string;

  /** Refresh interval in milliseconds (default: 0 = no auto-refresh) */
  refreshInterval?: number;

  /** Whether to show the refresh button (default: true) */
  showRefreshButton?: boolean;

  /** Callback when weather data is successfully fetched */
  onDataLoad?: (data: WeatherData) => void;

  /** Callback when an error occurs */
  onError?: (error: Error) => void;

  /** Custom loading component */
  loadingComponent?: React.ReactNode;

  /** Custom error component */
  errorComponent?: React.ReactNode;

  /** Number of forecast days to show (default: 7, max: 7) */
  forecastDays?: number;

  /** Unit preference: 'imperial' or 'metric' (default: 'imperial') */
  units?: 'imperial' | 'metric';

  /** Compact mode - shows only current conditions */
  compact?: boolean;
}

// Hook options
export interface UseWeatherOptions {
  latitude: number;
  longitude: number;
  refreshInterval?: number;
  onDataLoad?: (data: WeatherData) => void;
  onError?: (error: Error) => void;
}

// Hook return type
export interface UseWeatherResult {
  data: WeatherData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// Internal NWS API types (not exported)
export interface NWSPointResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    observationStations: string;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

export interface NWSHourlyForecastResponse {
  properties: {
    periods: Array<{
      startTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: string;
      probabilityOfPrecipitation: { value: number | null };
      relativeHumidity: { value: number | null };
      windSpeed: string;
      windDirection: string;
      icon: string;
      shortForecast: string;
    }>;
  };
}

export interface NWSStationsResponse {
  features: Array<{
    id: string;
    properties: {
      stationIdentifier: string;
      name: string;
    };
  }>;
}

export interface NWSObservationResponse {
  properties: {
    timestamp: string;
    textDescription: string;
    icon: string;
    temperature: { value: number | null };
    relativeHumidity: { value: number | null };
    windSpeed: { value: number | null };
    windDirection: { value: number | null };
    barometricPressure: { value: number | null };
  };
}
