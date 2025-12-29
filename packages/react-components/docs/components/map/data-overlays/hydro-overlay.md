# 3DHP Hydro Overlay

Display USGS 3DHP (3D Hydrography Program) hydrographic features as interactive layers on the map.

## Overview

The 3DHP hydro overlay fetches hydrographic features from the USGS National Map and displays:

- **Flowlines**: Streams, rivers, canals, and ditches
- **Waterbodies**: Lakes, ponds, and reservoirs
- **Drainage Areas**: Watershed boundaries

Features include:

- **Interactive tooltips** showing feature names and types
- **Click to select** features (single-select by default)
- **Color-coded styling** by feature type
- **Proper z-ordering** above soil layers

## Data Source

- **Endpoint**: `https://hydro.nationalmap.gov/arcgis/rest/services/3DHP_all/FeatureServer`
- **Format**: ESRI REST API (GeoJSON response)
- **Zoom requirement**: Data loads at zoom level 14+

### Layer IDs

| Layer ID | Name | Type | Description |
|----------|------|------|-------------|
| 50 | Flowline | Line | Streams, rivers, canals |
| 60 | Waterbody | Polygon | Lakes, ponds, reservoirs |
| 70 | DrainageArea | Polygon | Drainage basins |

## Quick Start

```tsx
import { Map, HYDRO_3DHP_OVERLAY_CONFIG } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function HydroMap() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      height="500px"
      dataOverlays={{
        enabled: true,
        showPanel: true,
        overlays: [HYDRO_3DHP_OVERLAY_CONFIG],
        defaultVisibility: {
          '3dhp-hydro': true,
        },
      }}
      eventHandlers={{
        onHydroFeatureClick: (e) => {
          console.log('Feature type:', e.feature.featureType);
          console.log('Name:', e.feature.properties.gnis_name);
        },
      }}
    />
  );
}
```

## HYDRO_3DHP_OVERLAY_CONFIG

The pre-configured overlay with sensible defaults:

```typescript
const HYDRO_3DHP_OVERLAY_CONFIG: HydroOverlayConfig = {
  id: '3dhp-hydro',
  name: 'Hydro Features (3DHP)',
  type: 'esri-feature',
  url: 'https://hydro.nationalmap.gov/arcgis/rest/services/3DHP_all/FeatureServer',
  layerIds: [50, 60, 70],
  selectable: true,
  singleSelect: true,   // Click new feature deselects previous
  showTooltips: true,
  minZoom: 14,
  maxZoom: 19,
  category: 'Hydrology',
  defaultVisible: false,
};
```

## Feature Types

### Flowlines (Layer 50)

Linear water features including:

- Streams and rivers
- Canals and ditches
- Artificial paths (through waterbodies)
- Connectors and pipelines

**Default Style**: Blue lines (`#60a5fa`, weight 2)

### Waterbodies (Layer 60)

Polygon water features including:

- Lakes and ponds
- Reservoirs
- Swamps and marshes

**Default Style**: Cyan fill (`#0e7490`, 30% opacity)

### Drainage Areas (Layer 70)

Watershed boundary polygons:

- Catchment areas
- Drainage basins

**Default Style**: Purple outline (`#c084fc`, 10% fill opacity)

## Hydro Properties

### Properties Displayed in Tooltip

| Property | Description |
|----------|-------------|
| `gnis_name` | Geographic Names Information System name |
| `fcode` | Feature code (numeric) |
| `ftype` | Feature type (numeric) |
| `permanent_identifier` | Unique feature identifier |
| `objectid` | ESRI object ID |

### Common Feature Codes (fcode)

| Code | Description |
|------|-------------|
| 46000 | Stream/River |
| 46003 | Intermittent Stream |
| 46006 | Perennial Stream |
| 33600 | Canal/Ditch |
| 39000 | Lake/Pond |
| 43600 | Reservoir |

## Combining with Soil Overlay

Use both overlays together for comprehensive land analysis:

```tsx
import { Map, SSURGO_OVERLAY_CONFIG, HYDRO_3DHP_OVERLAY_CONFIG } from '@acreblitz/react-components';

function FieldAnalysisMap() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      height="600px"
      dataOverlays={{
        enabled: true,
        showPanel: true,
        overlays: [SSURGO_OVERLAY_CONFIG, HYDRO_3DHP_OVERLAY_CONFIG],
        defaultVisibility: {
          'ssurgo-soil': true,
          '3dhp-hydro': true,
        },
      }}
      eventHandlers={{
        onSoilFeatureClick: (e) => console.log('Soil:', e.feature.properties.muname),
        onHydroFeatureClick: (e) => console.log('Hydro:', e.feature.properties.gnis_name),
      }}
    />
  );
}
```

