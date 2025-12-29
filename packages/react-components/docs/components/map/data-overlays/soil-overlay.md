# SSURGO Soil Overlay

Display USDA NRCS SSURGO (Soil Survey Geographic Database) soil data as interactive polygons on the map.

## Overview

The SSURGO soil overlay fetches soil map unit polygons from the USDA's Web Feature Service (WFS) and displays them with:

- **Interactive tooltips** showing soil properties on hover
- **Click to select** polygons (single-select by default)
- **Color-coded styling** by drainage class
- **Farmer-relevant properties** displayed in tooltips

## Data Source

- **Endpoint**: `https://sdmdataaccess.nrcs.usda.gov/Spatial/SDMWGS84Geographic.wfs`
- **Layer**: `mapunitpolyextended` (includes aggregated soil properties)
- **Format**: GML2 (parsed to GeoJSON client-side)
- **Zoom requirement**: Data loads at zoom level 12+

## Quick Start

```tsx
import { Map, SSURGO_OVERLAY_CONFIG } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function SoilMap() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={14}
      height="500px"
      dataOverlays={{
        enabled: true,
        showPanel: true,
        overlays: [SSURGO_OVERLAY_CONFIG],
        defaultVisibility: {
          'ssurgo-soil': true,
        },
      }}
      eventHandlers={{
        onSoilFeatureClick: (e) => {
          console.log('Soil name:', e.feature.properties.muname);
          console.log('Drainage:', e.feature.properties.drclassdcd);
        },
      }}
    />
  );
}
```

## SSURGO_OVERLAY_CONFIG

The pre-configured overlay with sensible defaults:

```typescript
const SSURGO_OVERLAY_CONFIG: SoilOverlayConfig = {
  id: 'ssurgo-soil',
  name: 'SSURGO Soil Data',
  type: 'wfs',
  url: 'https://sdmdataaccess.nrcs.usda.gov/Spatial/SDMWGS84Geographic.wfs',
  typeName: 'mapunitpolyextended',
  outputFormat: 'GML2',
  selectable: true,
  singleSelect: true,  // Click new polygon deselects previous
  showTooltips: true,
  minZoom: 12,
  maxZoom: 19,
  category: 'Soil',
  displayProperties: [
    'drainageClass',
    'farmlandClassification',
    'landCapabilityClass',
    'hydricRating'
  ],
  defaultVisible: false,
};
```

## Soil Properties

### Properties Displayed in Tooltip

| Display Name | SSURGO Property | Description |
|--------------|-----------------|-------------|
| Soil Name (title) | `muname` | Map unit name (e.g., "Harney silt loam") |
| Drainage | `drclassdcd` | Dominant drainage class |
| Hydric Rating | `hydgrpdcd` | Hydrologic group (A, B, C, D) with runoff level |
| Slope | `slopegradwta` | Weighted average slope percentage |
| Land Capability | `niccdcd` | Non-irrigated capability class (1-8) |
| Available Water | `aws0100wta` | Available water storage 0-100cm depth |
| Flood Risk | `flodfreqdcd` | Flood frequency (shown only if not "None") |

### Drainage Classes

| Value | Description |
|-------|-------------|
| Excessively drained | Water removed very rapidly |
| Somewhat excessively drained | Water removed rapidly |
| Well drained | Water removed readily |
| Moderately well drained | Water removed somewhat slowly |
| Somewhat poorly drained | Water removed slowly |
| Poorly drained | Water removed very slowly |
| Very poorly drained | Water removed extremely slowly |

### Hydrologic Groups

| Group | Runoff Level | Description |
|-------|--------------|-------------|
| A | Low | High infiltration, deep well-drained soils |
| B | Moderate | Moderate infiltration |
| C | Moderate-High | Slow infiltration |
| D | High | Very slow infiltration, high runoff potential |

### Land Capability Classes

