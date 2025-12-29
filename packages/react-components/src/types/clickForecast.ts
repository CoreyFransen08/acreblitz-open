/**
 * Click-to-Forecast Types
 * Data sourced from NWS MapClick.php DWML (Digital Weather Markup Language)
 */

// ============================================
// Location Types
// ============================================

export interface DWMLLocation {
  /** City name */
  city: string;
  /** State abbreviation */
  state: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Area description (e.g., "6 Miles NE of Springfield") */
  areaDescription?: string;
}

// ============================================
// Hourly Forecast Types (from DWML time-series)
// ============================================

export interface DWMLHourlyData {
  /** ISO timestamp for this hour */
  validTime: string;
  /** Temperature in Fahrenheit */
  temperature: number | null;
  /** Dew point in Fahrenheit */
  dewPoint: number | null;
  /** Apparent temperature (heat index/wind chill) in Fahrenheit */
  apparentTemperature: number | null;
  /** Probability of precipitation (0-100) */
  precipitationChance: number | null;
  /** Quantitative precipitation forecast in inches */
  precipitationAmount: number | null;
  /** Relative humidity (0-100) */
  humidity: number | null;
  /** Sustained wind speed in mph */
  windSpeed: number | null;
  /** Wind gust speed in mph */
  windGust: number | null;
  /** Wind direction in degrees (0-360) */
  windDirection: number | null;
  /** Cloud cover percentage (0-100) */
  cloudCover: number | null;
  /** Weather condition summary */
  weatherCondition: string | null;
}

// ============================================
// Parsed Forecast Response
// ============================================

export interface DWMLForecastData {
  /** Location information */
  location: DWMLLocation;
  /** Hourly forecast data (up to 168 hours, we use first 48) */
  hourly: DWMLHourlyData[];
  /** Timestamp when forecast was generated */
  creationTime: string;
  /** Source product info */
  productInfo?: {
    conciseName: string;
    operationalMode: string;
  };
}

// ============================================
// Hook Types
// ============================================

export interface UseClickForecastOptions {
  /** Enable/disable the forecast mode */
  enabled: boolean;
  /** Number of hours to display (default: 48, max: 168) */
  forecastHours?: number;
  /** Callback when forecast data is fetched */
  onForecastFetched?: (data: DWMLForecastData) => void;
  /** Callback when fetch error occurs */
  onError?: (error: Error) => void;
  /** Callback when mode is toggled */
  onModeChange?: (enabled: boolean) => void;
}

export interface UseClickForecastResult {
  /** Current forecast data */
  data: DWMLForecastData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Currently active click coordinates */
  activeCoords: { lat: number; lng: number } | null;
  /** Manually trigger forecast fetch */
  fetchForecast: (lat: number, lng: number) => Promise<void>;
  /** Clear current forecast */
  clearForecast: () => void;
}

// ============================================
// Component Props Types
// ============================================

export interface ClickForecastOptions {
  /** Enable click-to-forecast mode (default: false) */
  enabled?: boolean;
  /** Position of the toggle control */
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** Number of forecast hours to display (default: 48) */
  forecastHours?: number;
  /** Units: 'imperial' or 'metric' (default: 'imperial') */
  units?: 'imperial' | 'metric';
  /** Popup max width in pixels (default: 400) */
  popupMaxWidth?: number;
  /** Popup max height in pixels (default: 350) */
  popupMaxHeight?: number;
  /** Auto-pan map to show popup (default: true) */
  autoPan?: boolean;
}

export interface ClickForecastControlProps extends ClickForecastOptions {
  /** Callback when forecast is successfully fetched */
  onForecastFetched?: (data: DWMLForecastData) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Callback when mode is toggled */
  onModeChange?: (enabled: boolean) => void;
}

// ============================================
// Internal XML Parsing Types
// ============================================

export interface DWMLTimeLayout {
  layoutKey: string;
  timeCoordinates: string[];
}

export interface DWMLParameterSet {
  timeLayout: string;
  type: string;
  values: (number | string | null)[];
}
