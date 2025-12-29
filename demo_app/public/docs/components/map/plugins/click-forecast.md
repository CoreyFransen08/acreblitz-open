# Click Forecast Plugin

Click-to-forecast functionality that displays a 48-hour NWS weather forecast in a popup when clicking anywhere on the map.

## Overview

The Click Forecast plugin adds a toggleable mode to the Map component that allows users to click any location within the Continental US (CONUS) and view a detailed 48-hour forecast from the National Weather Service. Data is fetched from the NWS MapClick.php API in DWML (Digital Weather Markup Language) format.

## Features

- Toggle button to enable/disable click-to-forecast mode
- 48-hour hourly forecast display
- Shows temperature, precipitation chance, humidity, wind speed/direction
- **48-hour rain accumulation** - total precipitation expected over the forecast period
- Imperial and metric unit support
- Mobile-responsive popup design
- CONUS-only (Continental US) coverage

## Basic Usage

Enable click forecast on the Map component:

```tsx
import { Map } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function App() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={10}
      height="500px"
      clickForecast={{
        enabled: true,
      }}
    />
  );
}
```

## Props

### ClickForecastOptions

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable click-to-forecast mode |
| `position` | `'topleft' \| 'topright' \| 'bottomleft' \| 'bottomright'` | `'topright'` | Position of the toggle button |
| `forecastHours` | `number` | `48` | Number of forecast hours to display (max 168) |
| `units` | `'imperial' \| 'metric'` | `'imperial'` | Unit system for display |
| `popupMaxWidth` | `number` | `400` | Maximum popup width in pixels |
| `popupMaxHeight` | `number` | `350` | Maximum popup height in pixels |
| `autoPan` | `boolean` | `true` | Auto-pan map to show popup |

### Event Handlers

Add event handlers via the `eventHandlers` prop on the Map component:

| Event | Type | Description |
|-------|------|-------------|
| `onClickForecastFetched` | `(data: DWMLForecastData) => void` | Called when forecast data is successfully fetched |
| `onClickForecastModeChange` | `(enabled: boolean) => void` | Called when the toggle button is clicked |
| `onError` | `(error: Error) => void` | Called when a fetch error occurs |

## Examples

### With Event Handlers

```tsx
import { Map } from '@acreblitz/react-components';
import type { DWMLForecastData } from '@acreblitz/react-components';

function WeatherMap() {
  const handleForecastFetched = (data: DWMLForecastData) => {
    console.log('Location:', data.location.city, data.location.state);
    console.log('Hourly forecasts:', data.hourly.length);

    // Calculate total precipitation
    const totalPrecip = data.hourly.reduce(
      (sum, hour) => sum + (hour.precipitationAmount ?? 0),
      0
    );
    console.log('48hr precipitation:', totalPrecip, 'inches');
  };

  const handleModeChange = (enabled: boolean) => {
    console.log('Click forecast mode:', enabled ? 'ON' : 'OFF');
  };

  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={10}
      height="500px"
      clickForecast={{
        enabled: true,
        position: 'topright',
        forecastHours: 48,
        units: 'imperial',
      }}
      eventHandlers={{
        onClickForecastFetched: handleForecastFetched,
        onClickForecastModeChange: handleModeChange,
        onError: (error) => console.error('Forecast error:', error),
      }}
    />
  );
}
```

### Metric Units

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={10}
  height="500px"
  clickForecast={{
    enabled: true,
    units: 'metric',
  }}
/>
```

### Custom Popup Size

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={10}
  height="500px"
  clickForecast={{
    enabled: true,
    popupMaxWidth: 500,
    popupMaxHeight: 450,
  }}
/>
```

### Combined with Other Features

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={10}
  height="500px"
  clickForecast={{
    enabled: true,
    position: 'topright',
  }}
  measure={{
    enabled: true,
    position: 'topleft',
  }}
  drawing={{
    enabled: true,
    position: 'bottomleft',
  }}
/>
```

## Data Types

### DWMLForecastData

```typescript
interface DWMLForecastData {
  location: DWMLLocation;
  hourly: DWMLHourlyData[];
  creationTime: string;
  productInfo?: {
    conciseName: string;
    operationalMode: string;
  };
}
```

### DWMLLocation

```typescript
interface DWMLLocation {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  areaDescription?: string;
}
```

### DWMLHourlyData

```typescript
interface DWMLHourlyData {
  validTime: string;              // ISO timestamp
  temperature: number | null;      // Fahrenheit
  dewPoint: number | null;         // Fahrenheit
  apparentTemperature: number | null; // Heat index/wind chill
  precipitationChance: number | null; // 0-100%
  precipitationAmount: number | null; // Inches
  humidity: number | null;         // 0-100%
  windSpeed: number | null;        // mph
  windGust: number | null;         // mph
  windDirection: number | null;    // Degrees (0-360)
  cloudCover: number | null;       // 0-100%
  weatherCondition: string | null; // e.g., "Partly Cloudy"
}
```

## useMapClickForecast Hook

For advanced use cases, you can use the hook directly:

```tsx
import { useMapClickForecast } from '@acreblitz/react-components';

