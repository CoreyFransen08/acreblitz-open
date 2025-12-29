/**
 * Forecast Popup Content Component
 * Renders the 48-hour forecast data inside Leaflet popup
 */

import type { DWMLForecastData, DWMLHourlyData } from '../../../../types/clickForecast';
import {
  dwmlFahrenheitToCelsius,
  mphToKmh,
  degreesToCompassDirection,
  inchesToMm,
} from '../../../../utils/dwmlParser';

interface ForecastPopupContentProps {
  isLoading: boolean;
  data: DWMLForecastData | null;
  error: Error | null;
  units: 'imperial' | 'metric';
}

/**
 * Server-rendered popup content
 * Note: This is rendered to string, so no React hooks or interactivity
 */
export function ForecastPopupContent({
  isLoading,
  data,
  error,
  units,
}: ForecastPopupContentProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="forecast-popup-loading">
        <div className="forecast-popup-spinner" />
        <span>Loading forecast...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forecast-popup-error">
        <svg
          className="forecast-popup-error-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="forecast-popup-error-title">Failed to load forecast</span>
        <span className="forecast-popup-error-message">{error.message}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="forecast-popup-empty">
        <span>No forecast data available</span>
      </div>
    );
  }

  // Group hourly data by day
  const groupedByDay = groupHourlyByDay(data.hourly);
  const isMetric = units === 'metric';

  return (
    <div className="forecast-popup-content">
      {/* Header */}
      <div className="forecast-popup-header">
        <h3 className="forecast-popup-title">
          {data.location.city}
          {data.location.state ? `, ${data.location.state}` : ''}
        </h3>
        {data.location.areaDescription && (
          <span className="forecast-popup-subtitle">
            {data.location.areaDescription}
          </span>
        )}
        <span className="forecast-popup-coords">
          {data.location.latitude.toFixed(4)}, {data.location.longitude.toFixed(4)}
        </span>
      </div>

      {/* Summary - Current conditions */}
      <div className="forecast-popup-summary">
        <CurrentSummary hourly={data.hourly} units={units} />
      </div>

      {/* Hourly Table */}
      <div className="forecast-popup-hourly">
        {Object.entries(groupedByDay).map(([dateKey, hours]) => (
          <div key={dateKey} className="forecast-popup-day">
            <div className="forecast-popup-day-header">{dateKey}</div>
            <div className="forecast-popup-hours">
              {hours.map((hour, idx) => (
                <HourlyRow key={idx} hour={hour} isMetric={isMetric} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="forecast-popup-footer">
        <span>Data: NWS | Updated: {formatTime(data.creationTime)}</span>
      </div>
    </div>
  );
}

/**
 * Calculate 48-hour rain accumulation from hourly data
 */
function calculate48HourAccumulation(hourly: DWMLHourlyData[]): number | null {
  let total = 0;
  let hasData = false;

  for (const hour of hourly) {
    if (hour.precipitationAmount !== null && hour.precipitationAmount > 0) {
      total += hour.precipitationAmount;
      hasData = true;
    }
  }

  // Return null if no precipitation data available, otherwise return total (even if 0)
  return hasData || hourly.some(h => h.precipitationAmount !== null) ? total : null;
}

/**
 * Current conditions summary
 */
function CurrentSummary({
  hourly,
  units,
}: {
  hourly: DWMLHourlyData[];
  units: 'imperial' | 'metric';
}): JSX.Element | null {
  const current = hourly[0];
  if (!current) return null;

  const isMetric = units === 'metric';
  const temp = isMetric
    ? dwmlFahrenheitToCelsius(current.temperature)
    : current.temperature;
  const tempUnit = isMetric ? 'C' : 'F';
  const windSpeed = isMetric ? mphToKmh(current.windSpeed) : current.windSpeed;
  const windUnit = isMetric ? 'km/h' : 'mph';

  // Calculate 48-hour rain accumulation
  const accumulation = calculate48HourAccumulation(hourly);
  const accumulationDisplay = accumulation !== null
    ? isMetric
      ? `${inchesToMm(accumulation)?.toFixed(1) ?? '--'} mm`
      : `${accumulation.toFixed(2)}"`
    : '--';

  return (
    <div className="forecast-summary-grid">
      <div className="forecast-summary-item forecast-summary-temp">
        <span className="forecast-summary-value">
          {temp !== null ? `${temp}°${tempUnit}` : '--'}
        </span>
        <span className="forecast-summary-label">
          {current.weatherCondition || 'Now'}
        </span>
      </div>

      <div className="forecast-summary-item forecast-summary-accumulation">
        <span className="forecast-summary-value forecast-summary-rain">
          {accumulationDisplay}
        </span>
        <span className="forecast-summary-label">48hr Rain</span>
      </div>

      <div className="forecast-summary-item">
        <span className="forecast-summary-value">
          {current.precipitationChance !== null
            ? `${current.precipitationChance}%`
            : '--'}
        </span>
        <span className="forecast-summary-label">Precip</span>
      </div>

      <div className="forecast-summary-item">
        <span className="forecast-summary-value">
          {current.humidity !== null ? `${current.humidity}%` : '--'}
        </span>
        <span className="forecast-summary-label">Humidity</span>
      </div>

      <div className="forecast-summary-item">
        <span className="forecast-summary-value">
          {windSpeed !== null
            ? `${windSpeed} ${windUnit}`
            : '--'}
        </span>
        <span className="forecast-summary-label">
          {current.windDirection !== null
            ? degreesToCompassDirection(current.windDirection)
            : 'Wind'}
        </span>
      </div>
    </div>
  );
}

/**
 * Single hourly row
 */
function HourlyRow({
  hour,
  isMetric,
}: {
  hour: DWMLHourlyData;
  isMetric: boolean;
}): JSX.Element {
  const temp = isMetric
    ? dwmlFahrenheitToCelsius(hour.temperature)
    : hour.temperature;
  const windSpeed = isMetric ? mphToKmh(hour.windSpeed) : hour.windSpeed;

  const time = formatHourTime(hour.validTime);

  return (
    <div className="forecast-hourly-row">
      <span className="forecast-hourly-time">{time}</span>
      <span className="forecast-hourly-temp">
        {temp !== null ? `${temp}°` : '--'}
      </span>
      <span className="forecast-hourly-precip">
        {hour.precipitationChance !== null
          ? `${hour.precipitationChance}%`
          : '--'}
      </span>
      <span className="forecast-hourly-wind">
        {windSpeed !== null
          ? `${degreesToCompassDirection(hour.windDirection)} ${windSpeed}`
          : '--'}
      </span>
    </div>
  );
}

/**
 * Group hourly data by day
 */
function groupHourlyByDay(
  hourly: DWMLHourlyData[]
): Record<string, DWMLHourlyData[]> {
  const grouped: Record<string, DWMLHourlyData[]> = {};

  hourly.forEach((hour) => {
    const date = new Date(hour.validTime);
    const dateKey = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(hour);
  });

  return grouped;
}

/**
 * Format time for display
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format hour for hourly row
 */
function formatHourTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  });
}
