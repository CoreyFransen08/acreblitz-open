# @acreblitz/react-components

Reusable React components from AcreBlitz for agricultural applications.

## Installation

```bash
npm install @acreblitz/react-components
```

## Components

### Weather

Display current weather conditions and hourly forecast using the National Weather Service API.

```tsx
import { Weather } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function App() {
  return (
    <Weather
      latitude={39.7456}
      longitude={-97.0892}
    />
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `latitude` | `number` | required | Latitude (-90 to 90) |
| `longitude` | `number` | required | Longitude (-180 to 180) |
| `className` | `string` | - | Custom CSS class |
| `refreshInterval` | `number` | `0` | Auto-refresh interval in ms (0 = disabled) |
| `showRefreshButton` | `boolean` | `true` | Show manual refresh button |
| `forecastDays` | `number` | `7` | Number of forecast days (1-7) |
| `units` | `'imperial' \| 'metric'` | `'imperial'` | Temperature units |
| `compact` | `boolean` | `false` | Show only current conditions |
| `onDataLoad` | `(data: WeatherData) => void` | - | Callback when data loads |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `loadingComponent` | `ReactNode` | - | Custom loading UI |
| `errorComponent` | `ReactNode` | - | Custom error UI |

### useWeather Hook

For custom implementations, use the `useWeather` hook directly:

```tsx
import { useWeather } from '@acreblitz/react-components';

function CustomWeather({ lat, lon }) {
  const { data, isLoading, error, refetch, lastUpdated } = useWeather({
    latitude: lat,
    longitude: lon,
    refreshInterval: 300000, // 5 minutes
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h2>{data.location.city}, {data.location.state}</h2>
      <p>Temperature: {data.currentConditions?.temperature}°F</p>
      <button onClick={refetch}>Refresh</button>
      {lastUpdated && <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>}
    </div>
  );
}
```

## Data Source

This component uses the [National Weather Service API](https://www.weather.gov/documentation/services-web-api) (api.weather.gov), which is free and does not require an API key. The API is US-only.

## Types

```typescript
interface WeatherData {
  location: WeatherLocation;
  currentConditions: CurrentConditions | null;
  hourlyForecast: HourlyForecastPeriod[];
  updated: string;
}

interface WeatherLocation {
  city: string;
  state: string;
  gridId: string;
  gridX: number;
  gridY: number;
}

interface CurrentConditions {
  timestamp: string;
  temperature: number | null;
  temperatureUnit: string;
  description: string;
  icon: string;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
}

interface HourlyForecastPeriod {
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
```

## License

MIT
