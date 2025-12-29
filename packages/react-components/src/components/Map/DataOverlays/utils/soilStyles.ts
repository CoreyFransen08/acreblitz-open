/**
 * Soil Styling Utilities
 *
 * Default styling functions for SSURGO soil features
 */

import type { PathOptions } from 'leaflet';
import type { SoilFeatureProperties, DrainageClass } from '../../../../types/dataOverlay';

// ============================================
// Color Palettes
// ============================================

/** Colors based on drainage class */
const DRAINAGE_COLORS: Record<DrainageClass, string> = {
  'Excessively drained': '#FEE2E2',          // red-100
  'Somewhat excessively drained': '#FED7AA', // orange-200
  'Well drained': '#BBF7D0',                 // green-200
  'Moderately well drained': '#A7F3D0',      // emerald-200
  'Somewhat poorly drained': '#BAE6FD',      // sky-200
  'Poorly drained': '#93C5FD',               // blue-300
  'Very poorly drained': '#6366F1',          // indigo-500
};

/** Colors based on farmland classification */
const FARMLAND_COLORS: Record<string, string> = {
  'All areas are prime farmland': '#15803D',              // green-700
  'Prime farmland if drained': '#22C55E',                 // green-500
  'Prime farmland if irrigated': '#86EFAC',               // green-300
  'Prime farmland if protected from flooding': '#4ADE80', // green-400
  'Farmland of statewide importance': '#FDE047',          // yellow-300
  'Farmland of local importance': '#FEF08A',              // yellow-200
  'Not prime farmland': '#D1D5DB',                        // gray-300
};

/** Colors based on hydric rating */
const HYDRIC_COLORS: Record<string, string> = {
  'Yes': '#3B82F6',      // blue-500
  'Partial': '#60A5FA',  // blue-400
  'No': '#E5E7EB',       // gray-200
  'Unknown': '#9CA3AF',  // gray-400
};

// ============================================
// Style Functions
// ============================================

/**
 * Get default style for a soil feature (based on drainage class)
 */
export function getSoilStyle(feature: GeoJSON.Feature): PathOptions {
  const props = feature.properties as SoilFeatureProperties;
  const drainageClass = props?.drclassdcd as DrainageClass;

  return {
    color: '#4B5563',                                          // gray-600 border
    weight: 1,
    opacity: 0.8,
    fillColor: DRAINAGE_COLORS[drainageClass] || '#E5E7EB',   // gray-200 default
    fillOpacity: 0.5,
  };
}

/**
 * Get style for a selected soil feature
 */
export function getSelectedSoilStyle(): PathOptions {
  return {
    color: '#2563EB',      // blue-600
    weight: 3,
    opacity: 1,
    fillColor: '#3B82F6',  // blue-500
    fillOpacity: 0.6,
  };
}

/**
 * Get style for a hovered soil feature
 */
export function getHoverSoilStyle(): PathOptions {
  return {
    weight: 2,
    fillOpacity: 0.65,
  };
}

/**
 * Get style based on farmland classification
 */
export function getSoilStyleByFarmland(feature: GeoJSON.Feature): PathOptions {
  const props = feature.properties as SoilFeatureProperties;
  const farmland = props?.farmlndcl || 'Not prime farmland';

  // Find matching farmland key (partial match for variations)
  const matchedKey = Object.keys(FARMLAND_COLORS).find((key) =>
    farmland.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(farmland.toLowerCase())
  );

  return {
    color: '#4B5563',
    weight: 1,
    opacity: 0.8,
    fillColor: matchedKey ? FARMLAND_COLORS[matchedKey] : '#D1D5DB',
    fillOpacity: 0.5,
  };
}

/**
 * Get style based on hydric rating
 */
export function getSoilStyleByHydric(feature: GeoJSON.Feature): PathOptions {
  const props = feature.properties as SoilFeatureProperties;
  const hydric = props?.hydricrating || 'Unknown';

  return {
    color: '#4B5563',
    weight: 1,
    opacity: 0.8,
    fillColor: HYDRIC_COLORS[hydric] || HYDRIC_COLORS['Unknown'],
    fillOpacity: 0.5,
  };
}

/**
 * Get style based on land capability class (1-8)
 */
export function getSoilStyleByLandCapability(feature: GeoJSON.Feature): PathOptions {
  const props = feature.properties as SoilFeatureProperties;
  const lcc = props?.lccl;

  // Extract numeric class (e.g., "2e" -> 2)
  const classNum = lcc ? parseInt(lcc.charAt(0), 10) : 0;

  // Color gradient from green (class 1 - best) to red (class 8 - worst)
  const colors = [
    '#E5E7EB', // 0 or unknown - gray
    '#22C55E', // 1 - green
    '#4ADE80', // 2 - green-400
    '#86EFAC', // 3 - green-300
    '#FDE047', // 4 - yellow-300
    '#FBBF24', // 5 - amber-400
    '#F97316', // 6 - orange-500
    '#EF4444', // 7 - red-500
    '#DC2626', // 8 - red-600
  ];

  return {
    color: '#4B5563',
    weight: 1,
    opacity: 0.8,
    fillColor: colors[classNum] || colors[0],
    fillOpacity: 0.5,
  };
}

// ============================================
// Exports
// ============================================

export const STYLE_MODES = {
  drainage: getSoilStyle,
  farmland: getSoilStyleByFarmland,
  hydric: getSoilStyleByHydric,
  landCapability: getSoilStyleByLandCapability,
} as const;

export type SoilStyleMode = keyof typeof STYLE_MODES;