function CustomForecastComponent() {
  const {
    data,
    isLoading,
    error,
    activeCoords,
    fetchForecast,
    clearForecast,
  } = useMapClickForecast({
    enabled: true,
    forecastHours: 48,
    onForecastFetched: (data) => console.log(data),
    onError: (error) => console.error(error),
  });

  const handleClick = () => {
    // Manually trigger forecast for a location
    fetchForecast(39.7456, -97.0892);
  };

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading}>
        Get Forecast
      </button>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && (
        <p>
          {data.location.city}, {data.location.state}:
          {data.hourly[0]?.temperature}°F
        </p>
      )}
    </div>
  );
}
```

### Hook Options

```typescript
interface UseClickForecastOptions {
  enabled: boolean;
  forecastHours?: number;
  onForecastFetched?: (data: DWMLForecastData) => void;
  onError?: (error: Error) => void;
  onModeChange?: (enabled: boolean) => void;
}
```

### Hook Return Value

```typescript
interface UseClickForecastResult {
  data: DWMLForecastData | null;
  isLoading: boolean;
  error: Error | null;
  activeCoords: { lat: number; lng: number } | null;
  fetchForecast: (lat: number, lng: number) => Promise<void>;
  clearForecast: () => void;
}
```

## Utility Functions

### fetchDWMLForecast

Fetch forecast data directly:

```tsx
import { fetchDWMLForecast } from '@acreblitz/react-components';

const data = await fetchDWMLForecast(39.7456, -97.0892);
console.log(data.location.city); // "Lebanon"
console.log(data.hourly[0].temperature); // 72
```

### Unit Conversion Utilities

```tsx
import {
  dwmlFahrenheitToCelsius,
  mphToKmh,
  inchesToMm,
  degreesToCompassDirection,
} from '@acreblitz/react-components';

// Temperature
dwmlFahrenheitToCelsius(72); // 22

// Wind speed
mphToKmh(15); // 24

// Precipitation
inchesToMm(0.5); // 12.7

// Wind direction
degreesToCompassDirection(225); // "SW"
```

## Popup Display

The forecast popup shows:

1. **Header**: City, state, and coordinates
2. **Summary Row**:
   - Current temperature
   - **48-hour rain accumulation** (highlighted in blue)
   - Current precipitation chance
   - Humidity
   - Wind speed and direction
3. **Hourly Table**: Grouped by day with time, temp, precip %, and wind
4. **Footer**: Data source and update time

## Coverage & Limitations

- **CONUS Only**: The NWS MapClick.php API only covers the Continental United States (latitude 24-50, longitude -125 to -66)
- **No Caching**: Fresh data is fetched on every click (per design requirements)
- **API Dependency**: Relies on NWS servers being available

### Error Handling

The plugin handles common errors:

- **Out of coverage area**: "Coordinates outside CONUS coverage area"
- **Network errors**: Displays user-friendly error message in popup
- **XML parsing errors**: Gracefully handled with error state

## Styling

The plugin uses CSS classes for customization:

```css
/* Toggle button */
.leaflet-control-click-forecast { }
.leaflet-click-forecast-toggle { }
.leaflet-click-forecast-toggle.active { }

/* Active mode cursor */
.leaflet-click-forecast-active { }

/* Popup */
.leaflet-click-forecast-popup { }
.forecast-popup-content { }
.forecast-popup-header { }
.forecast-popup-summary { }
.forecast-summary-grid { }
.forecast-summary-accumulation { }  /* 48hr rain highlight */
.forecast-summary-rain { }          /* Rain value styling */
.forecast-popup-hourly { }
.forecast-popup-footer { }

/* States */
.forecast-popup-loading { }
.forecast-popup-error { }
.forecast-popup-empty { }
```

## Related

- [Map Component](../map.md) - Main map documentation
- [Measure Plugin](./measure.md) - Distance and area measurement
- [Weather Radar Overlay](../weather-radar.md) - Animated NEXRAD radar
