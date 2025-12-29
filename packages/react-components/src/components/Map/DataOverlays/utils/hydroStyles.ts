/**
 * Hydro Feature Styling Utilities
 *
 * Style functions for 3DHP hydro features (flowlines, waterbodies, drainage areas)
 */

import type { PathOptions } from 'leaflet';
import type { HydroFeatureType } from '../../../../types/dataOverlay';

// ============================================
// Default Styles
// ============================================

/**
 * Default style for flowlines (streams, rivers, canals)
 */
export function getFlowlineStyle(): PathOptions {
  return {
    color: '#60a5fa', // blue-400
    weight: 2,
    opacity: 0.7,
  };
}

/**
 * Default style for waterbodies (lakes, ponds, reservoirs)
 */
export function getWaterbodyStyle(): PathOptions {
  return {
    color: '#0891b2', // cyan-600
    weight: 1,
    opacity: 0.8,
    fillColor: '#0e7490', // cyan-700
    fillOpacity: 0.3,
  };
}

/**
 * Default style for drainage areas
 */
export function getDrainageAreaStyle(): PathOptions {
  return {
    color: '#c084fc', // purple-400
    weight: 1,
    opacity: 0.6,
    fillColor: '#d8b4fe', // purple-300
    fillOpacity: 0.1,
  };
}

/**
 * Get default style by feature type
 */
export function getHydroStyle(featureType: HydroFeatureType): PathOptions {
  switch (featureType) {
    case 'flowline':
      return getFlowlineStyle();
    case 'waterbody':
      return getWaterbodyStyle();
    case 'drainagearea':
      return getDrainageAreaStyle();
    default:
      return getFlowlineStyle();
  }
}

// ============================================
// Selected Styles
// ============================================

/**
 * Selected style for flowlines
 */
export function getSelectedFlowlineStyle(): PathOptions {
  return {
    color: '#3b82f6', // blue-500
    weight: 3,
    opacity: 1,
  };
}

/**
 * Selected style for waterbodies
 */
export function getSelectedWaterbodyStyle(): PathOptions {
  return {
    color: '#0e7490', // cyan-700
    weight: 2,
    opacity: 1,
    fillColor: '#155e75', // cyan-800
    fillOpacity: 0.5,
  };
}

/**
 * Selected style for drainage areas
 */
export function getSelectedDrainageAreaStyle(): PathOptions {
  return {
    color: '#a855f7', // purple-500
    weight: 2,
    opacity: 1,
    fillColor: '#9333ea', // purple-600
    fillOpacity: 0.25,
  };
}

/**
 * Get selected style by feature type
 */
export function getSelectedHydroStyle(featureType: HydroFeatureType): PathOptions {
  switch (featureType) {
    case 'flowline':
      return getSelectedFlowlineStyle();
    case 'waterbody':
      return getSelectedWaterbodyStyle();
    case 'drainagearea':
      return getSelectedDrainageAreaStyle();
    default:
      return getSelectedFlowlineStyle();
  }
}

// ============================================
// Hover Styles
// ============================================

/**
 * Hover style for flowlines
 */
export function getHoverFlowlineStyle(): PathOptions {
  return {
    color: '#60a5fa', // blue-400
    weight: 3,
    opacity: 0.9,
  };
}

/**
 * Hover style for waterbodies
 */
export function getHoverWaterbodyStyle(): PathOptions {
  return {
    color: '#0891b2', // cyan-600
    weight: 2,
    opacity: 1,
    fillColor: '#0e7490', // cyan-700
    fillOpacity: 0.4,
  };
}

/**
 * Hover style for drainage areas
 */
export function getHoverDrainageAreaStyle(): PathOptions {
  return {
    color: '#c084fc', // purple-400
    weight: 2,
    opacity: 0.8,
    fillColor: '#d8b4fe', // purple-300
    fillOpacity: 0.15,
  };
}

/**
 * Get hover style by feature type
 */
export function getHoverHydroStyle(featureType: HydroFeatureType): PathOptions {
  switch (featureType) {
    case 'flowline':
      return getHoverFlowlineStyle();
    case 'waterbody':
      return getHoverWaterbodyStyle();
    case 'drainagearea':
      return getHoverDrainageAreaStyle();
    default:
      return getHoverFlowlineStyle();
  }
}
