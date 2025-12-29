/**
 * Map Layer Utilities for @acreblitz/react-components
 *
 * Default layer configurations and helpers for Leaflet map
 */

import type { TileLayerConfig, LayerConfig } from '../types/map';
import type { AnimatedTileLayerConfig } from '../types/weatherRadar';

/**
 * Pre-configured tile layers from popular providers
 */
export const DEFAULT_LAYERS: Record<string, TileLayerConfig> = {
  /**
   * ESRI World Imagery - High-resolution satellite imagery
   * Free for non-commercial use, no API key required
   */
  esriWorldImagery: {
    id: 'esri-satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },

  /**
   * OpenStreetMap - Standard street map
   * Free and open, community maintained
   */
  openStreetMap: {
    id: 'osm',
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },

  /**
   * ESRI World Topographic Map
   * Detailed topographic map with terrain features
   */
  esriWorldTopoMap: {
    id: 'esri-topo',
    name: 'Topographic',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },

  /**
   * ESRI World Street Map
   * Clear street map with labels
   */
  esriWorldStreetMap: {
    id: 'esri-streets',
    name: 'Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
};

/**
 * Default layer configuration with ESRI Satellite as the primary layer
 */
export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  baseLayers: [
    DEFAULT_LAYERS.esriWorldImagery,
    DEFAULT_LAYERS.openStreetMap,
    DEFAULT_LAYERS.esriWorldTopoMap,
  ],
  overlays: [],
  defaultBaseLayer: 'esri-satellite',
  defaultOverlays: [],
};

/**
 * Create a layer configuration with custom layers merged with defaults
 *
 * @example
 * ```tsx
 * const layers = createLayerConfig({
 *   baseLayers: [
 *     DEFAULT_LAYERS.esriWorldImagery,
 *     DEFAULT_LAYERS.openStreetMap,
 *   ],
 *   defaultBaseLayer: 'osm',
 * });
 * ```
 */
export function createLayerConfig(
  customConfig?: Partial<LayerConfig>
): LayerConfig {
  if (!customConfig) {
    return DEFAULT_LAYER_CONFIG;
  }

  return {
    baseLayers: customConfig.baseLayers ?? DEFAULT_LAYER_CONFIG.baseLayers,
    overlays: customConfig.overlays ?? [],
    defaultBaseLayer:
      customConfig.defaultBaseLayer ?? DEFAULT_LAYER_CONFIG.defaultBaseLayer,
    defaultOverlays: customConfig.defaultOverlays ?? [],
  };
}

/**
 * Get the default tile layer configuration for a given layer ID
 */
export function getDefaultLayer(layerId: string): TileLayerConfig | undefined {
  return Object.values(DEFAULT_LAYERS).find((layer) => layer.id === layerId);
}

/**
 * Iowa State Mesonet NEXRAD Weather Radar Configuration
 *
 * Animated weather radar overlay using WMS-T (time-enabled WMS)
 * Free public data, no API key required
 *
 * Data source: https://mesonet.agron.iastate.edu/ogc/
 */
export const WEATHER_RADAR_OVERLAY_CONFIG: AnimatedTileLayerConfig = {
  id: 'weather-radar-nexrad',
  name: 'Weather Radar',
  // WMS-T endpoint for time-enabled radar
  url: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi',
  layers: 'nexrad-n0q-wmst',
  attribution:
    'NEXRAD data courtesy of <a href="https://mesonet.agron.iastate.edu/" target="_blank">Iowa Environmental Mesonet</a>',
  maxZoom: 12,
  minZoom: 3,
  animated: true,
  animationType: 'time',
  timeConfig: {
    historyMinutes: 60,
    intervalMinutes: 5,
    includeCurrent: true,
  },
  animationConfig: {
    frameDelay: 500,
    loop: true,
    loopPauseDelay: 2000,
    autoPlay: false,
  },
};
