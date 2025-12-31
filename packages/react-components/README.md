# @acreblitz/react-components

Reusable React components from AcreBlitz for agricultural applications.

## Installation

```bash
npm install @acreblitz/react-components
```

## Try It

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/CoreyFransen08/acreblitz-open/tree/main/opensrc/demo_app)

## Components

### Map

Interactive Leaflet-based map with satellite imagery, drawing tools, measurement, and data overlays.

```tsx
import { Map, DEFAULT_LAYERS } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function App() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={13}
      height="500px"
      drawing={{ enabled: true }}
      measure={{ enabled: true }}
      layers={{
        baseLayers: [DEFAULT_LAYERS.esriWorldImagery],
        defaultBaseLayer: 'esri-satellite',
      }}
    />
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `center` | `[number, number]` | `[39.7456, -97.0892]` | Initial map center as [lat, lng] |
| `zoom` | `number` | `13` | Initial zoom level |
| `minZoom` | `number` | - | Minimum zoom level |
| `maxZoom` | `number` | - | Maximum zoom level |
| `bounds` | `LatLngBoundsExpression` | - | Initial bounds to fit (overrides center/zoom) |
| `height` | `string \| number` | `'400px'` | Map height |
| `width` | `string \| number` | `'100%'` | Map width |
| `className` | `string` | - | Custom CSS class |
| `style` | `CSSProperties` | - | Inline styles |
| `layers` | `LayerConfig` | - | Layer configuration (base layers, overlays) |
| `showLayerControl` | `boolean` | `true` | Show layer switching control |
| `showZoomControl` | `boolean` | `true` | Show zoom controls |
| `showScaleControl` | `boolean` | `false` | Show scale control |
| `showAttributionControl` | `boolean` | `true` | Show attribution |
| `units` | `{ distance?: 'metric' \| 'imperial', area?: 'metric' \| 'imperial' \| 'acres' \| 'hectares' }` | - | Unit configuration |
| `drawing` | `DrawingOptions` | - | Drawing tools configuration |
| `measure` | `MeasureOptions` | - | Measurement tool configuration |
| `clickForecast` | `ClickForecastOptions` | - | Click-to-forecast configuration |
| `dataOverlays` | `DataOverlayProps` | - | Data overlay configuration (soil, hydro) |
| `eventHandlers` | `MapEventHandlers` | - | Event handler callbacks |
| `loadingComponent` | `ReactNode` | - | Custom loading UI |
| `errorComponent` | `ReactNode` | - | Custom error UI |
| `scrollWheelZoom` | `boolean` | `true` | Enable scroll wheel zoom |
| `doubleClickZoom` | `boolean` | `true` | Enable double-click zoom |
| `dragging` | `boolean` | `true` | Enable map dragging |
| `maxBounds` | `LatLngBoundsExpression` | - | Maximum bounds for panning |
| `initialGeoJSON` | `GeoJSON.FeatureCollection` | - | Existing GeoJSON to display on mount |

#### Drawing Options

```tsx
drawing={{
  enabled: true,
  position: 'topright',
  draw: {
    polygon: true,
    rectangle: true,
    polyline: true,
    circle: true,
    marker: true,
  },
  edit: {
    edit: true,
    remove: true,
  },
  shapeOptions: {
    color: '#3b82f6',
    weight: 2,
    fillOpacity: 0.2,
  },
}}
```

#### Measurement Options

```tsx
measure={{
  enabled: true,
  position: 'topleft',
  color: '#FF0080',
}}
```

#### Layer Configuration

```tsx
import { DEFAULT_LAYERS } from '@acreblitz/react-components';

layers={{
  baseLayers: [
    DEFAULT_LAYERS.esriWorldImagery,
    DEFAULT_LAYERS.openStreetMap,
    DEFAULT_LAYERS.esriWorldTopoMap,
  ],
  overlays: [],
  defaultBaseLayer: 'esri-satellite',
  defaultOverlays: [],
}}
```

#### Event Handlers

```tsx
eventHandlers={{
  onReady: (map) => console.log('Map ready', map),
  onClick: (event) => console.log('Clicked', event.latlng),
  onDrawCreated: (event) => console.log('Shape drawn', event.geoJSON),
  onMeasureComplete: (event) => console.log('Measured', event.displayValue),
}}
```

#### useMapInstance Hook

For programmatic map control:

```tsx
import { Map, useMapInstance } from '@acreblitz/react-components';
import { useRef } from 'react';

function MyMap() {
  const mapRef = useRef(null);
  const { flyTo, exportGeoJSON, clearDrawnItems, isReady } = useMapInstance({ mapRef });

  return (
    <>
      <Map ref={mapRef} center={[39.7456, -97.0892]} zoom={13} />
      <button onClick={() => flyTo([40.0, -98.0], 14)}>Fly to Location</button>
      <button onClick={() => console.log(exportGeoJSON())}>Export GeoJSON</button>
    </>
  );
}
```

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
