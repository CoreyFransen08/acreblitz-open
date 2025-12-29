# Map Component

Interactive Leaflet-based map with satellite imagery, drawing tools, measurement, and layer switching.

## CSS Setup

**Important**: The Map component requires CSS imports to function correctly. There are two approaches:

### Option 1: Import Package Styles (Recommended)

Import the bundled styles which include Leaflet CSS and component styles:

```tsx
// In your app's entry point (e.g., App.tsx, layout.tsx, _app.tsx)
import '@acreblitz/react-components/styles.css';
```

This includes:
- Leaflet core CSS
- Leaflet Draw plugin CSS
- Custom component styles
- Mobile-responsive overrides

### Option 2: Import Leaflet CSS Separately

If you need more control or are already using Leaflet elsewhere:

```tsx
// Leaflet core (required)
import 'leaflet/dist/leaflet.css';

// Leaflet Draw plugin (required if using drawing)
import 'leaflet-draw/dist/leaflet.draw.css';

// Component styles
import '@acreblitz/react-components/styles.css';
```

### Next.js Setup

For Next.js, import styles in your root layout or `_app.tsx`:

```tsx
// app/layout.tsx (App Router)
import '@acreblitz/react-components/styles.css';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// pages/_app.tsx (Pages Router)
import '@acreblitz/react-components/styles.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

## Basic Usage

```tsx
import { Map } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function App() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      height="500px"
    />
  );
}
```

## Props

### Position & View

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `center` | `[number, number]` | `[39.7456, -97.0892]` | Initial center as [lat, lng] |
| `zoom` | `number` | `13` | Initial zoom level |
| `minZoom` | `number` | - | Minimum zoom level |
| `maxZoom` | `number` | - | Maximum zoom level |
| `bounds` | `LatLngBoundsExpression` | - | Initial bounds (overrides center/zoom) |
| `maxBounds` | `LatLngBoundsExpression` | - | Maximum panning bounds |

### Sizing & Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `string \| number` | `'400px'` | Map height |
| `width` | `string \| number` | `'100%'` | Map width |
| `className` | `string` | - | Container class name |
| `style` | `CSSProperties` | - | Inline styles |

### Controls

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showLayerControl` | `boolean` | `true` | Show layer switching control |
| `showZoomControl` | `boolean` | `true` | Show zoom buttons |
| `showScaleControl` | `boolean` | `false` | Show scale indicator |
| `showAttributionControl` | `boolean` | `true` | Show attribution |

### Interaction

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scrollWheelZoom` | `boolean` | `true` | Enable scroll wheel zoom |
| `doubleClickZoom` | `boolean` | `true` | Enable double-click zoom |
| `dragging` | `boolean` | `true` | Enable map dragging |

### Drawing Tools

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `drawing` | `DrawingOptions` | - | Drawing configuration |
| `initialGeoJSON` | `FeatureCollection` | - | Initial shapes to display |

### Measurement

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `measure` | `MeasureOptions` | - | Measurement tool configuration |

### Layers

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `layers` | `LayerConfig` | ESRI Satellite default | Layer configuration |

### Data Overlays

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataOverlays` | `DataOverlayProps` | - | Data overlay configuration (SSURGO soil, etc.) |

### Events

| Prop | Type | Description |
|------|------|-------------|
| `eventHandlers` | `MapEventHandlers` | Event callback handlers |

### Custom States

| Prop | Type | Description |
|------|------|-------------|
| `loadingComponent` | `ReactNode` | Custom loading component |
| `errorComponent` | `ReactNode` | Custom error component |

## Examples

### With Drawing Tools

Enable all drawing tools:

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  drawing={{
    enabled: true,
    position: 'topright',
  }}
  eventHandlers={{
    onDrawCreated: (e) => {
      console.log('Shape drawn:', e.layerType);
      console.log('GeoJSON:', e.geoJSON);
    },
  }}
/>
```

Enable specific drawing tools:

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  drawing={{
    enabled: true,
    draw: {
      polygon: true,
      rectangle: true,
      marker: true,
      polyline: false,
      circle: false,
      circlemarker: false,
    },
  }}
/>
```