Classes 1-8 indicate suitability for cultivation:
- **Class 1-2**: Few limitations, suitable for cultivation
- **Class 3-4**: Moderate limitations
- **Class 5-6**: Severe limitations, generally unsuitable for cultivation
- **Class 7-8**: Very severe limitations, not suitable for cultivation

## Custom Configuration

Override defaults by spreading the config:

```tsx
import { Map, SSURGO_OVERLAY_CONFIG } from '@acreblitz/react-components';

const customSoilConfig = {
  ...SSURGO_OVERLAY_CONFIG,
  defaultVisible: true,      // Show by default
  singleSelect: false,       // Allow multi-select
  minZoom: 10,               // Load at lower zoom (more data!)
  displayProperties: [       // Custom tooltip properties
    'drainageClass',
    'slope',
    'awc',
  ],
};

<Map
  dataOverlays={{
    enabled: true,
    overlays: [customSoilConfig],
  }}
/>
```

## Custom Styling

### Style by Property

```tsx
import { Map, SSURGO_OVERLAY_CONFIG, getSoilStyleByFarmland } from '@acreblitz/react-components';

const styledConfig = {
  ...SSURGO_OVERLAY_CONFIG,
  style: (feature) => getSoilStyleByFarmland(feature),
};
```

### Custom Style Function

```tsx
const customStyledConfig = {
  ...SSURGO_OVERLAY_CONFIG,
  style: (feature) => {
    const drainage = feature.properties.drclassdcd;

    // Color by drainage class
    const colors = {
      'Well drained': '#22c55e',
      'Moderately well drained': '#84cc16',
      'Somewhat poorly drained': '#eab308',
      'Poorly drained': '#f97316',
      'Very poorly drained': '#ef4444',
    };

    return {
      fillColor: colors[drainage] || '#6b7280',
      fillOpacity: 0.4,
      color: '#374151',
      weight: 1,
    };
  },
  selectedStyle: {
    fillColor: '#3b82f6',
    fillOpacity: 0.6,
    color: '#1d4ed8',
    weight: 2,
  },
  hoverStyle: {
    fillOpacity: 0.6,
    weight: 2,
  },
};
```

## Working with Selected Features

### Access Selection via Events

```tsx
<Map
  dataOverlays={{
    enabled: true,
    overlays: [SSURGO_OVERLAY_CONFIG],
  }}
  eventHandlers={{
    onSoilFeatureSelect: (e) => {
      // Single-select: array will have 0 or 1 feature
      const selected = e.selectedFeatures[0];

      if (selected) {
        console.log('Selected:', selected.properties.muname);
        console.log('Drainage:', selected.properties.drclassdcd);
        console.log('Farmland:', selected.properties.farmlndcl);

        // Access geometry for analysis
        console.log('Geometry:', selected.geometry);
      }
    },
  }}
/>
```

### Access Selection via Context

```tsx
import { useDataOverlay } from '@acreblitz/react-components';

function SoilDetails() {
  const { selection, clearSelection } = useDataOverlay();
  const selectedSoil = selection.soilFeatures[0];

  if (!selectedSoil) {
    return <p>Click a soil polygon to see details</p>;
  }

  const props = selectedSoil.properties;

  return (
    <div>
      <h3>{props.muname}</h3>
      <dl>
        <dt>Map Unit Key</dt>
        <dd>{props.mukey}</dd>

        <dt>Drainage Class</dt>
        <dd>{props.drclassdcd || 'N/A'}</dd>

        <dt>Farmland Classification</dt>
        <dd>{props.farmlndcl || 'N/A'}</dd>

        <dt>Slope</dt>
        <dd>{props.slopegradwta ? `${props.slopegradwta}%` : 'N/A'}</dd>
      </dl>

      <button onClick={() => clearSelection('ssurgo-soil')}>
        Clear Selection
      </button>
    </div>
  );
}
```

## Custom Data Fetching

For caching with React Query or custom fetch logic:

