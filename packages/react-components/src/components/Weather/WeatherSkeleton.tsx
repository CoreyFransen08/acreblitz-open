import './Weather.css';

/**
 * Loading skeleton for the Weather component
 */
export function WeatherSkeleton() {
  return (
    <div className="acb-weather">
      <div className="acb-weather-skeleton acb-weather-skeleton-header" />
      <div className="acb-weather-skeleton acb-weather-skeleton-subheader" />
      <div className="acb-weather-skeleton acb-weather-skeleton-conditions" />
      <div className="acb-weather-skeleton acb-weather-skeleton-forecast" />
    </div>
  );
}
