/**
 * ESRI Feature Server Utilities
 *
 * Query ESRI REST API and return GeoJSON
 * Used for 3DHP Hydro Features and other ESRI Feature Servers
 */

import type { LatLngBounds } from 'leaflet';
import type {
  HydroOverlayConfig,
  HydroFeaturesData,
  HydroFeatureType,
} from '../../../../types/dataOverlay';

/** 3DHP Feature Server base URL */
export const HYDRO_3DHP_SERVER_URL =
  'https://hydro.nationalmap.gov/arcgis/rest/services/3DHP_all/FeatureServer';

/** Layer IDs for 3DHP */
export const HYDRO_LAYER_IDS = {
  FLOWLINE: 50,
  WATERBODY: 60,
  DRAINAGE_AREA: 70,
} as const;

/**
 * Map layer ID to feature type
 */
export function getHydroFeatureType(layerId: number): HydroFeatureType {
  switch (layerId) {
    case HYDRO_LAYER_IDS.FLOWLINE:
      return 'flowline';
    case HYDRO_LAYER_IDS.WATERBODY:
      return 'waterbody';
    case HYDRO_LAYER_IDS.DRAINAGE_AREA:
      return 'drainagearea';
    default:
      return 'flowline';
  }
}

/**
 * Build ESRI query URL for a specific layer
 */
export function buildESRIQueryUrl(
  baseUrl: string,
  layerId: number,
  bounds: LatLngBounds,
  where = '1=1'
): string {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  // ESRI expects: xmin,ymin,xmax,ymax
  const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

  const params = new URLSearchParams({
    where,
    geometry: bbox,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    f: 'geojson',
  });

  return `${baseUrl}/${layerId}/query?${params.toString()}`;
}

/**
 * Fetch GeoJSON from ESRI Feature Server layer
 */
export async function fetchESRIFeatures(
  baseUrl: string,
  layerId: number,
  bounds: LatLngBounds,
  signal?: AbortSignal
): Promise<GeoJSON.FeatureCollection> {
  const url = buildESRIQueryUrl(baseUrl, layerId, bounds);

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`ESRI query failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Check for ESRI error response
  if (data.error) {
    throw new Error(`ESRI error: ${data.error.message || 'Unknown error'}`);
  }

  // Ensure we have a valid FeatureCollection
  if (!data.type || data.type !== 'FeatureCollection') {
    return {
      type: 'FeatureCollection',
      features: data.features || [],
    };
  }

  return data as GeoJSON.FeatureCollection;
}

/**
 * Fetch all hydro features (flowlines, waterbodies, drainage areas)
 */
export async function fetchHydroFeatures(
  config: HydroOverlayConfig,
  bounds: LatLngBounds,
  signal?: AbortSignal
): Promise<HydroFeaturesData> {
  const layerIds = config.layerIds || [
    HYDRO_LAYER_IDS.FLOWLINE,
    HYDRO_LAYER_IDS.WATERBODY,
    HYDRO_LAYER_IDS.DRAINAGE_AREA,
  ];

  // Fetch all layers in parallel
  const promises = layerIds.map((layerId) =>
    fetchESRIFeatures(config.url, layerId, bounds, signal).catch((error) => {
      // If aborted, rethrow
      if (error.name === 'AbortError') {
        throw error;
      }
      // Otherwise, log and return empty collection
      console.warn(`Failed to fetch layer ${layerId}:`, error);
      return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;
    })
  );

  const results = await Promise.all(promises);

  // Map results to data structure
  const data: HydroFeaturesData = {
    flowlines: { type: 'FeatureCollection', features: [] },
    waterbodies: { type: 'FeatureCollection', features: [] },
    drainageAreas: { type: 'FeatureCollection', features: [] },
  };

  layerIds.forEach((layerId, index) => {
    const featureType = getHydroFeatureType(layerId);
    switch (featureType) {
      case 'flowline':
        data.flowlines = results[index];
        break;
      case 'waterbody':
        data.waterbodies = results[index];
        break;
      case 'drainagearea':
        data.drainageAreas = results[index];
        break;
    }
  });

  return data;
}

/**
 * Pre-configured 3DHP Hydro Overlay configuration
 */
export const HYDRO_3DHP_OVERLAY_CONFIG: HydroOverlayConfig = {
  id: '3dhp-hydro',
  name: 'Hydro Features (3DHP)',
  type: 'esri-feature',
  url: HYDRO_3DHP_SERVER_URL,
  layerIds: [
    HYDRO_LAYER_IDS.FLOWLINE,
    HYDRO_LAYER_IDS.WATERBODY,
    HYDRO_LAYER_IDS.DRAINAGE_AREA,
  ],
  selectable: true,
  singleSelect: true,
  showTooltips: true,
  minZoom: 14,
  maxZoom: 19,
  defaultVisible: false,
  category: 'Hydrology',
};
