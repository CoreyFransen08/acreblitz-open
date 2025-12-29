// Context and Provider
export { DataOverlayContext, DataOverlayProvider } from './DataOverlayContext';
export type { DataOverlayProviderProps } from './DataOverlayContext';

// Hooks
export { useDataOverlay, useDataOverlaySafe } from './hooks';

// Components
export { DataOverlayPanel } from './DataOverlayPanel';
export { DataOverlayRenderer } from './DataOverlayRenderer';

// Layers
export { SoilLayer, HydroLayer } from './layers';

// Soil Utilities
export {
  SSURGO_WFS_URL,
  buildWFSUrl,
  fetchWFSFeatures,
  SSURGO_OVERLAY_CONFIG,
  getBoundsTileKey,
  getSoilStyle,
  getSelectedSoilStyle,
  getHoverSoilStyle,
  getSoilStyleByFarmland,
  getSoilStyleByHydric,
  getSoilStyleByLandCapability,
  STYLE_MODES,
  type SoilStyleMode,
  getPropertyLabel,
  formatSoilProperty,
  getSoilPropertyValue,
  buildSoilTooltip,
  buildSoilSummary,
} from './utils';

// Hydro Utilities
export {
  HYDRO_3DHP_SERVER_URL,
  HYDRO_LAYER_IDS,
  getHydroFeatureType,
  buildESRIQueryUrl,
  fetchESRIFeatures,
  fetchHydroFeatures,
  HYDRO_3DHP_OVERLAY_CONFIG,
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
  formatFcodeDescription,
  formatLength,
  formatArea,
  buildHydroTooltip,
  buildHydroSummary,
} from './utils';