**Layer Ordering**: Hydro features always render above soil polygons:

| Layer | z-index |
|-------|---------|
| Soil polygons | 450 |
| Drainage areas | 460 |
| Waterbodies | 461 |
| Flowlines | 462 |

## Event Handlers

### Click Events

```tsx
<Map
  dataOverlays={{ enabled: true, overlays: [HYDRO_3DHP_OVERLAY_CONFIG] }}
  eventHandlers={{
    onHydroFeatureClick: (e: HydroFeatureClickEvent) => {
      console.log('Feature type:', e.feature.featureType); // 'flowline' | 'waterbody' | 'drainagearea'
      console.log('Name:', e.feature.properties.gnis_name);
      console.log('Click location:', e.latlng);
    },
  }}
/>
```

### Selection Events

```tsx
<Map
  dataOverlays={{ enabled: true, overlays: [HYDRO_3DHP_OVERLAY_CONFIG] }}
  eventHandlers={{
    onHydroFeatureSelect: (e: HydroFeatureSelectEvent) => {
      console.log('Selected features:', e.selectedFeatures);
      console.log('Changed feature:', e.changedFeature);
      console.log('Action:', e.action); // 'add' or 'remove'
    },
  }}
/>
```

### Event Types

```typescript
interface HydroFeatureClickEvent {
  feature: HydroFeature;
  latlng: { lat: number; lng: number };
  originalEvent: unknown;
}

interface HydroFeatureSelectEvent {
  selectedFeatures: HydroFeature[];
  changedFeature: HydroFeature;
  action: 'add' | 'remove';
}
```

## Custom Configuration

Override defaults by spreading the config:

```tsx
import { Map, HYDRO_3DHP_OVERLAY_CONFIG } from '@acreblitz/react-components';

const customHydroConfig = {
  ...HYDRO_3DHP_OVERLAY_CONFIG,
  defaultVisible: true,      // Show by default
  singleSelect: false,       // Allow multi-select
  minZoom: 12,               // Load at lower zoom (more data!)
  layerIds: [50, 60],        // Only flowlines and waterbodies (no drainage areas)
};

<Map
  dataOverlays={{
    enabled: true,
    overlays: [customHydroConfig],
  }}
/>
```

## Custom Styling

### Override All Styles

```tsx
const styledHydroConfig = {
  ...HYDRO_3DHP_OVERLAY_CONFIG,
  styles: {
    flowline: {
      color: '#0ea5e9',
      weight: 3,
      opacity: 0.8,
    },
    waterbody: {
      color: '#0284c7',
      weight: 1,
      fillColor: '#38bdf8',
      fillOpacity: 0.4,
    },
    drainagearea: {
      color: '#a855f7',
      weight: 1,
      fillColor: '#e9d5ff',
      fillOpacity: 0.15,
    },
  },
  selectedStyles: {
    flowline: {
      color: '#3b82f6',
      weight: 4,
    },
    waterbody: {
      fillColor: '#3b82f6',
      fillOpacity: 0.5,
    },
    drainagearea: {
      fillColor: '#3b82f6',
      fillOpacity: 0.3,
    },
  },
};
```

## Working with Selected Features

### Access Selection via Context

```tsx
import { useDataOverlay } from '@acreblitz/react-components';

function HydroDetails() {
  const { selection, clearSelection } = useDataOverlay();
  const selectedHydro = selection.hydroFeatures[0];

  if (!selectedHydro) {
    return <p>Click a water feature to see details</p>;
  }

  return (
    <div>
      <h3>{selectedHydro.properties.gnis_name || 'Unnamed Feature'}</h3>
      <dl>
        <dt>Type</dt>
        <dd>{selectedHydro.featureType}</dd>

        <dt>Feature Code</dt>
        <dd>{selectedHydro.properties.fcode}</dd>

        <dt>Permanent ID</dt>
        <dd>{selectedHydro.properties.permanent_identifier}</dd>
      </dl>

      <button onClick={() => clearSelection('3dhp-hydro')}>
        Clear Selection
      </button>
    </div>
  );
}
```

## Custom Data Fetching

For caching with React Query:

```tsx
import { useQuery } from '@tanstack/react-query';
import { Map, HydroLayer, DataOverlayProvider, fetchHydroFeatures, HYDRO_3DHP_OVERLAY_CONFIG } from '@acreblitz/react-components';

function CachedHydroMap() {
  const [bounds, setBounds] = useState(null);

  const { data: hydroData } = useQuery({
    queryKey: ['hydro', bounds?.toBBoxString()],
    queryFn: () => fetchHydroFeatures(HYDRO_3DHP_OVERLAY_CONFIG, bounds),
    enabled: !!bounds,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      eventHandlers={{
        onMoveEnd: (e) => setBounds(e.bounds),
      }}
    >
      <DataOverlayProvider overlays={[HYDRO_3DHP_OVERLAY_CONFIG]}>
        <HydroLayer
          config={HYDRO_3DHP_OVERLAY_CONFIG}
          visible={true}
          fetchFeatures={async () => hydroData}
        />
      </DataOverlayProvider>
    </Map>
  );
}
```

