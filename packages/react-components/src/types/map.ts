/**
 * Map Types for @acreblitz/react-components
 *
 * Leaflet-based map component with drawing and measurement tools
 */

import type {
  Map as LeafletMap,
  LatLngExpression,
  LatLngBoundsExpression,
  LatLngBounds,
  Layer,
  FeatureGroup,
  PathOptions,
} from 'leaflet';
import type {
  DataOverlayProps,
  SoilFeatureClickEvent,
  SoilFeatureSelectEvent,
  HydroFeatureClickEvent,
  HydroFeatureSelectEvent,
  OverlayVisibilityChangeEvent,
} from './dataOverlay';
import type {
  ClickForecastOptions,
  DWMLForecastData,
} from './clickForecast';

// Re-export LeafletMap type for convenience
export type { Map as LeafletMap } from 'leaflet';

// ============================================
// Layer Configuration
// ============================================

/** Configuration for a single tile layer */
export interface TileLayerConfig {
  /** Unique identifier for the layer */
  id: string;
  /** Display name in layer control */
  name: string;
  /** Tile URL template with {z}, {x}, {y} placeholders */
  url: string;
  /** Attribution text (required for most providers) */
  attribution: string;
  /** Maximum zoom level (default: 19) */
  maxZoom?: number;
  /** Minimum zoom level (default: 0) */
  minZoom?: number;
  /** Subdomains for load balancing (e.g., ['a', 'b', 'c']) */
  subdomains?: string | string[];
}

/** Configuration for map layers */
export interface LayerConfig {
  /** Base layers (radio buttons - only one active at a time) */
  baseLayers: TileLayerConfig[];
  /** Overlay layers (checkboxes - multiple can be active) */
  overlays?: TileLayerConfig[];
  /** ID of the default base layer to display */
  defaultBaseLayer?: string;
  /** IDs of overlay layers to enable by default */
  defaultOverlays?: string[];
}

// ============================================
// Drawing Configuration
// ============================================

/** Configuration for individual drawing tools */
export interface DrawToolOptions {
  /** Enable polyline drawing */
  polyline?: boolean;
  /** Enable polygon drawing */
  polygon?: boolean;
  /** Enable rectangle drawing */
  rectangle?: boolean;
  /** Enable circle drawing */
  circle?: boolean;
  /** Enable marker placement */
  marker?: boolean;
  /** Enable circle marker placement */
  circlemarker?: boolean;
}

/** Configuration for edit toolbar */
export interface DrawEditOptions {
  /** Enable shape editing */
  edit?: boolean;
  /** Enable shape deletion */
  remove?: boolean;
}

/** Drawing tools configuration */
export interface DrawingOptions {
  /** Enable drawing functionality (default: false) */
  enabled?: boolean;
  /** Position of draw controls */
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** Configure which draw tools are available (all enabled by default) */
  draw?: DrawToolOptions;
  /** Configure edit toolbar options */
  edit?: DrawEditOptions;
  /** Default path options for drawn shapes */
  shapeOptions?: PathOptions;
}

// ============================================
// Unit Configuration
// ============================================

/** Distance unit system */
export type DistanceUnit = 'metric' | 'imperial';

/** Area unit options */
export type AreaUnit = 'metric' | 'imperial' | 'acres' | 'hectares';

/** Unit configuration for map measurements and displays */
export interface MapUnits {
  /**
   * Distance units for measurements and scale
   * - 'metric': meters and kilometers
   * - 'imperial': feet and miles
   * @default 'metric'
   */
  distance?: DistanceUnit;
  /**
   * Area units for area measurements
   * - 'metric': square meters and square kilometers
   * - 'imperial': square feet and square miles
   * - 'acres': US acres (common for agriculture)
   * - 'hectares': hectares (metric land measurement)
   * @default 'metric'
   */
  area?: AreaUnit;
}

// ============================================
// Measurement Configuration
// ============================================

/** Measurement tool configuration */
export interface MeasureOptions {
  /** Enable measurement functionality (default: false) */
  enabled?: boolean;
  /** Position of measure control */
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** Color for measurement lines (default: '#FF0080') */
  color?: string;
}

