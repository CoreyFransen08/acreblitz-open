# Data Overlays

Interactive feature-based data layers for the Map component. Data overlays display geographic features (polygons, lines, points) from various data sources with support for selection, tooltips, and custom styling.

## Overview

Data overlays are distinct from tile layers (satellite imagery, street maps). They render vector features that users can interact with:

- **Click to select** features
- **Hover for tooltips** with property details
- **Custom styling** based on feature properties
- **Event callbacks** for integration with your app

## Available Overlays

| Overlay | Data Source | Min Zoom | Description |
|---------|-------------|----------|-------------|
| [SSURGO Soil](./soil-overlay.md) | USDA NRCS WFS | 12 | Soil polygons with drainage, farmland class, hydric rating |
| [3DHP Hydro](./hydro-overlay.md) | USGS 3DHP | 14 | Streams, rivers, lakes, and drainage areas |

## Quick Start

```tsx
import { Map, SSURGO_OVERLAY_CONFIG, HYDRO_3DHP_OVERLAY_CONFIG } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function MyMap() {
  return (
    <Map
      center={[39.7456, -97.0892]}
      zoom={15}
      height="500px"
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
        onSoilFeatureClick: (e) => {
          console.log('Soil:', e.feature.properties.muname);
        },
        onHydroFeatureClick: (e) => {
          console.log('Hydro:', e.feature.properties.gnis_name);
        },
      }}
    />
  );
}
```

## DataOverlayProps

Configure data overlays via the `dataOverlays` prop on the Map component:

```typescript
interface DataOverlayProps {
  /** Enable data overlay system */
  enabled?: boolean;

  /** Overlay configurations */
  overlays?: AnyDataOverlayConfig[];

  /** Default visibility state */
  defaultVisibility?: { [overlayId: string]: boolean };

  /** Show the overlay control panel */
  showPanel?: boolean;

  /** Panel configuration */
  panelConfig?: {
    position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
    collapsed?: boolean;
    title?: string;
  };
}
```

## Base Overlay Configuration

All overlays share these base configuration options:

```typescript
interface DataOverlayConfig {
  /** Unique identifier */
  id: string;

  /** Display name in panel */
  name: string;

  /** Data source type */
  type: 'wfs' | 'esri-feature' | 'geojson';

  /** Visible by default */
  defaultVisible?: boolean;

  /** Minimum zoom to display (saves bandwidth) */
  minZoom?: number;

  /** Maximum zoom to display */
  maxZoom?: number;

  /** Allow clicking to select features */
  selectable?: boolean;

  /** Single-select mode (deselects previous on new selection) */
  singleSelect?: boolean;

  /** Show tooltips on hover */
  showTooltips?: boolean;

  /** Category for panel grouping */
  category?: string;
}
```

## Event Handlers

Add event handlers via the Map's `eventHandlers` prop:

```tsx
<Map
  dataOverlays={{ enabled: true, overlays: [SSURGO_OVERLAY_CONFIG, HYDRO_3DHP_OVERLAY_CONFIG] }}
  eventHandlers={{
    // Soil events
    onSoilFeatureClick: (e: SoilFeatureClickEvent) => {
      console.log('Soil feature:', e.feature);
      console.log('Click location:', e.latlng);
    },
    onSoilFeatureSelect: (e: SoilFeatureSelectEvent) => {
      console.log('Selected soil:', e.selectedFeatures);
      console.log('Action:', e.action); // 'add' or 'remove'
    },

    // Hydro events
    onHydroFeatureClick: (e: HydroFeatureClickEvent) => {
      console.log('Hydro feature:', e.feature);
      console.log('Feature type:', e.feature.featureType);
    },
    onHydroFeatureSelect: (e: HydroFeatureSelectEvent) => {
      console.log('Selected hydro:', e.selectedFeatures);
      console.log('Action:', e.action); // 'add' or 'remove'
    },
  }}
/>
```

### Event Types

```typescript
// Soil events
interface SoilFeatureClickEvent {
  feature: SoilFeature;
  latlng: { lat: number; lng: number };
  originalEvent: unknown;
}

interface SoilFeatureSelectEvent {
  selectedFeatures: SoilFeature[];
  changedFeature: SoilFeature;
  action: 'add' | 'remove';
}

// Hydro events
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

## Using the Context

Access overlay state programmatically with the `useDataOverlay` hook:

```tsx
import { useDataOverlay } from '@acreblitz/react-components';

