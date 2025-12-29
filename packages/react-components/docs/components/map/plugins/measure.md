# Measure Plugin

Distance and area measurement tools for the Map component, supporting multiple unit systems including metric, imperial, acres, and hectares.

## Overview

The Measure plugin adds interactive measurement capabilities to the Map component. Users can measure distances (lines) and areas (polygons) directly on the map with real-time feedback. The plugin is based on the Leaflet.Measure library, modified for TypeScript and enhanced with multiple unit system support.

## Features

- **Distance Measurement**: Click to create points, measures total path length
- **Area Measurement**: Click to create polygon vertices, measures enclosed area
- **Multiple Unit Systems**: Metric, imperial, acres, hectares
- **Real-time Display**: Measurements update as you draw
- **Collapsible Control**: Expandable menu on hover
- **Clear Results**: Click the X to remove measurements

## Basic Usage

Enable measurement on the Map component:

```tsx
import { Map } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function App() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      height="500px"
      measure={{
        enabled: true,
      }}
    />
  );
}
```

## Props

### MeasureOptions

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable measurement tools |
| `position` | `'topleft' \| 'topright' \| 'bottomleft' \| 'bottomright'` | `'topleft'` | Control position |
| `color` | `string` | `'#FF0080'` | Line and fill color |
| `title` | `string` | `'Measure'` | Control title text |
| `collapsed` | `boolean` | `true` | Start collapsed (expand on hover) |
| `distanceUnit` | `DistanceUnit` | `'metric'` | Unit for distance measurements |
| `areaUnit` | `AreaUnit` | `'metric'` | Unit for area measurements |

### Unit Types

```typescript
type DistanceUnit = 'metric' | 'imperial';
type AreaUnit = 'metric' | 'imperial' | 'acres' | 'hectares';
```

### Event Handlers

Add event handlers via the `eventHandlers` prop on the Map component:

| Event | Type | Description |
|-------|------|-------------|
| `onMeasureComplete` | `(e: MeasureCompleteEvent) => void` | Called when a measurement is completed |

```typescript
interface MeasureCompleteEvent {
  mode: 'distance' | 'area';
  value: number;           // Raw value in meters or square meters
  displayValue: string;    // Formatted value with units
  points: [number, number][]; // Array of [lat, lng] coordinates
}
```

## Examples

### Imperial Units

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  measure={{
    enabled: true,
    distanceUnit: 'imperial',
    areaUnit: 'imperial',
  }}
/>
```

### Agricultural Units (Acres)

Ideal for farm field measurements:

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  measure={{
    enabled: true,
    distanceUnit: 'imperial',
    areaUnit: 'acres',
  }}
  eventHandlers={{
    onMeasureComplete: (e) => {
      if (e.mode === 'area') {
        console.log(`Field size: ${e.displayValue}`);
        // e.g., "Field size: 42.50 acres"
      }
    },
  }}
/>
```

### Hectares

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  measure={{
    enabled: true,
    distanceUnit: 'metric',
    areaUnit: 'hectares',
  }}
/>
```

### Custom Styling

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  measure={{
    enabled: true,
    color: '#00FF00',      // Green measurement lines
    position: 'topright',
    title: 'Field Measurement',
    collapsed: false,      // Always expanded
  }}
/>
```

### With Event Handling

```tsx
import { Map } from '@acreblitz/react-components';
import type { MeasureCompleteEvent } from '@acreblitz/react-components';

function MeasurementMap() {
  const handleMeasureComplete = (e: MeasureCompleteEvent) => {
    console.log(`${e.mode} measurement: ${e.displayValue}`);
    console.log(`Raw value: ${e.value}`);
    console.log(`Points: ${e.points.length}`);

    // Example: Save measurement to state or backend
    if (e.mode === 'area') {
      // Convert to acres if needed
      const sqMeters = e.value;
      const acres = sqMeters / 4046.8564224;
      console.log(`Area in acres: ${acres.toFixed(2)}`);
    }
  };

  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      height="500px"
      measure={{
        enabled: true,
        areaUnit: 'acres',
      }}
      eventHandlers={{
        onMeasureComplete: handleMeasureComplete,
      }}
    />
  );
}
```

### Combined with Drawing Tools

```tsx
<Map
  center={[39.7456, -97.0892]}
  zoom={15}
  height="500px"
  measure={{
    enabled: true,
    position: 'topleft',
    areaUnit: 'acres',
  }}
  drawing={{
    enabled: true,
    position: 'topright',
  }}
/>
```

