# @acreblitz/react-components

Reusable React components for agriculture applications, featuring weather displays and interactive mapping tools.

## Installation

```bash
npm install @acreblitz/react-components
# or
pnpm add @acreblitz/react-components
# or
yarn add @acreblitz/react-components
```

## Peer Dependencies

This package requires React 18+:

```bash
npm install react react-dom
```

## Quick Start

### Weather Component

Display current weather conditions and hourly forecast for US locations using the National Weather Service API.

```tsx
import { Weather } from '@acreblitz/react-components';

function App() {
  return (
    <Weather
      latitude={39.7456}
      longitude={-97.0892}
      units="imperial"
    />
  );
}
```

### Map Component

Interactive Leaflet-based map with drawing tools, measurement, and layer switching.

```tsx
import { Map } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function App() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      height="500px"
      drawing={{ enabled: true }}
      measure={{ enabled: true }}
    />
  );
}
```

> **Important**: The Map component requires importing the styles CSS file. See [Map Component Documentation](./components/map.md#css-setup) for details.

## Components

| Component | Description |
|-----------|-------------|
| [Weather](./components/weather.md) | Weather display using NWS API (US only) |
| [Map](./components/map.md) | Leaflet map with drawing and measurement |
| [Weather Radar](./components/map/weather-radar.md) | Animated NEXRAD radar overlay |
| [Data Overlays](./components/map/data-overlays/index.md) | Interactive SSURGO soil and 3DHP hydro layers |
| WeatherSkeleton | Loading placeholder for Weather |
| MapSkeleton | Loading placeholder for Map |

## Hooks

| Hook | Description |
|------|-------------|
| [useWeather](./hooks/use-weather.md) | Fetch and manage weather data |
| [useMapInstance](./hooks/use-map-instance.md) | Programmatic map control |
| useRadarAnimation | Radar animation playback control |
| useDataOverlay | Data overlay state and selection |

## Utilities

### Weather Utilities

```tsx
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  mpsToMph,
  degreesToCompass,
  formatTemperature,
  formatWindSpeed,
  formatPressure,
  fetchWeatherData,
  clearWeatherCache,
} from '@acreblitz/react-components';
```

### Map Utilities

```tsx
import {
  DEFAULT_LAYERS,
  createLayerConfig,
  getDefaultLayer,
  WEATHER_RADAR_OVERLAY_CONFIG,
  SSURGO_OVERLAY_CONFIG,
  HYDRO_3DHP_OVERLAY_CONFIG,
} from '@acreblitz/react-components';
```

## TypeScript Support

All components and utilities are fully typed. Import types directly:

```tsx
import type {
  // Weather
  WeatherProps,
  WeatherData,
  UseWeatherResult,

  // Map
  MapProps,
  DrawCreatedEvent,
  UseMapInstanceResult,
} from '@acreblitz/react-components';
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## SSR Compatibility

Both components are SSR-safe and compatible with Next.js and other server-side rendering frameworks. The Map component uses dynamic imports to avoid Leaflet's window dependency during server rendering.

## License

MIT
