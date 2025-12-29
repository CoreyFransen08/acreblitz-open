import { useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import type { WeatherData } from '../../types/weather';
import {
  celsiusToFahrenheit,
  degreesToCompass,
  mpsToMph,
  formatPressure,
} from '../../utils/conversions';
import './Weather.css';

// SVG Icons as inline components to avoid external dependencies
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const DropletIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  </svg>
);

const WindIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
  </svg>
);

const GaugeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
);

const CloudRainIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M16 14v6" />
    <path d="M8 14v6" />
    <path d="M12 16v6" />
  </svg>
);

interface WeatherDisplayProps {
  data: WeatherData;
  units: 'imperial' | 'metric';
  compact?: boolean;
  showRefreshButton?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  forecastDays?: number;
}

export function WeatherDisplay({
  data,
  units,
  compact = false,
  showRefreshButton = true,
  isRefreshing = false,
  onRefresh,
  forecastDays = 7,
}: WeatherDisplayProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { location, currentConditions, hourlyForecast } = data;

  // Enable horizontal scroll with mouse wheel
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Convert temperature based on units preference
  const getDisplayTemp = (temp: number | null, sourceUnit: string): string => {
    if (temp === null) return 'N/A';

    if (units === 'imperial') {
      // If source is Celsius, convert to Fahrenheit
      if (sourceUnit === 'C') {
        const converted = celsiusToFahrenheit(temp);
        return converted !== null ? `${converted}°F` : 'N/A';
      }
      return `${temp}°F`;
    } else {
      // If source is Fahrenheit, convert to Celsius
      if (sourceUnit === 'F') {
        const celsius = Math.round(((temp - 32) * 5) / 9);
        return `${celsius}°C`;
      }
      return `${temp}°C`;
    }
  };

  // Get wind display based on units
  const getWindDisplay = (
    speed: number | null,
    direction: number | null
  ): string => {
    if (speed === null) return 'N/A';
    const compassDir = degreesToCompass(direction);
    if (units === 'imperial') {
      const mph = mpsToMph(speed);
      return mph !== null ? `${mph} mph ${compassDir}` : 'N/A';
    }
    return `${Math.round(speed)} m/s ${compassDir}`;
  };

  // Filter forecast to requested days
  const filteredForecast = hourlyForecast.slice(0, forecastDays * 24);

  // Group hours by day
  const dayGroups: { [key: string]: typeof hourlyForecast } = {};
  filteredForecast.forEach((hour) => {
    const dayKey = format(parseISO(hour.time), 'yyyy-MM-dd');
    if (!dayGroups[dayKey]) {
      dayGroups[dayKey] = [];
    }
    dayGroups[dayKey].push(hour);
  });

  return (
    <div className="acb-weather">
      {/* Header with location and refresh */}
      <div className="acb-weather-header">
        <div className="acb-weather-location">
          <h3 className="acb-weather-location-title">
            {location.city}, {location.state}
          </h3>
          {currentConditions && (
            <p className="acb-weather-last-updated">
              Last updated:{' '}
              {format(parseISO(currentConditions.timestamp), 'MMM d, h:mm a')}
            </p>
          )}
        </div>
        {showRefreshButton && onRefresh && (
          <button
            className="acb-weather-refresh-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh weather data"
          >
            <RefreshIcon
              className={`acb-weather-refresh-icon ${isRefreshing ? 'acb-weather-spinning' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Current Conditions */}
      {currentConditions && (
        <div className="acb-weather-current">
          <h4 className="acb-weather-section-title">Current Conditions</h4>
          <div className="acb-weather-conditions-grid">
            {/* Temperature */}
            <div className="acb-weather-temp-section">
              {currentConditions.icon && (
                <img
                  src={currentConditions.icon}
                  alt="Weather icon"
                  className="acb-weather-icon"
                />
              )}
              <div>
                <p className="acb-weather-temp-value">
                  {getDisplayTemp(
                    currentConditions.temperature,
                    currentConditions.temperatureUnit
                  )}
                </p>
                <p className="acb-weather-description">
                  {currentConditions.description}
                </p>
              </div>
            </div>

            {/* Weather Details */}
            <div className="acb-weather-details">
              <div className="acb-weather-detail-row">
                <DropletIcon className="acb-weather-detail-icon acb-weather-humidity" />
                <span className="acb-weather-detail-label">Humidity:</span>
                <span className="acb-weather-detail-value">
                  {currentConditions.humidity !== null
                    ? `${Math.round(currentConditions.humidity)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="acb-weather-detail-row">
                <WindIcon className="acb-weather-detail-icon acb-weather-wind" />
                <span className="acb-weather-detail-label">Wind:</span>
                <span className="acb-weather-detail-value">
                  {getWindDisplay(
                    currentConditions.windSpeed,
                    currentConditions.windDirection
                  )}
                </span>
              </div>
              <div className="acb-weather-detail-row">
                <GaugeIcon className="acb-weather-detail-icon acb-weather-pressure" />
                <span className="acb-weather-detail-label">Pressure:</span>
                <span className="acb-weather-detail-value">
                  {formatPressure(currentConditions.pressure, units)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Forecast (unless compact mode) */}
      {!compact && (
        <div className="acb-weather-forecast">
          <h4 className="acb-weather-section-title">
            {forecastDays}-Day Hourly Forecast
          </h4>
          <div ref={scrollContainerRef} className="acb-weather-forecast-scroller">
            <div className="acb-weather-forecast-container">
              {Object.entries(dayGroups).map(([dayKey, hours]) => {
                const firstHour = hours[0];
                const dayDate = parseISO(firstHour.time);

                return (
                  <div key={dayKey} className="acb-weather-day-group">
                    {/* Sticky Date Header */}
                    <div className="acb-weather-day-header">
                      <span className="acb-weather-day-label">
                        {format(dayDate, 'EEE, MMM d')}
                      </span>
                    </div>

                    {/* Hourly Cards */}
                    <div className="acb-weather-hours">
                      {hours.map((hour) => {
                        const time = parseISO(hour.time);

                        return (
                          <div key={hour.time} className="acb-weather-hour-card">
                            <p className="acb-weather-hour-time">
                              {format(time, 'h a')}
                            </p>
                            <p className="acb-weather-hour-temp">
                              {getDisplayTemp(
                                hour.temperature,
                                hour.temperatureUnit
                              )}
                            </p>
                            <p className="acb-weather-hour-forecast">
                              {hour.shortForecast}
                            </p>

                            {/* Precipitation */}
                            {hour.precipitationChance !== null &&
                              hour.precipitationChance > 0 && (
                                <div className="acb-weather-hour-detail acb-weather-precipitation">
                                  <CloudRainIcon className="acb-weather-hour-detail-icon" />
                                  <span>{hour.precipitationChance}%</span>
                                </div>
                              )}

                            {/* Humidity */}
                            {hour.relativeHumidity !== null && (
                              <div className="acb-weather-hour-detail acb-weather-humidity">
                                <DropletIcon className="acb-weather-hour-detail-icon" />
                                <span>
                                  {Math.round(hour.relativeHumidity)}%
                                </span>
                              </div>
                            )}

                            {/* Wind */}
                            <div className="acb-weather-hour-detail acb-weather-wind">
                              <WindIcon className="acb-weather-hour-detail-icon" />
                              <span>
                                {hour.windSpeed} {hour.windDirection}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
