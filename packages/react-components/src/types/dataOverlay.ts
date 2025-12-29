/**
 * Data Overlay Types for @acreblitz/react-components
 *
 * Feature-based data layers (SSURGO soil, hydro features, etc.)
 * Distinct from TileLayerConfig which handles raster tile layers
 */

import type { PathOptions, LatLngBounds } from 'leaflet';

// ============================================
// Base Data Overlay Configuration
// ============================================

/** Supported data overlay types */
export type DataOverlayType = 'wfs' | 'esri-feature' | 'geojson';

/** Base configuration for all data overlays */
export interface DataOverlayConfig {
  /** Unique identifier for the overlay */
  id: string;
  /** Display name in overlay panel */
  name: string;
  /** Type of data source */
  type: DataOverlayType;
  /** Whether overlay is visible by default */
  defaultVisible?: boolean;
  /** Minimum zoom level to fetch/display features */
  minZoom?: number;
  /** Maximum zoom level to fetch/display features */
  maxZoom?: number;
  /** Allow feature selection on click */
  selectable?: boolean;
  /** Single-select mode: clicking a new feature deselects the previous one */
  singleSelect?: boolean;
  /** Show tooltips on hover */
  showTooltips?: boolean;
  /** Icon for the overlay panel (React node or string) */
  icon?: React.ReactNode | string;
  /** Category grouping for panel organization */
  category?: string;
}

/** WFS-specific configuration */
export interface WFSOverlayConfig extends DataOverlayConfig {
  type: 'wfs';
  /** WFS service URL */
  url: string;
  /** Feature type name (e.g., 'mapunitpoly') */
  typeName: string;
  /** Output format (default: 'application/json') */
  outputFormat?: string;
  /** Additional WFS parameters */
  params?: Record<string, string>;
}

/** ESRI Feature Server configuration */
export interface ESRIFeatureOverlayConfig extends DataOverlayConfig {
  type: 'esri-feature';
  /** Feature Server layer URL */
  url: string;
  /** WHERE clause for filtering */
  where?: string;
  /** Fields to retrieve (default: '*') */
  outFields?: string[];
}

/** GeoJSON data overlay (for consumer-provided data) */
export interface GeoJSONOverlayConfig extends DataOverlayConfig {
  type: 'geojson';
  /** GeoJSON data or function to fetch it */
  data: GeoJSON.FeatureCollection | (() => Promise<GeoJSON.FeatureCollection>);
}

/** Union type for all overlay configs (extended below with specific configs) */
export type AnyDataOverlayConfig =
  | WFSOverlayConfig
  | ESRIFeatureOverlayConfig
  | GeoJSONOverlayConfig
  | SoilOverlayConfig
  | HydroOverlayConfig;

// ============================================
// SSURGO Soil-Specific Types
// ============================================

/** SSURGO soil property identifiers */
export type SoilProperty =
  | 'drainageClass'
  | 'farmlandClassification'
  | 'landCapabilityClass'
  | 'hydricRating'
  | 'soilTexture'
  | 'slope'
  | 'awc';

/** SSURGO drainage class values */
export type DrainageClass =
  | 'Excessively drained'
  | 'Somewhat excessively drained'
  | 'Well drained'
  | 'Moderately well drained'
  | 'Somewhat poorly drained'
  | 'Poorly drained'
  | 'Very poorly drained';

/** SSURGO hydric rating */
export type HydricRating = 'Yes' | 'No' | 'Partial' | 'Unknown';

/** Soil feature properties from SSURGO */
export interface SoilFeatureProperties {
  /** Map unit key - primary identifier */
  mukey: string;
  /** Map unit symbol */
  musym: string;
  /** Map unit name */
  muname: string;
  /** Drainage class */
  drclassdcd?: DrainageClass;
  /** Farmland classification */
  farmlndcl?: string;
  /** Land capability class (1-8, with subclasses) */
  lccl?: string;
  /** Hydric rating */
  hydricrating?: HydricRating;
  /** National hydric status */
  hydclprs?: string;
  /** Acres in map unit */
  muacres?: number;
  /** Component percentage */
  comppct_r?: number;
  /** Raw properties from WFS */
  [key: string]: unknown;
}

/** A selected soil feature */
export interface SoilFeature {
  /** Unique feature identifier */
  id: string;
  /** GeoJSON geometry */
  geometry: GeoJSON.Geometry;
  /** Soil properties */
  properties: SoilFeatureProperties;
  /** Leaflet layer reference (internal) */
  _layer?: unknown;
}