```tsx
import { useQuery } from '@tanstack/react-query';
import { Map, SoilLayer, DataOverlayProvider, fetchWFSFeatures } from '@acreblitz/react-components';

function CachedSoilMap() {
  const [bounds, setBounds] = useState(null);

  const { data: soilData } = useQuery({
    queryKey: ['soil', bounds?.toBBoxString()],
    queryFn: () => fetchWFSFeatures(SSURGO_OVERLAY_CONFIG, bounds),
    enabled: !!bounds,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={14}
      eventHandlers={{
        onMoveEnd: (e) => setBounds(e.bounds),
      }}
    >
      <DataOverlayProvider overlays={[SSURGO_OVERLAY_CONFIG]}>
        <SoilLayer
          config={SSURGO_OVERLAY_CONFIG}
          visible={true}
          fetchFeatures={async () => soilData}
        />
      </DataOverlayProvider>
    </Map>
  );
}
```

## Utilities

### Format Soil Properties

```tsx
import { formatSoilProperty } from '@acreblitz/react-components';

formatSoilProperty('slope', 3.5);      // "3.5%"
formatSoilProperty('awc', 15.2);       // "15.2 cm"
formatSoilProperty('landCapabilityClass', '2'); // "Class 2"
formatSoilProperty('hydricRating', 'B');        // "B (Moderate runoff)"
```

### Build Custom Tooltips

```tsx
import { buildSoilTooltip, buildSoilSummary } from '@acreblitz/react-components';

// Full HTML tooltip
const tooltip = buildSoilTooltip(feature.properties, [
  'drainageClass',
  'slope',
  'hydricRating',
]);

// Simple text summary
const summary = buildSoilSummary(feature.properties);
// "Harney silt loam - Well drained, B (Moderate runoff)"
```

### Direct WFS Access

```tsx
import { fetchWFSFeatures, buildWFSUrl, SSURGO_OVERLAY_CONFIG } from '@acreblitz/react-components';

// Build URL for debugging
const url = buildWFSUrl(SSURGO_OVERLAY_CONFIG, mapBounds);
console.log('WFS URL:', url);

// Fetch features directly
const geojson = await fetchWFSFeatures(
  SSURGO_OVERLAY_CONFIG,
  mapBounds,
  abortController.signal
);
console.log(`Fetched ${geojson.features.length} soil polygons`);
```

## TypeScript Types

```typescript
import type {
  SoilOverlayConfig,
  SoilFeature,
  SoilFeatureProperties,
  SoilProperty,
  DrainageClass,
  HydricRating,
  SoilFeatureClickEvent,
  SoilFeatureSelectEvent,
} from '@acreblitz/react-components';

// Property type
type SoilProperty =
  | 'drainageClass'
  | 'farmlandClassification'
  | 'landCapabilityClass'
  | 'hydricRating'
  | 'soilTexture'
  | 'slope'
  | 'awc';

// Feature type
interface SoilFeature {
  id: string;
  geometry: GeoJSON.Geometry;
  properties: SoilFeatureProperties;
}

interface SoilFeatureProperties {
  mukey: string;      // Map unit key (primary identifier)
  musym: string;      // Map unit symbol
  muname: string;     // Map unit name
  drclassdcd?: string;    // Drainage class
  farmlndcl?: string;     // Farmland classification
  hydgrpdcd?: string;     // Hydrologic group
  slopegradwta?: number;  // Slope percentage
  aws0100wta?: number;    // Available water storage
  niccdcd?: string;       // Land capability class
  flodfreqdcd?: string;   // Flood frequency
  [key: string]: unknown; // Additional WFS properties
}
```

## Performance Considerations

- **Zoom threshold**: Data only loads at zoom 12+ to limit requests
- **Viewport-based loading**: Only fetches polygons in current view
- **Request deduplication**: Skips fetch if bounds haven't changed
- **Abort on navigation**: Cancels pending requests when panning

For high-traffic applications, consider:

1. **React Query caching** (see Custom Data Fetching above)
2. **Server-side proxy** to cache WFS responses
3. **Increasing minZoom** for less frequent requests

## Related

- [Data Overlays Overview](./index.md)
- [Map Component](../map.md)
