// Components
export { Weather, WeatherDisplay, WeatherSkeleton } from './components/Weather';
export {
  Map,
  MapSkeleton,
  // Data Overlay components
  DataOverlayProvider,
  DataOverlayPanel,
  DataOverlayRenderer,
  SoilLayer,
  HydroLayer,
  useDataOverlay,
  useDataOverlaySafe,
  // Weather Radar components
  WeatherRadarLayer,
  RadarAnimationControls,
  useRadarAnimation,
  // Click Forecast component
  ClickForecastControl,
} from './components/Map';

// Hooks
export { useWeather, useMapInstance, useMapClickForecast } from './hooks';

// Types
export type {
  // Weather types
  WeatherProps,
  WeatherData,
  WeatherLocation,
  CurrentConditions,
  HourlyForecastPeriod,
  UseWeatherOptions,
  UseWeatherResult,
  // Map types
  LeafletMap,
  MapProps,
  TileLayerConfig,
  LayerConfig,
  DrawToolOptions,
  DrawEditOptions,
  DrawingOptions,
  MeasureOptions,
  MobileOptions,
  MapUnits,
  DistanceUnit,
  AreaUnit,
  DrawCreatedEvent,
  DrawEditedEvent,
  DrawDeletedEvent,
  MeasureCompleteEvent,
  MapClickEvent,
  MapMoveEvent,
  MapEventHandlers,
  UseMapInstanceOptions,
  UseMapInstanceResult,
  // Data Overlay types - Base
  DataOverlayType,
  DataOverlayConfig,
  WFSOverlayConfig,
  ESRIFeatureOverlayConfig,
  GeoJSONOverlayConfig,
  AnyDataOverlayConfig,
  // Data Overlay types - Soil
  SoilProperty,
  DrainageClass,
  HydricRating,
  SoilFeatureProperties,
  SoilFeature,
  SoilOverlayConfig,
  SoilFeatureClickEvent,
  SoilFeatureSelectEvent,
  SoilLayerProps,
  // Data Overlay types - Hydro
  HydroFeatureType,
  HydroFeatureProperties,
  HydroFeature,
  HydroOverlayConfig,
  HydroFeatureClickEvent,
  HydroFeatureSelectEvent,
  HydroLayerProps,
  HydroFeaturesData,
  // Data Overlay types - State/Context
  DataOverlayVisibility,
  DataOverlaySelection,
  DataOverlayState,
  DataOverlayActions,
  DataOverlayContextValue,
  OverlayVisibilityChangeEvent,
  DataOverlayPanelProps,
  DataOverlayProps,
  // Weather Radar types
  RadarPlaybackState,
  RadarTimeConfig,
  RadarAnimationConfig,
  AnimatedTileLayerConfig,
  RadarFrame,
  RadarAnimationState,
  UseRadarAnimationOptions,
  UseRadarAnimationResult,
  WeatherRadarLayerProps,
  RadarAnimationControlsProps,
  // Click Forecast types
  DWMLLocation,
  DWMLHourlyData,
  DWMLForecastData,
  UseClickForecastOptions,
  UseClickForecastResult,
  ClickForecastOptions,
  ClickForecastControlProps,
} from './types';

// Weather Radar type guard
export { isAnimatedTileLayer } from './types';

// Utilities
export {
  // Weather utilities
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  degreesToCompass,
  mpsToMph,
  mphToMps,
  pascalsToInHg,
  pascalsToMb,
  formatTemperature,
  formatWindSpeed,
  formatPressure,
  fetchWeatherData,
  clearWeatherCache,
  // Map utilities
  DEFAULT_LAYERS,
  DEFAULT_LAYER_CONFIG,
  createLayerConfig,
  getDefaultLayer,
  // Weather Radar
  WEATHER_RADAR_OVERLAY_CONFIG,
  // Click Forecast utilities
  fetchDWMLForecast,
  parseDWMLResponse,
  degreesToCompassDirection,
  dwmlFahrenheitToCelsius,
  mphToKmh,
  inchesToMm,
} from './utils';

// Data Overlay utilities - Soil
export {
  SSURGO_OVERLAY_CONFIG,
  buildWFSUrl,
  fetchWFSFeatures,
  getSoilStyle,
  getSelectedSoilStyle,
  getHoverSoilStyle,
  getSoilStyleByFarmland,
  buildSoilTooltip,
  formatSoilProperty,
} from './components/Map';

// Data Overlay utilities - Hydro
export {
  HYDRO_3DHP_OVERLAY_CONFIG,
  HYDRO_3DHP_SERVER_URL,
  HYDRO_LAYER_IDS,
  buildESRIQueryUrl,
  fetchESRIFeatures,
  fetchHydroFeatures,
  getHydroFeatureType,
  getFlowlineStyle,
  getWaterbodyStyle,
  getDrainageAreaStyle,
  getHydroStyle,
  getSelectedFlowlineStyle,
  getSelectedWaterbodyStyle,
  getSelectedDrainageAreaStyle,
  getSelectedHydroStyle,
  getHoverFlowlineStyle,
  getHoverWaterbodyStyle,
  getHoverDrainageAreaStyle,
  getHoverHydroStyle,
  getHydroTypeLabel,
  getHydroTypeIcon,
  formatHydroName,
  buildHydroTooltip,
  buildHydroSummary,
} from './components/Map';