/** SSURGO layer configuration */
export interface SoilOverlayConfig extends WFSOverlayConfig {
  /** Properties to display in tooltip/popup */
  displayProperties?: SoilProperty[];
  /** Style function for features */
  style?: (feature: SoilFeature) => PathOptions;
  /** Style for selected features */
  selectedStyle?: PathOptions;
  /** Style for hovered features */
  hoverStyle?: PathOptions;
}

// ============================================
// 3DHP Hydro Feature Types
// ============================================

/** Hydro feature types from 3DHP */
export type HydroFeatureType = 'flowline' | 'waterbody' | 'drainagearea';

/** Hydro feature properties from 3DHP Feature Server */
export interface HydroFeatureProperties {
  /** Object ID - primary identifier */
  objectid: number;
  /** Geographic Names Information System name */
  gnis_name?: string;
  /** Permanent identifier */
  permanent_identifier?: string;
  /** Feature code */
  fcode?: number;
  /** Feature type code */
  ftype?: number;
  /** Feature description (e.g., "Stream/River", "Lake/Pond") */
  fcode_description?: string;
  /** Length in meters (for flowlines) */
  lengthkm?: number;
  /** Area in square meters (for waterbodies/drainage areas) */
  areasqkm?: number;
  /** Raw properties from ESRI */
  [key: string]: unknown;
}

/** A selected hydro feature */
export interface HydroFeature {
  /** Unique feature identifier */
  id: string;
  /** Type of hydro feature */
  featureType: HydroFeatureType;
  /** GeoJSON geometry */
  geometry: GeoJSON.Geometry;
  /** Hydro properties */
  properties: HydroFeatureProperties;
  /** Leaflet layer reference (internal) */
  _layer?: unknown;
}

/** 3DHP Hydro overlay configuration */
export interface HydroOverlayConfig extends ESRIFeatureOverlayConfig {
  /** Layer IDs to include (50=flowline, 60=waterbody, 70=drainagearea) */
  layerIds: number[];
  /** Styles for each feature type */
  styles?: {
    flowline?: PathOptions;
    waterbody?: PathOptions;
    drainagearea?: PathOptions;
  };
  /** Selected styles for each feature type */
  selectedStyles?: {
    flowline?: PathOptions;
    waterbody?: PathOptions;
    drainagearea?: PathOptions;
  };
  /** Hover styles for each feature type */
  hoverStyles?: {
    flowline?: PathOptions;
    waterbody?: PathOptions;
    drainagearea?: PathOptions;
  };
}

// ============================================
// Data Overlay State & Context
// ============================================

/** Visibility state for all overlays */
export interface DataOverlayVisibility {
  [overlayId: string]: boolean;
}

/** Selected features state */
export interface DataOverlaySelection {
  /** Selected soil features */
  soilFeatures: SoilFeature[];
  /** Selected hydro features */
  hydroFeatures: HydroFeature[];
  /** Selected features by overlay ID (generic) */
  [overlayId: string]: unknown[];
}

/** Data overlay context state */
export interface DataOverlayState {
  /** Registered overlay configurations */
  overlays: AnyDataOverlayConfig[];
  /** Visibility state per overlay */
  visibility: DataOverlayVisibility;
  /** Selected features */
  selection: DataOverlaySelection;
  /** Loading state per overlay */
  loading: { [overlayId: string]: boolean };
  /** Error state per overlay */
  errors: { [overlayId: string]: Error | null };
}

/** Data overlay context actions */
export interface DataOverlayActions {
  /** Toggle overlay visibility */
  toggleOverlay: (overlayId: string) => void;
  /** Set overlay visibility explicitly */
  setOverlayVisible: (overlayId: string, visible: boolean) => void;
  /** Select a feature */
  selectFeature: (overlayId: string, feature: SoilFeature) => void;
  /** Replace selection with a single feature (for single-select mode) */
  replaceSelection: (overlayId: string, feature: SoilFeature) => void;
  /** Deselect a feature */
  deselectFeature: (overlayId: string, featureId: string) => void;
  /** Clear all selections for an overlay */
  clearSelection: (overlayId: string) => void;
  /** Clear all selections */
  clearAllSelections: () => void;
  /** Set loading state */
  setLoading: (overlayId: string, loading: boolean) => void;
  /** Set error state */
  setError: (overlayId: string, error: Error | null) => void;
}

