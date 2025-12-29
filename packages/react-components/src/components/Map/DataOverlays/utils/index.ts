// WFS/Soil utilities
export {
  SSURGO_WFS_URL,
  buildWFSUrl,
  fetchWFSFeatures,
  SSURGO_OVERLAY_CONFIG,
  getBoundsTileKey,
} from './wfsUtils';

export {
  getSoilStyle,
  getSelectedSoilStyle,
  getHoverSoilStyle,
  getSoilStyleByFarmland,
  getSoilStyleByHydric,
  getSoilStyleByLandCapability,
  STYLE_MODES,
  type SoilStyleMode,
} from './soilStyles';

export {
  getPropertyLabel,
  formatSoilProperty,
  getSoilPropertyValue,
  buildSoilTooltip,
  buildSoilSummary,
  WFS_PROPERTY_MAP,
} from './soilProperties';

// ESRI/Hydro utilities
export {
  HYDRO_3DHP_SERVER_URL,
  HYDRO_LAYER_IDS,
  getHydroFeatureType,
  buildESRIQueryUrl,
  fetchESRIFeatures,
  fetchHydroFeatures,
  HYDRO_3DHP_OVERLAY_CONFIG,
} from './esriUtils';

export {
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
} from './hydroStyles';

export {
  getHydroTypeLabel,
  getHydroTypeIcon,
  formatHydroName,
  formatFcodeDescription,
  formatLength,
  formatArea,
  buildHydroTooltip,
  buildHydroSummary,
} from './hydroProperties';
