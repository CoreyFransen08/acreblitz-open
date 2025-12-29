# useMapInstance Hook

A React hook for programmatic control of a Map component instance.

## Basic Usage

```tsx
import { useRef } from 'react';
import { Map, useMapInstance } from '@acreblitz/react-components';
import type { Map as LeafletMap } from 'leaflet';

function MyMapComponent() {
  const mapRef = useRef<LeafletMap>(null);
  const { flyTo, isReady } = useMapInstance({ mapRef });

  const handleGoToNewYork = () => {
    flyTo([40.7128, -74.0060], 12);
  };

  return (
    <div>
      <button onClick={handleGoToNewYork} disabled={!isReady}>
        Go to New York
      </button>
      <Map
        ref={mapRef}
        center={[39.7456, -97.0892]}
        zoom={13}
        height="500px"
      />
    </div>
  );
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mapRef` | `RefObject<LeafletMap>` | - | Reference to the Map component |

## Return Value

```typescript
interface UseMapInstanceResult {
  map: LeafletMap | null;
  isReady: boolean;
  flyTo: (latlng: LatLngExpression, zoom?: number) => void;
  setView: (latlng: LatLngExpression, zoom?: number) => void;
  fitBounds: (bounds: LatLngBoundsExpression, options?: { padding?: [number, number] }) => void;
  getCenter: () => { lat: number; lng: number } | null;
  getZoom: () => number | null;
  getBounds: () => LatLngBounds | null;
  invalidateSize: () => void;
  getDrawnItems: () => FeatureGroup | null;
  addGeoJSON: (geoJSON: GeoJSON.FeatureCollection) => void;
  clearDrawnItems: () => void;
  exportGeoJSON: () => GeoJSON.FeatureCollection | null;
}
```

### Navigation Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `flyTo` | `latlng`, `zoom?` | Animate to location |
| `setView` | `latlng`, `zoom?` | Instantly set view |
| `fitBounds` | `bounds`, `options?` | Fit view to bounds |
| `invalidateSize` | - | Recalculate map size after container resize |

### Getter Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getCenter` | `{ lat, lng } \| null` | Current map center |
| `getZoom` | `number \| null` | Current zoom level |
| `getBounds` | `LatLngBounds \| null` | Current visible bounds |
| `getDrawnItems` | `FeatureGroup \| null` | Layer containing drawn shapes |

### Drawing Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `addGeoJSON` | `geoJSON` | Add GeoJSON shapes to map |
| `clearDrawnItems` | - | Remove all drawn shapes |
| `exportGeoJSON` | - | Export shapes as GeoJSON |

## Examples

### Animated Navigation

```tsx
const { flyTo, setView, isReady } = useMapInstance({ mapRef });

// Animated fly to location
const handleFlyTo = () => {
  flyTo([40.7128, -74.0060], 12);
};

// Instant view change
const handleSetView = () => {
  setView([34.0522, -118.2437], 10);
};
```

### Fit to Bounds

```tsx
const { fitBounds, isReady } = useMapInstance({ mapRef });

const handleFitToField = () => {
  const fieldBounds: LatLngBoundsExpression = [
    [39.74, -97.09], // Southwest
    [39.75, -97.08], // Northeast
  ];
  fitBounds(fieldBounds, { padding: [50, 50] });
};
```

### Get Current View State

```tsx
const { getCenter, getZoom, getBounds } = useMapInstance({ mapRef });

const handleLogState = () => {
  const center = getCenter();
  const zoom = getZoom();
  const bounds = getBounds();

  console.log('Center:', center);
  console.log('Zoom:', zoom);
  console.log('Bounds:', bounds);
};
```

### Handle Container Resize

```tsx
const { invalidateSize } = useMapInstance({ mapRef });

// Call when container size changes
useEffect(() => {
  invalidateSize();
}, [sidebarOpen]);
```

### Export Drawn Shapes

```tsx
const { exportGeoJSON, isReady } = useMapInstance({ mapRef });

const handleSave = async () => {
  const geoJSON = exportGeoJSON();

  if (geoJSON && geoJSON.features.length > 0) {
    await saveToDatabase(geoJSON);
    console.log('Saved', geoJSON.features.length, 'shapes');
  }
};
```

### Load Existing Shapes

```tsx
const { addGeoJSON, clearDrawnItems, isReady } = useMapInstance({ mapRef });

// Load shapes from database
useEffect(() => {
  if (isReady && savedGeoJSON) {
    clearDrawnItems();
    addGeoJSON(savedGeoJSON);
  }
}, [isReady, savedGeoJSON]);
```

### Complete Example with Save/Load

```tsx
import { useRef, useEffect, useState } from 'react';
import { Map, useMapInstance } from '@acreblitz/react-components';
import type { Map as LeafletMap } from 'leaflet';

function FieldEditor({ fieldId }: { fieldId: string }) {
  const mapRef = useRef<LeafletMap>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    flyTo,
    fitBounds,
    exportGeoJSON,
    addGeoJSON,
    clearDrawnItems,
    isReady,
  } = useMapInstance({ mapRef });

  // Load existing field boundaries
  useEffect(() => {
    if (!isReady || !fieldId) return;

    async function loadField() {
      const field = await fetchField(fieldId);

      if (field.boundaries) {
        clearDrawnItems();
        addGeoJSON(field.boundaries);

        // Fit map to field bounds
        if (field.bounds) {
          fitBounds(field.bounds);
        }
      }
    }

    loadField();
  }, [isReady, fieldId]);

  const handleSave = async () => {
    const geoJSON = exportGeoJSON();
    if (!geoJSON) return;

    setIsSaving(true);
    try {
      await updateField(fieldId, { boundaries: geoJSON });
      alert('Field boundaries saved!');
    } catch (error) {
      alert('Failed to save: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCenter = () => {
    flyTo([39.7456, -97.0892], 15);
  };

  return (
    <div className="field-editor">
      <div className="toolbar">
        <button onClick={handleCenter} disabled={!isReady}>
          Center Map
        </button>
        <button onClick={handleSave} disabled={!isReady || isSaving}>
          {isSaving ? 'Saving...' : 'Save Boundaries'}
        </button>
      </div>

      <Map
        ref={mapRef}
        center={[39.7456, -97.0892]}
        zoom={15}
        height="500px"
        drawing={{
          enabled: true,
          draw: {
            polygon: true,
            rectangle: true,
            marker: false,
            polyline: false,
            circle: false,
            circlemarker: false,
          },
        }}
        eventHandlers={{
          onDrawCreated: () => {
            console.log('Shape added');
          },
        }}
      />
    </div>
  );
}
```

## Best Practices

1. **Check `isReady` before calling methods**: The map may not be initialized immediately.

```tsx
const handleAction = () => {
  if (!isReady) {
    console.warn('Map not ready');
    return;
  }
  flyTo([40.7, -74.0]);
};
```

2. **Use `flyTo` for user-initiated navigation**: Provides better UX with animation.

3. **Use `setView` for programmatic changes**: Faster for automated updates.

4. **Call `invalidateSize` after container changes**: Leaflet needs to recalculate dimensions.

5. **Export GeoJSON for persistence**: Use `exportGeoJSON` to save drawn shapes to your backend.

## Related

- [Map Component](../components/map.md) - The Map component this hook controls
- [Map Utilities](../README.md#map-utilities) - Layer configuration helpers