/** Full context value */
export interface DataOverlayContextValue extends DataOverlayState, DataOverlayActions {}

// ============================================
// Event Types
// ============================================

/** Event fired when a soil feature is clicked */
export interface SoilFeatureClickEvent {
  /** The clicked feature */
  feature: SoilFeature;
  /** Click coordinates */
  latlng: { lat: number; lng: number };
  /** Original Leaflet event */
  originalEvent: unknown;
}

/** Event fired when soil feature selection changes */
export interface SoilFeatureSelectEvent {
  /** Currently selected features */
  selectedFeatures: SoilFeature[];
  /** Feature that triggered the event (added or removed) */
  changedFeature: SoilFeature;
  /** Whether feature was added or removed */
  action: 'add' | 'remove';
}

/** Event fired when overlay visibility changes */
export interface OverlayVisibilityChangeEvent {
  overlayId: string;
  visible: boolean;
}

/** Event fired when a hydro feature is clicked */
export interface HydroFeatureClickEvent {
  /** The clicked feature */
  feature: HydroFeature;
  /** Click coordinates */
  latlng: { lat: number; lng: number };
  /** Original Leaflet event */
  originalEvent: unknown;
}

/** Event fired when hydro feature selection changes */
export interface HydroFeatureSelectEvent {
  /** Currently selected features */
  selectedFeatures: HydroFeature[];
  /** Feature that triggered the event (added or removed) */
  changedFeature: HydroFeature;
  /** Whether feature was added or removed */
  action: 'add' | 'remove';
}

// ============================================
// Component Props Types
// ============================================

/** Props for DataOverlayPanel component */
export interface DataOverlayPanelProps {
  /** Position of the panel */
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** Whether panel is collapsed by default */
  collapsed?: boolean;
  /** Custom panel title */
  title?: string;
  /** Show category groupings */
  showCategories?: boolean;
  /** Custom class name */
  className?: string;
}

/** Props for SoilLayer component */
export interface SoilLayerProps {
  /** Layer configuration */
  config: SoilOverlayConfig;
  /** Override visibility (controlled mode) */
  visible?: boolean;
  /** Callback when feature is clicked */
  onFeatureClick?: (event: SoilFeatureClickEvent) => void;
  /** Callback when feature is hovered */
  onFeatureHover?: (feature: SoilFeature | null) => void;
  /** Callback when selection changes */
  onSelectionChange?: (event: SoilFeatureSelectEvent) => void;
  /** Custom fetch function (for React Query integration) */
  fetchFeatures?: (bounds: LatLngBounds) => Promise<GeoJSON.FeatureCollection>;
}

/** Hydro features fetch result */
export interface HydroFeaturesData {
  flowlines: GeoJSON.FeatureCollection;
  waterbodies: GeoJSON.FeatureCollection;
  drainageAreas: GeoJSON.FeatureCollection;
}

/** Props for HydroLayer component */
export interface HydroLayerProps {
  /** Layer configuration */
  config: HydroOverlayConfig;
  /** Override visibility (controlled mode) */
  visible?: boolean;
  /** Callback when feature is clicked */
  onFeatureClick?: (event: HydroFeatureClickEvent) => void;
  /** Callback when feature is hovered */
  onFeatureHover?: (feature: HydroFeature | null) => void;
  /** Callback when selection changes */
  onSelectionChange?: (event: HydroFeatureSelectEvent) => void;
  /** Custom fetch function (for React Query integration) */
  fetchFeatures?: (bounds: LatLngBounds) => Promise<HydroFeaturesData>;
}

/** Data overlay props for Map component */
export interface DataOverlayProps {
  /** Enable data overlay system */
  enabled?: boolean;
  /** Overlay configurations */
  overlays?: AnyDataOverlayConfig[];
  /** Default visibility state */
  defaultVisibility?: DataOverlayVisibility;
  /** Show the overlay control panel */
  showPanel?: boolean;
  /** Panel configuration */
  panelConfig?: DataOverlayPanelProps;
  /** Event handlers */
  onOverlayVisibilityChange?: (event: OverlayVisibilityChangeEvent) => void;
  onSoilFeatureClick?: (event: SoilFeatureClickEvent) => void;
  onSoilFeatureSelect?: (event: SoilFeatureSelectEvent) => void;
  onHydroFeatureClick?: (event: HydroFeatureClickEvent) => void;
  onHydroFeatureSelect?: (event: HydroFeatureSelectEvent) => void;
}