// ============================================
// Mobile Configuration
// ============================================

/** Mobile-specific options */
export interface MobileOptions {
  /** Enable two-finger gesture requirement for panning (default: true) */
  gestureHandling?: boolean;
  /** Message shown when gesture handling blocks single-finger pan */
  gestureHandlingText?: string;
}

// ============================================
// Event Types
// ============================================

/** Event fired when a shape is drawn */
export interface DrawCreatedEvent {
  /** Type of shape drawn */
  layerType: 'polyline' | 'polygon' | 'rectangle' | 'circle' | 'marker' | 'circlemarker';
  /** The Leaflet layer object */
  layer: Layer;
  /** GeoJSON representation of the drawn shape */
  geoJSON: GeoJSON.Feature;
}

/** Event fired when shapes are edited */
export interface DrawEditedEvent {
  /** Array of edited layers */
  layers: Layer[];
  /** GeoJSON FeatureCollection of edited shapes */
  geoJSON: GeoJSON.FeatureCollection;
}

/** Event fired when shapes are deleted */
export interface DrawDeletedEvent {
  /** Array of deleted layers */
  layers: Layer[];
}

/** Event fired when measurement completes */
export interface MeasureCompleteEvent {
  /** Measurement mode used */
  mode: 'distance' | 'area';
  /** Value in meters (distance) or square meters (area) */
  value: number;
  /** Formatted display string */
  displayValue: string;
}

/** Event fired when map is clicked */
export interface MapClickEvent {
  /** Clicked coordinates */
  latlng: { lat: number; lng: number };
  /** Container point in pixels */
  containerPoint: { x: number; y: number };
  /** Original DOM event */
  originalEvent: MouseEvent | TouchEvent;
}

/** Event fired when map view changes */
export interface MapMoveEvent {
  /** New center coordinates */
  center: { lat: number; lng: number };
  /** New bounds */
  bounds: LatLngBounds;
  /** New zoom level */
  zoom: number;
}

/** Map event handler callbacks */
export interface MapEventHandlers {
  /** Fired when map is clicked */
  onClick?: (event: MapClickEvent) => void;
  /** Fired when map view changes (pan/zoom complete) */
  onMoveEnd?: (event: MapMoveEvent) => void;
  /** Fired when zoom changes */
  onZoomEnd?: (event: MapMoveEvent) => void;
  /** Fired when a shape is drawn */
  onDrawCreated?: (event: DrawCreatedEvent) => void;
  /** Fired when shapes are edited */
  onDrawEdited?: (event: DrawEditedEvent) => void;
  /** Fired when shapes are deleted */
  onDrawDeleted?: (event: DrawDeletedEvent) => void;
  /** Fired when drawing starts */
  onDrawStart?: (layerType: string) => void;
  /** Fired when drawing stops */
  onDrawStop?: () => void;
  /** Fired when measurement completes */
  onMeasureComplete?: (event: MeasureCompleteEvent) => void;
  /** Fired when measurement is cleared */
  onMeasureClear?: () => void;
  /** Fired when map is ready */
  onReady?: (map: LeafletMap) => void;
  /** Fired when a soil feature is clicked */
  onSoilFeatureClick?: (event: SoilFeatureClickEvent) => void;
  /** Fired when soil feature selection changes */
  onSoilFeatureSelect?: (event: SoilFeatureSelectEvent) => void;
  /** Fired when a hydro feature is clicked */
  onHydroFeatureClick?: (event: HydroFeatureClickEvent) => void;
  /** Fired when hydro feature selection changes */
  onHydroFeatureSelect?: (event: HydroFeatureSelectEvent) => void;
  /** Fired when any data overlay visibility changes */
  onDataOverlayVisibilityChange?: (event: OverlayVisibilityChangeEvent) => void;
  /** Fired when click forecast data is fetched */
  onClickForecastFetched?: (data: DWMLForecastData) => void;
  /** Fired when click forecast mode is toggled */
  onClickForecastModeChange?: (enabled: boolean) => void;
  /** Fired when an error occurs */
  onError?: (error: Error) => void;
}

// ============================================
// Main Component Props
// ============================================