### With Measurement Tools

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  measure={{
    enabled: true,
    position: 'topleft',
    color: '#FF0080',
  }}
  eventHandlers={{
    onMeasureComplete: (e) => {
      console.log(`${e.mode}: ${e.displayValue}`);
    },
  }}
/>
```

### Custom Layers

```tsx
import { Map, createLayerConfig, DEFAULT_LAYERS } from '@acreblitz/react-components';

<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  layers={{
    baseLayers: [
      DEFAULT_LAYERS.esriWorldImagery,
      DEFAULT_LAYERS.openStreetMap,
      DEFAULT_LAYERS.esriWorldTopoMap,
      {
        id: 'custom-layer',
        name: 'Custom Tiles',
        url: 'https://your-tile-server/{z}/{x}/{y}.png',
        attribution: '© Your Attribution',
      },
    ],
    defaultBaseLayer: 'esri-satellite',
  }}
/>
```

### With Ref for Programmatic Control

```tsx
import { useRef } from 'react';
import { Map, useMapInstance } from '@acreblitz/react-components';
import type { Map as LeafletMap } from 'leaflet';

function ControlledMap() {
  const mapRef = useRef<LeafletMap>(null);
  const { flyTo, exportGeoJSON, isReady } = useMapInstance({ mapRef });

  const handleGoToLocation = () => {
    flyTo([40.7128, -74.0060], 12); // New York
  };

  const handleSave = () => {
    const geoJSON = exportGeoJSON();
    console.log('Drawn shapes:', geoJSON);
    // Save to your backend
  };

  return (
    <div>
      <div>
        <button onClick={handleGoToLocation} disabled={!isReady}>
          Go to New York
        </button>
        <button onClick={handleSave} disabled={!isReady}>
          Export Shapes
        </button>
      </div>
      <Map
        ref={mapRef}
        center={[39.7456, -97.0892]}
        zoom={15}
        height="500px"
        drawing={{ enabled: true }}
      />
    </div>
  );
}
```

### With Data Overlays (SSURGO Soil)

Display interactive SSURGO soil data on the map:

```tsx
import { Map, SSURGO_OVERLAY_CONFIG } from '@acreblitz/react-components';

<Map
  center={[39.7456, -97.0892]}
  zoom={14}
  height="500px"
  dataOverlays={{
    enabled: true,
    showPanel: true,
    panelConfig: {
      position: 'topright',
      title: 'Data Layers',
    },
    overlays: [SSURGO_OVERLAY_CONFIG],
    defaultVisibility: {
      'ssurgo-soil': true,
    },
  }}
  eventHandlers={{
    onSoilFeatureClick: (e) => {
      console.log('Clicked soil:', e.feature.properties.muname);
    },
    onSoilFeatureSelect: (e) => {
      console.log('Selected:', e.selectedFeatures);
    },
  }}
/>
```

> **Note**: Soil data loads at zoom level 12+. See [Data Overlays](./data-overlays/) for detailed documentation.

### With Weather Radar Overlay

Display animated NEXRAD weather radar with playback controls:

```tsx
import { Map, WEATHER_RADAR_OVERLAY_CONFIG, DEFAULT_LAYERS } from '@acreblitz/react-components';

<Map
  center={[39.7456, -97.0892]}
  zoom={6}
  height="500px"
  layers={{
    baseLayers: [
      DEFAULT_LAYERS.esriWorldImagery,
      DEFAULT_LAYERS.openStreetMap,
    ],
    overlays: [WEATHER_RADAR_OVERLAY_CONFIG],
    defaultBaseLayer: 'esri-satellite',
    defaultOverlays: ['weather-radar-nexrad'],
  }}
/>
```

> **Note**: Weather radar shows the past hour at 5-minute intervals. See [Weather Radar Overlay](./weather-radar.md) for animation controls and configuration.

### Load Existing GeoJSON

```tsx
const existingShapes: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-97.09, 39.74],
          [-97.08, 39.74],
          [-97.08, 39.75],
          [-97.09, 39.75],
          [-97.09, 39.74],
        ]],
      },
      properties: { name: 'Field 1' },
    },
  ],
};

<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  drawing={{ enabled: true }}
  initialGeoJSON={existingShapes}
