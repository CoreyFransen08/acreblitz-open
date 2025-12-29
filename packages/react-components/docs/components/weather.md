# Weather Component

Display current weather conditions and hourly forecast for US locations using the National Weather Service API.

## Basic Usage

```tsx
import { Weather } from '@acreblitz/react-components';

function App() {
  return (
    <Weather
      latitude={39.7456}
      longitude={-97.0892}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `latitude` | `number` | **required** | Latitude of the location (-90 to 90) |
| `longitude` | `number` | **required** | Longitude of the location (-180 to 180) |
| `className` | `string` | - | Optional class name for the root container |
| `refreshInterval` | `number` | `0` | Auto-refresh interval in milliseconds (0 = disabled) |
| `showRefreshButton` | `boolean` | `true` | Whether to show the refresh button |
| `units` | `'imperial' \| 'metric'` | `'imperial'` | Temperature and wind speed units |
| `compact` | `boolean` | `false` | Compact mode - shows only current conditions |
| `forecastDays` | `number` | `7` | Number of forecast hours to show (max: 7 days) |
| `loadingComponent` | `ReactNode` | - | Custom loading component |
| `errorComponent` | `ReactNode` | - | Custom error component |
| `onDataLoad` | `(data: WeatherData) => void` | - | Callback when data loads successfully |
| `onError` | `(error: Error) => void` | - | Callback when an error occurs |

## Examples

### With Auto-Refresh

Refresh weather data every 5 minutes:

```tsx
<Weather
  latitude={39.7456}
  longitude={-97.0892}
  refreshInterval={300000} // 5 minutes
/>
```

### Compact Mode

Show only current conditions without hourly forecast:

```tsx
<Weather
  latitude={39.7456}
  longitude={-97.0892}
  compact
/>
```

### Metric Units

Display temperature in Celsius and wind in m/s:

```tsx
<Weather
  latitude={39.7456}
  longitude={-97.0892}
  units="metric"
/>
```

### With Callbacks

Handle data loading and errors:

```tsx
<Weather
  latitude={39.7456}
  longitude={-97.0892}
  onDataLoad={(data) => {
    console.log('Weather loaded:', data.location.city);
  }}
  onError={(error) => {
    console.error('Weather error:', error.message);
  }}
/>
```

### Custom Loading State

```tsx
<Weather
  latitude={39.7456}
  longitude={-97.0892}
  loadingComponent={<div>Loading weather...</div>}
/>
```

### Custom Error State

```tsx
<Weather
  latitude={39.7456}
  longitude={-97.0892}
  errorComponent={
    <div className="custom-error">
      <p>Could not load weather data</p>
      <button onClick={() => window.location.reload()}>
        Try Again
      </button>
    </div>
  }
/>
```

## WeatherSkeleton

A loading placeholder component that matches the Weather component layout:

```tsx
import { WeatherSkeleton } from '@acreblitz/react-components';

function LoadingState() {
  return <WeatherSkeleton />;
}
```

## Data Structure

The `WeatherData` type returned by the API and passed to `onDataLoad`:

```typescript
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
    windSpeed: number | null;    // m/s from API
    windDirection: number | null; // degrees
    pressure: number | null;      // Pascals
  } | null;
  hourlyForecast: HourlyForecastPeriod[];
  updated: string;
}
```

## Limitations

- **US Locations Only**: The Weather component uses the National Weather Service API, which only provides data for US locations.
- **Rate Limits**: The NWS API has rate limits. Consider using `refreshInterval` sparingly (5+ minutes recommended).
- **Data Availability**: Current conditions depend on nearby weather stations. Some locations may have limited data.

## Related

- [useWeather Hook](../hooks/use-weather.md) - For more control over weather data fetching
- [Weather Utilities](../README.md#weather-utilities) - Temperature and unit conversion functions