function SoilInfo() {
  const {
    selection,
    visibility,
    toggleOverlay,
    clearSelection
  } = useDataOverlay();

  const selectedSoil = selection.soilFeatures;

  return (
    <div>
      <p>{selectedSoil.length} soil features selected</p>

      <button onClick={() => toggleOverlay('ssurgo-soil')}>
        {visibility['ssurgo-soil'] ? 'Hide' : 'Show'} Soil Layer
      </button>

      <button onClick={() => clearSelection('ssurgo-soil')}>
        Clear Selection
      </button>

      {selectedSoil.map((feature) => (
        <div key={feature.id}>
          <strong>{feature.properties.muname}</strong>
          <p>Drainage: {feature.properties.drclassdcd}</p>
        </div>
      ))}
    </div>
  );
}
```

### Context API

```typescript
interface DataOverlayContextValue {
  // State
  overlays: AnyDataOverlayConfig[];
  visibility: { [overlayId: string]: boolean };
  selection: {
    soilFeatures: SoilFeature[];
    hydroFeatures: HydroFeature[];
    [overlayId: string]: unknown[];
  };
  loading: { [overlayId: string]: boolean };
  errors: { [overlayId: string]: Error | null };

  // Actions
  toggleOverlay: (overlayId: string) => void;
  setOverlayVisible: (overlayId: string, visible: boolean) => void;
  selectFeature: (overlayId: string, feature: SoilFeature | HydroFeature) => void;
  replaceSelection: (overlayId: string, feature: SoilFeature | HydroFeature) => void;
  deselectFeature: (overlayId: string, featureId: string) => void;
  clearSelection: (overlayId: string) => void;
  clearAllSelections: () => void;
}
```

## Custom Overlay Integration

For custom data sources, you can create your own overlay configuration:

```tsx
import { Map } from '@acreblitz/react-components';
import type { GeoJSONOverlayConfig } from '@acreblitz/react-components';

const myOverlay: GeoJSONOverlayConfig = {
  id: 'my-fields',
  name: 'My Fields',
  type: 'geojson',
  data: myGeoJSONData, // or async function
  selectable: true,
  showTooltips: true,
  defaultVisible: true,
};

<Map
  dataOverlays={{
    enabled: true,
    overlays: [myOverlay],
  }}
/>
```

## Exports

```tsx
// Components
import {
  Map,
  DataOverlayProvider,
  DataOverlayPanel,
  SoilLayer,
  HydroLayer,
} from '@acreblitz/react-components';

// Hooks
import {
  useDataOverlay,
  useDataOverlaySafe,
} from '@acreblitz/react-components';

// Pre-configured overlays
import {
  SSURGO_OVERLAY_CONFIG,
  HYDRO_3DHP_OVERLAY_CONFIG,
} from '@acreblitz/react-components';

// Soil utilities
import {
  fetchWFSFeatures,
  buildWFSUrl,
  getSoilStyle,
  getSelectedSoilStyle,
  buildSoilTooltip,
  formatSoilProperty,
} from '@acreblitz/react-components';

// Hydro utilities
import {
  fetchHydroFeatures,
  fetchESRIFeatures,
  buildESRIQueryUrl,
  HYDRO_3DHP_SERVER_URL,
  HYDRO_LAYER_IDS,
  getHydroStyle,
  getSelectedHydroStyle,
  getHoverHydroStyle,
  buildHydroTooltip,
  getHydroTypeLabel,
} from '@acreblitz/react-components';

// Soil types
import type {
  DataOverlayProps,
  SoilOverlayConfig,
  SoilFeature,
  SoilFeatureProperties,
  SoilFeatureClickEvent,
  SoilFeatureSelectEvent,
} from '@acreblitz/react-components';

// Hydro types
import type {
  HydroOverlayConfig,
  HydroFeature,
  HydroFeatureProperties,
  HydroFeatureType,
  HydroFeatureClickEvent,
  HydroFeatureSelectEvent,
  HydroFeaturesData,
} from '@acreblitz/react-components';
```

## Related

- [SSURGO Soil Overlay](./soil-overlay.md) - Detailed soil data documentation
- [3DHP Hydro Overlay](./hydro-overlay.md) - Detailed hydro features documentation
- [Map Component](../map.md) - Main map documentation
