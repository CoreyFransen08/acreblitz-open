import { useState } from 'react';
import { useWeather } from '../../hooks/useWeather';
import type { WeatherProps } from '../../types/weather';
import { WeatherDisplay } from './WeatherDisplay';
import { WeatherSkeleton } from './WeatherSkeleton';
import './Weather.css';

// SVG Icons for error and empty states
const AlertTriangleIcon = ({ className }: { className?: string }) => (
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
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const CloudIcon = ({ className }: { className?: string }) => (
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
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

/**
 * Weather component that displays current conditions and hourly forecast
 *
 * Uses the National Weather Service API (api.weather.gov) - US locations only.
 *
 * @example
 * ```tsx
 * <Weather
 *   latitude={39.7456}
 *   longitude={-97.0892}
 *   refreshInterval={300000}
 *   units="imperial"
 * />
 * ```
 */
export function Weather({
  latitude,
  longitude,
  className,
  refreshInterval = 0,
  showRefreshButton = true,
  onDataLoad,
  onError,
  loadingComponent,
  errorComponent,
  forecastDays = 7,
  units = 'imperial',
  compact = false,
}: WeatherProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useWeather({
    latitude,
    longitude,
    refreshInterval,
    onDataLoad,
    onError,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state
  if (isLoading && !data) {
    if (loadingComponent) {
      return <div className={className}>{loadingComponent}</div>;
    }
    return (
      <div className={className}>
        <WeatherSkeleton />
      </div>
    );
  }

  // Error state
  if (error && !data) {
    if (errorComponent) {
      return <div className={className}>{errorComponent}</div>;
    }
    return (
      <div className={className}>
        <div className="acb-weather-error">
          <AlertTriangleIcon className="acb-weather-error-icon" />
          <p className="acb-weather-error-title">Failed to load weather data</p>
          <p className="acb-weather-error-message">{error.message}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={className}>
        <div className="acb-weather-empty">
          <CloudIcon className="acb-weather-empty-icon" />
          <p className="acb-weather-empty-text">No weather data available</p>
        </div>
      </div>
    );
  }

  // Data loaded - show weather display
  return (
    <div className={className}>
      <WeatherDisplay
        data={data}
        units={units}
        compact={compact}
        showRefreshButton={showRefreshButton}
        isRefreshing={isRefreshing || isLoading}
        onRefresh={handleRefresh}
        forecastDays={forecastDays}
      />
    </div>
  );
}