/** Props for the Map component */
export interface MapProps {
  /** Initial center of the map as [lat, lng] */
  center?: LatLngExpression;
  /** Initial zoom level (default: 13) */
  zoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Initial bounds to fit the map to (overrides center/zoom) */
  bounds?: LatLngBoundsExpression;

  /** Map height (default: '400px') */
  height?: string | number;
  /** Map width (default: '100%') */
  width?: string | number;
  /** Optional class name for container */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;

  /** Layer configuration */
  layers?: LayerConfig;
  /** Show layer control for switching layers (default: true) */
  showLayerControl?: boolean;
  /** Show zoom control (default: true) */
  showZoomControl?: boolean;
  /** Show scale control (default: false) */
  showScaleControl?: boolean;
  /** Show attribution control (default: true) */
  showAttributionControl?: boolean;

  /**
   * Unit configuration for measurements and displays
   * @example { distance: 'imperial', area: 'acres' }
   */
  units?: MapUnits;

  /** Drawing tools configuration */
  drawing?: DrawingOptions;
  /** Measurement tool configuration */
  measure?: MeasureOptions;
  /** Mobile-specific options */
  mobile?: MobileOptions;

  /** Event handler callbacks */
  eventHandlers?: MapEventHandlers;

  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: React.ReactNode;

  /** Enable scroll wheel zoom (default: true on desktop, false on mobile with gesture handling) */
  scrollWheelZoom?: boolean;
  /** Enable double-click zoom (default: true) */
  doubleClickZoom?: boolean;
  /** Enable dragging (default: true) */
  dragging?: boolean;
  /** Maximum bounds for panning */
  maxBounds?: LatLngBoundsExpression;
  /** Existing GeoJSON to display on mount */
  initialGeoJSON?: GeoJSON.FeatureCollection;

  /** Data overlay configuration (soil, hydro, etc.) */
  dataOverlays?: DataOverlayProps;

  /** Click-to-forecast configuration */
  clickForecast?: ClickForecastOptions;
}

// ============================================
// Hook Types
// ============================================

/** Options for useMapInstance hook */
export interface UseMapInstanceOptions {
  /** Reference to the map container (from MapContainer's ref) */
  mapRef?: React.RefObject<LeafletMap | null>;
}

/** Return type for useMapInstance hook */
export interface UseMapInstanceResult {
  /** The Leaflet map instance */
  map: LeafletMap | null;
  /** Whether the map is ready for interaction */
  isReady: boolean;
  /** Programmatically fly to a location with animation */
  flyTo: (latlng: LatLngExpression, zoom?: number) => void;
  /** Programmatically set view without animation */
  setView: (latlng: LatLngExpression, zoom?: number) => void;
  /** Fit map to bounds */
  fitBounds: (bounds: LatLngBoundsExpression, options?: { padding?: [number, number] }) => void;
  /** Get current center coordinates */
  getCenter: () => { lat: number; lng: number } | null;
  /** Get current zoom level */
  getZoom: () => number | null;
  /** Get current map bounds */
  getBounds: () => LatLngBounds | null;
  /** Invalidate map size (call after container resize) */
  invalidateSize: () => void;
  /** Get the FeatureGroup containing drawn items */
  getDrawnItems: () => FeatureGroup | null;
  /** Add GeoJSON features to the drawn items layer */
  addGeoJSON: (geoJSON: GeoJSON.FeatureCollection) => void;
  /** Clear all drawn items */
  clearDrawnItems: () => void;
  /** Export all drawn items as GeoJSON */
  exportGeoJSON: () => GeoJSON.FeatureCollection | null;
}

// ============================================
// Internal Types (not exported from package)
// ============================================

/** Internal props for MapControls component */
export interface MapControlsProps {
  drawing?: DrawingOptions;
  measure?: MeasureOptions;
  clickForecast?: ClickForecastOptions;
  units?: MapUnits;
  eventHandlers?: MapEventHandlers;
  drawnItemsRef: React.MutableRefObject<FeatureGroup | null>;
  initialGeoJSON?: GeoJSON.FeatureCollection;
}

/** Internal props for MapLayers component */
export interface MapLayersProps {
  layers: LayerConfig;
  showLayerControl: boolean;
}