## Utilities

### Style Functions

```tsx
import {
  getFlowlineStyle,
  getWaterbodyStyle,
  getDrainageAreaStyle,
  getHydroStyle,
  getSelectedHydroStyle,
  getHoverHydroStyle,
} from '@acreblitz/react-components';

// Get default style for a feature type
const flowlineStyle = getFlowlineStyle();
const waterbodyStyle = getWaterbodyStyle();

// Get style by feature type string
const style = getHydroStyle('flowline');
const selectedStyle = getSelectedHydroStyle('waterbody');
const hoverStyle = getHoverHydroStyle('drainagearea');
```

### Tooltip & Formatting

```tsx
import {
  buildHydroTooltip,
  buildHydroSummary,
  getHydroTypeLabel,
  getHydroTypeIcon,
  formatHydroName,
} from '@acreblitz/react-components';

// Type labels
getHydroTypeLabel('flowline');     // "Stream/River"
getHydroTypeLabel('waterbody');    // "Lake/Pond"
getHydroTypeLabel('drainagearea'); // "Drainage Area"

// Icons (emoji)
getHydroTypeIcon('flowline');      // "🌊"
getHydroTypeIcon('waterbody');     // "💧"

// Format feature name
formatHydroName(properties);        // "Big Creek" or "Unnamed Stream"

// Build tooltip HTML
const tooltip = buildHydroTooltip('flowline', properties);

// Build text summary
const summary = buildHydroSummary('waterbody', properties);
// "💧 Lake Powell"
```

### Direct ESRI API Access

```tsx
import {
  fetchHydroFeatures,
  fetchESRIFeatures,
  buildESRIQueryUrl,
  HYDRO_3DHP_SERVER_URL,
  HYDRO_LAYER_IDS,
} from '@acreblitz/react-components';

// Build URL for debugging
const url = buildESRIQueryUrl(
  HYDRO_3DHP_SERVER_URL,
  HYDRO_LAYER_IDS.FLOWLINE, // 50
  mapBounds
);
console.log('ESRI Query URL:', url);

// Fetch single layer
const flowlines = await fetchESRIFeatures(
  HYDRO_3DHP_SERVER_URL,
  HYDRO_LAYER_IDS.FLOWLINE,
  mapBounds,
  abortController.signal
);

// Fetch all hydro layers
const { flowlines, waterbodies, drainageAreas } = await fetchHydroFeatures(
  HYDRO_3DHP_OVERLAY_CONFIG,
  mapBounds
);
```

## TypeScript Types

```typescript
import type {
  HydroOverlayConfig,
  HydroFeature,
  HydroFeatureProperties,
  HydroFeatureType,
  HydroFeatureClickEvent,
  HydroFeatureSelectEvent,
  HydroLayerProps,
  HydroFeaturesData,
} from '@acreblitz/react-components';

// Feature type
type HydroFeatureType = 'flowline' | 'waterbody' | 'drainagearea';

// Feature interface
interface HydroFeature {
  id: string;
  featureType: HydroFeatureType;
  geometry: GeoJSON.Geometry;
  properties: HydroFeatureProperties;
}

interface HydroFeatureProperties {
  objectid: number;
  gnis_name?: string;           // Geographic name
  permanent_identifier?: string; // Unique ID
  fcode?: number;               // Feature code
  ftype?: number;               // Feature type
  [key: string]: unknown;
}

// Data response from fetch
interface HydroFeaturesData {
  flowlines: GeoJSON.FeatureCollection;
  waterbodies: GeoJSON.FeatureCollection;
  drainageAreas: GeoJSON.FeatureCollection;
}
```

## Performance Considerations

- **Zoom threshold**: Data only loads at zoom 14+ (higher than soil at 12+)
- **Viewport-based loading**: Only fetches features in current view
- **Parallel fetching**: All three layer types load concurrently
- **Request deduplication**: Skips fetch if bounds haven't changed
- **Abort on navigation**: Cancels pending requests when panning

For high-traffic applications, consider:

1. **React Query caching** (see Custom Data Fetching above)
2. **Increasing minZoom** to 15+ for less data
3. **Limiting layerIds** to only needed feature types

## Related

- [Data Overlays Overview](./index.md)
- [SSURGO Soil Overlay](./soil-overlay.md)
- [Map Component](../map.md)