## How to Use

### Distance Measurement

1. Hover over the measurement control to expand it
2. Click "Distance measurement"
3. Click on the map to place the starting point
4. Continue clicking to add more points
5. **Double-click** or **right-click** to finish
6. The total distance is displayed at the last point
7. Click the **X** on the label to clear the measurement

### Area Measurement

1. Hover over the measurement control to expand it
2. Click "Area measurement"
3. Click on the map to place polygon vertices (minimum 3 points)
4. **Double-click** or **right-click** to close the polygon
5. The area is displayed inside the polygon
6. Click the **X** on the label to clear the measurement

## Unit Display

### Distance Units

| Unit | Small Display | Large Display |
|------|---------------|---------------|
| `metric` | `X m` | `X.XX km` |
| `imperial` | `X ft` | `X.XX mi` |

Threshold: 1000m (metric) or 5280ft (imperial)

### Area Units

| Unit | Small Display | Large Display |
|------|---------------|---------------|
| `metric` | `X m²` | `X.XX km²` |
| `imperial` | `X ft²` | `X.XX mi²` |
| `acres` | `X ft²` | `X.XX acres` |
| `hectares` | `X m²` | `X.XX ha` |

Small area threshold varies by unit system.

## Styling

The plugin uses CSS classes for customization:

```css
/* Control container */
.leaflet-control-measure { }
.leaflet-measure-toggle { }
.leaflet-measure-contents { }
.leaflet-measure-expanded { }

/* Action buttons */
.leaflet-measure-actions { }
.leaflet-measure-action { }

/* Measurement labels */
.leaflet-measure-lable { }
.leaflet-measure-lable .content { }
.leaflet-measure-lable .close { }

/* Active measurement cursor */
.leaflet-measure-map { }
```

### Custom CSS Example

```css
/* Change measurement line color via CSS */
.leaflet-measure-map {
  cursor: crosshair;
}

/* Style the measurement labels */
.leaflet-measure-lable {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* Style the close button */
.leaflet-measure-lable .close {
  margin-left: 8px;
  cursor: pointer;
}
```

## MeasureControl Component

For advanced use cases, you can use the MeasureControl component directly inside a react-leaflet MapContainer:

```tsx
import { MapContainer, TileLayer } from 'react-leaflet';
import { MeasureControl } from '@acreblitz/react-components';

function CustomMap() {
  return (
    <MapContainer center={[39.7456, -97.0892]} zoom={15}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MeasureControl
        position="topleft"
        color="#FF0080"
        distanceUnit="imperial"
        areaUnit="acres"
      />
    </MapContainer>
  );
}
```

### MeasureControl Props

```typescript
interface MeasureControlProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  color?: string;
  title?: string;
  collapsed?: boolean;
  distanceUnit?: DistanceUnit;
  areaUnit?: AreaUnit;
}
```

## Conversion Constants

The plugin uses these conversion factors:

```typescript
// Distance
const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;

// Area
const SQ_METERS_PER_SQ_FOOT = 0.09290304;
const SQ_METERS_PER_SQ_MILE = 2589988.11;
const SQ_METERS_PER_ACRE = 4046.8564224;
const SQ_METERS_PER_HECTARE = 10000;
```

## Accuracy

Measurements use the Haversine formula for geodesic calculations, accounting for Earth's curvature. The calculations use Earth's equatorial radius (6,378,137 meters).

**Note**: For very large areas or near the poles, there may be slight variations from professional surveying tools.

## Browser Support

The measurement plugin works in all modern browsers. Touch support is available for mobile devices, though measurement on mobile can be challenging due to the precision required.

## Troubleshooting

### Measurements Not Appearing

1. Ensure `measure.enabled` is set to `true`:
   ```tsx
   <Map measure={{ enabled: true }} />
   ```

2. Check that CSS is imported:
   ```tsx
   import '@acreblitz/react-components/styles.css';
   ```

### Control Not Visible

1. Check the `position` prop doesn't conflict with other controls
2. Verify the map container has sufficient size

### Incorrect Units

Ensure you're using valid unit values:
```tsx
// Distance: 'metric' | 'imperial'
// Area: 'metric' | 'imperial' | 'acres' | 'hectares'
```

## Related

- [Map Component](../map.md) - Main map documentation
- [Click Forecast Plugin](./click-forecast.md) - 48-hour weather forecast on click
- [Drawing Tools](../map.md#with-drawing-tools) - Shape drawing and editing
