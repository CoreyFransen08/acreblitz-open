# useWeather Hook

A React hook for fetching and managing weather data from the National Weather Service API.

## Basic Usage

```tsx
import { useWeather } from '@acreblitz/react-components';

function MyWeatherComponent() {
  const { data, isLoading, error, refetch } = useWeather({
    latitude: 39.7456,
    longitude: -97.0892,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <h2>{data.location.city}, {data.location.state}</h2>
      <p>Temperature: {data.currentConditions?.temperature}°F</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `latitude` | `number` | **required** | Location latitude (-90 to 90) |
| `longitude` | `number` | **required** | Location longitude (-180 to 180) |
| `refreshInterval` | `number` | `0` | Auto-refresh interval in ms (0 = disabled) |
| `onDataLoad` | `(data: WeatherData) => void` | - | Callback on successful data fetch |
| `onError` | `(error: Error) => void` | - | Callback on error |

## Return Value

```typescript
interface UseWeatherResult {
  data: WeatherData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `data` | `WeatherData \| null` | The fetched weather data |
| `isLoading` | `boolean` | True while fetching data |
| `error` | `Error \| null` | Error object if fetch failed |
| `refetch` | `() => Promise<void>` | Function to manually refetch data |
| `lastUpdated` | `Date \| null` | Timestamp of last successful fetch |

## Examples

### Auto-Refresh

```tsx
const { data, isLoading } = useWeather({
  latitude: 39.7456,
  longitude: -97.0892,
  refreshInterval: 300000, // 5 minutes
});
```

### With Callbacks

```tsx
const { data } = useWeather({
  latitude: 39.7456,
  longitude: -97.0892,
  onDataLoad: (data) => {
    console.log('Weather loaded for:', data.location.city);
    // Update your app state, analytics, etc.
  },
  onError: (error) => {
    console.error('Weather fetch failed:', error);
    // Show notification, log to error service, etc.
  },
});
```

### Dynamic Location

```tsx
function WeatherForLocation({ lat, lng }: { lat: number; lng: number }) {
  const { data, isLoading, error } = useWeather({
    latitude: lat,
    longitude: lng,
  });

  // Data will refetch when lat/lng change
  // ...
}
```

### Manual Refresh with Loading State

```tsx
function RefreshableWeather() {
  const { data, refetch, isLoading, lastUpdated } = useWeather({
    latitude: 39.7456,
    longitude: -97.0892,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div>
      {data && <WeatherDisplay data={data} />}
      <button onClick={handleRefresh} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>
      {lastUpdated && (
        <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
```

## WeatherData Structure

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
    windSpeed: number | null;    // meters per second
    windDirection: number | null; // degrees
    pressure: number | null;      // Pascals
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
```

## Unit Conversions

The API returns data in metric units. Use the provided utilities to convert:

```tsx
import {
  celsiusToFahrenheit,
  mpsToMph,
  pascalsToInHg,
  degreesToCompass,
} from '@acreblitz/react-components';

const { data } = useWeather({ latitude: 39.7, longitude: -97.0 });

if (data?.currentConditions) {
  const { temperature, windSpeed, windDirection, pressure } = data.currentConditions;

  // Convert as needed
  const tempF = temperature !== null ? celsiusToFahrenheit(temperature) : null;
  const windMph = windSpeed !== null ? mpsToMph(windSpeed) : null;
  const pressureInHg = pressure !== null ? pascalsToInHg(pressure) : null;
  const windDir = windDirection !== null ? degreesToCompass(windDirection) : null;
}
```

## Caching

The underlying `fetchWeatherData` function includes a 10-minute cache for API responses. To clear the cache:

```tsx
import { clearWeatherCache } from '@acreblitz/react-components';

// Clear all cached weather data
clearWeatherCache();
```

## Error Handling

Common errors:

| Error | Cause |
|-------|-------|
| "Location not supported" | Coordinates outside US |
| "Network error" | No internet connection |
| "Rate limit exceeded" | Too many requests to NWS API |

```tsx
const { error } = useWeather({ latitude, longitude });

if (error) {
  if (error.message.includes('not supported')) {
    return <div>Weather data is only available for US locations</div>;
  }
  return <div>Unable to load weather: {error.message}</div>;
}
```

## Best Practices

1. **Avoid excessive refresh intervals**: The NWS API has rate limits. Use 5+ minute intervals.

2. **Handle loading states**: Always show feedback while data is loading.

3. **Handle null values**: Current conditions may have null values for some fields.

4. **Cleanup is automatic**: The hook properly cleans up intervals and prevents state updates after unmount.

## Related

- [Weather Component](../components/weather.md) - Pre-built weather display
- [Weather Utilities](../README.md#weather-utilities) - Conversion functions