/>
```

### Event Handlers

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  drawing={{ enabled: true }}
  measure={{ enabled: true }}
  eventHandlers={{
    onReady: (map) => {
      console.log('Map ready:', map);
    },
    onClick: (e) => {
      console.log('Clicked at:', e.latlng);
    },
    onMoveEnd: (e) => {
      console.log('New center:', e.center);
      console.log('Zoom:', e.zoom);
    },
    onZoomEnd: (e) => {
      console.log('Zoomed to:', e.zoom);
    },
    onDrawCreated: (e) => {
      console.log('Created:', e.layerType, e.geoJSON);
    },
    onDrawEdited: (e) => {
      console.log('Edited:', e.geoJSON.features.length, 'shapes');
    },
    onDrawDeleted: (e) => {
      console.log('Deleted:', e.layers.length, 'shapes');
    },
    onMeasureComplete: (e) => {
      console.log(`${e.mode}: ${e.displayValue}`);
    },
    // Data overlay events
    onSoilFeatureClick: (e) => {
      console.log('Soil clicked:', e.feature.properties);
    },
    onSoilFeatureSelect: (e) => {
      console.log('Selection changed:', e.action, e.changedFeature.id);
    },
  }}
/>
```

## DrawingOptions

```typescript
interface DrawingOptions {
  enabled?: boolean;
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  draw?: {
    polyline?: boolean;
    polygon?: boolean;
    rectangle?: boolean;
    circle?: boolean;
    marker?: boolean;
    circlemarker?: boolean;
  };
  edit?: {
    edit?: boolean;
    remove?: boolean;
  };
  shapeOptions?: PathOptions;
}
```

## MeasureOptions

```typescript
interface MeasureOptions {
  enabled?: boolean;
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  color?: string;
}
```

## Default Layers

The package includes three default base layers:

| Layer ID | Name | Description |
|----------|------|-------------|
| `esri-satellite` | Satellite | ESRI World Imagery (default) |
| `osm` | Street Map | OpenStreetMap |
| `esri-topo` | Topographic | ESRI World Topo Map |

Access default layers:

```tsx
import { DEFAULT_LAYERS } from '@acreblitz/react-components';

console.log(DEFAULT_LAYERS.esriWorldImagery);
// { id: 'esri-satellite', name: 'Satellite', url: '...', attribution: '...' }
```

## MapSkeleton

A loading placeholder component:

```tsx
import { MapSkeleton } from '@acreblitz/react-components';

function LoadingState() {
  return <MapSkeleton height="500px" width="100%" />;
}
```

## Mobile Responsiveness

The Map component is mobile-responsive by default:

- Touch-friendly controls (44px minimum touch targets)
- Gesture handling support (two-finger pan)
- Responsive control positioning

## SSR Safety

The Map component is SSR-safe and works with Next.js. It uses dynamic imports to load Leaflet only on the client side.

## Troubleshooting

### Map Not Displaying

1. Ensure you've imported the CSS:
   ```tsx
   import '@acreblitz/react-components/styles.css';
   ```

2. Set an explicit height:
   ```tsx
   <Map height="500px" />
   ```

3. If the container is dynamically sized, call `invalidateSize()`:
   ```tsx
   const { invalidateSize } = useMapInstance({ mapRef });
   useEffect(() => {
     invalidateSize();
   }, [containerSize]);
   ```

### Marker Icons Not Loading

The component uses CDN URLs for default marker icons. If you're in an offline environment, you may need to provide custom icon URLs.

### Drawing Tools Not Visible

Ensure `drawing.enabled` is set to `true`:

```tsx
<Map drawing={{ enabled: true }} />
```

## Related

- [useMapInstance Hook](../hooks/use-map-instance.md) - Programmatic map control
- [Map Utilities](../README.md#map-utilities) - Layer configuration helpers
- [Weather Radar Overlay](./weather-radar.md) - Animated NEXRAD radar with playback controls
- [Data Overlays](./data-overlays/) - Interactive data layers (SSURGO soil, etc.)
- [SSURGO Soil Overlay](./data-overlays/soil-overlay.md) - Soil data visualization
- [3DHP Hydro Overlay](./data-overlays/hydro-overlay.md) - Streams, lakes, and drainage areas
