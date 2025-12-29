/**
 * HydroLayer Component
 *
 * Displays USGS 3DHP hydrography features as interactive GeoJSON layers
 * Supports feature selection, tooltips, and custom styling
 *
 * Layers:
 * - Layer 50: Flowline (streams, rivers, canals)
 * - Layer 60: Waterbody (lakes, ponds)
 * - Layer 70: DrainageArea (drainage basins)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDataOverlaySafe } from '../hooks';
import { fetchHydroFeatures, HYDRO_LAYER_IDS } from '../utils/esriUtils';
import {
  getHydroStyle,
  getSelectedHydroStyle,
  getHoverHydroStyle,
} from '../utils/hydroStyles';
import { buildHydroTooltip } from '../utils/hydroProperties';
import type {
  HydroLayerProps,
  HydroFeature,
  HydroFeatureProperties,
  HydroFeatureType,
  HydroFeatureClickEvent,
  HydroFeatureSelectEvent,
} from '../../../../types/dataOverlay';

export function HydroLayer({
  config,
  visible,
  onFeatureClick,
  onFeatureHover,
  onSelectionChange,
  fetchFeatures,
}: HydroLayerProps) {
  const map = useMap();
  const context = useDataOverlaySafe();

  // Custom panes for hydro layers (z-index 460-462, above soil at 450)
  const HYDRO_DRAINAGE_PANE = 'hydroDrainagePane';
  const HYDRO_WATERBODY_PANE = 'hydroWaterbodyPane';
  const HYDRO_FLOWLINE_PANE = 'hydroFlowlinePane';

  if (!map.getPane(HYDRO_DRAINAGE_PANE)) {
    map.createPane(HYDRO_DRAINAGE_PANE);
    map.getPane(HYDRO_DRAINAGE_PANE)!.style.zIndex = '460';
  }
  if (!map.getPane(HYDRO_WATERBODY_PANE)) {
    map.createPane(HYDRO_WATERBODY_PANE);
    map.getPane(HYDRO_WATERBODY_PANE)!.style.zIndex = '461';
  }
  if (!map.getPane(HYDRO_FLOWLINE_PANE)) {
    map.createPane(HYDRO_FLOWLINE_PANE);
    map.getPane(HYDRO_FLOWLINE_PANE)!.style.zIndex = '462';
  }

  // Layer references for each feature type
  const flowlineLayerRef = useRef<L.GeoJSON | null>(null);
  const waterbodyLayerRef = useRef<L.GeoJSON | null>(null);
  const drainageAreaLayerRef = useRef<L.GeoJSON | null>(null);

  // Abort controller for fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track current bounds to avoid redundant fetches
  const lastBoundsRef = useRef<string | null>(null);

  // Store callbacks in refs to avoid effect re-runs
  const onFeatureClickRef = useRef(onFeatureClick);
  const onFeatureHoverRef = useRef(onFeatureHover);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const fetchFeaturesRef = useRef(fetchFeatures);

  // Keep refs updated
  useEffect(() => {
    onFeatureClickRef.current = onFeatureClick;
    onFeatureHoverRef.current = onFeatureHover;
    onSelectionChangeRef.current = onSelectionChange;
    fetchFeaturesRef.current = fetchFeatures;
  }, [onFeatureClick, onFeatureHover, onSelectionChange, fetchFeatures]);

  // Determine visibility from props or context
  const isVisible = visible ?? context?.visibility[config.id] ?? config.defaultVisible ?? false;

  // Get selected features from context
  const selectedFeatures = context?.selection.hydroFeatures || [];
  const selectedFeaturesRef = useRef(selectedFeatures);
  useEffect(() => {
    selectedFeaturesRef.current = selectedFeatures;
  }, [selectedFeatures]);

  /**
   * Get feature ID from GeoJSON feature
   */
  const getFeatureId = useCallback(
    (layerId: number, feature: GeoJSON.Feature): string => {
      const objectId = (feature.properties as HydroFeatureProperties)?.objectid;
      return `hydro-${layerId}-${objectId || feature.id || Math.random().toString(36).substr(2, 9)}`;
    },
    []
  );

  /**
   * Check if a feature is selected
   */
  const isFeatureSelected = useCallback((featureId: string): boolean => {
    return selectedFeaturesRef.current.some((f) => f.id === featureId);
  }, []);

  /**
   * Get style for a feature
   */
  const getStyleForFeature = useCallback(
    (featureType: HydroFeatureType, layerId: number) => {
      return (feature?: GeoJSON.Feature): L.PathOptions => {
        if (!feature) {
          return getHydroStyle(featureType);
        }
        const featureId = getFeatureId(layerId, feature);
        if (isFeatureSelected(featureId)) {
          return config.selectedStyles?.[featureType] || getSelectedHydroStyle(featureType);
        }
        return config.styles?.[featureType] || getHydroStyle(featureType);
      };
    },
    [config, getFeatureId, isFeatureSelected]
  );

  /**
   * Load features for current map bounds
   */
  const loadFeatures = useCallback(async () => {
    const currentZoom = map.getZoom();

    // Check zoom constraints
    if (config.minZoom && currentZoom < config.minZoom) {
      // Clear all layers when below min zoom
      flowlineLayerRef.current?.clearLayers();
      waterbodyLayerRef.current?.clearLayers();
      drainageAreaLayerRef.current?.clearLayers();
      context?.setLoading(config.id, false);
      return;
    }

    if (config.maxZoom && currentZoom > config.maxZoom) {
      return;
    }

    const bounds = map.getBounds();
    const boundsKey = bounds.toBBoxString();

    // Skip if bounds haven't changed significantly
    if (boundsKey === lastBoundsRef.current) {
      return;
    }
    lastBoundsRef.current = boundsKey;

    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Set loading state
    context?.setLoading(config.id, true);
    context?.setError(config.id, null);

    try {
      // Use custom fetch function if provided (for React Query integration)
      const data = fetchFeaturesRef.current
        ? await fetchFeaturesRef.current(bounds)
        : await fetchHydroFeatures(config, bounds, abortControllerRef.current.signal);

      // Update layers with new data
      if (flowlineLayerRef.current) {
        flowlineLayerRef.current.clearLayers();
        flowlineLayerRef.current.addData(data.flowlines);
      }
      if (waterbodyLayerRef.current) {
        waterbodyLayerRef.current.clearLayers();
        waterbodyLayerRef.current.addData(data.waterbodies);
      }
      if (drainageAreaLayerRef.current) {
        drainageAreaLayerRef.current.clearLayers();
        drainageAreaLayerRef.current.addData(data.drainageAreas);
      }

      context?.setLoading(config.id, false);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch hydro features:', error);
        context?.setError(config.id, error as Error);
        context?.setLoading(config.id, false);
      }
    }
  }, [map, config, context]);

  /**
   * Initialize or remove layers based on visibility
   */
  useEffect(() => {
    if (!isVisible) {
      // Remove layers when not visible
      if (flowlineLayerRef.current) {
        map.removeLayer(flowlineLayerRef.current);
        flowlineLayerRef.current = null;
      }
      if (waterbodyLayerRef.current) {
        map.removeLayer(waterbodyLayerRef.current);
        waterbodyLayerRef.current = null;
      }
      if (drainageAreaLayerRef.current) {
        map.removeLayer(drainageAreaLayerRef.current);
        drainageAreaLayerRef.current = null;
      }
      lastBoundsRef.current = null;
      abortControllerRef.current?.abort();
      return;
    }

    // Helper to create onEachFeature handler inline (avoids dependency issues)
    const makeOnEachFeature = (featureType: HydroFeatureType, layerId: number) => {
      return (feature: GeoJSON.Feature, layer: L.Layer) => {
        const featureId = getFeatureId(layerId, feature);

        // Click handler
        layer.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);

          const hydroFeature: HydroFeature = {
            id: featureId,
            featureType,
            geometry: feature.geometry,
            properties: feature.properties as HydroFeatureProperties,
          };

          // Fire click event
          const clickEvent: HydroFeatureClickEvent = {
            feature: hydroFeature,
            latlng: { lat: e.latlng.lat, lng: e.latlng.lng },
            originalEvent: e,
          };
          onFeatureClickRef.current?.(clickEvent);

          // Handle selection if enabled
          if (config.selectable && context) {
            const wasSelected = isFeatureSelected(featureId);

            if (wasSelected) {
              context.deselectFeature(config.id, featureId);
            } else if (config.singleSelect) {
              context.replaceSelection(config.id, hydroFeature as unknown as import('../../../../types/dataOverlay').SoilFeature);
            } else {
              context.selectFeature(config.id, hydroFeature as unknown as import('../../../../types/dataOverlay').SoilFeature);
            }

            // Fire selection change event
            const selectEvent: HydroFeatureSelectEvent = {
              selectedFeatures: wasSelected ? [] : [hydroFeature],
              changedFeature: hydroFeature,
              action: wasSelected ? 'remove' : 'add',
            };
            onSelectionChangeRef.current?.(selectEvent);
          }
        });

        // Tooltip
        if (config.showTooltips) {
          const tooltipContent = buildHydroTooltip(
            featureType,
            feature.properties as HydroFeatureProperties
          );
          layer.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'acb-hydro-tooltip-container',
          });
        }

        // Hover effects
        layer.on('mouseover', () => {
          const hydroFeature: HydroFeature = {
            id: featureId,
            featureType,
            geometry: feature.geometry,
            properties: feature.properties as HydroFeatureProperties,
          };
          onFeatureHoverRef.current?.(hydroFeature);

          if (!isFeatureSelected(featureId)) {
            const hoverStyle = config.hoverStyles?.[featureType] || getHoverHydroStyle(featureType);
            (layer as L.Path).setStyle(hoverStyle);
          }
        });

        layer.on('mouseout', () => {
          onFeatureHoverRef.current?.(null);
          const style = getStyleForFeature(featureType, layerId)(feature);
          (layer as L.Path).setStyle(style);
        });
      };
    };

    // Create GeoJSON layers for each feature type with custom panes for z-ordering
    // Drainage areas (bottom) -> Waterbodies -> Flowlines (top)
    drainageAreaLayerRef.current = L.geoJSON(undefined, {
      pane: HYDRO_DRAINAGE_PANE,
      style: (feature) => getStyleForFeature('drainagearea', HYDRO_LAYER_IDS.DRAINAGE_AREA)(feature),
      onEachFeature: makeOnEachFeature('drainagearea', HYDRO_LAYER_IDS.DRAINAGE_AREA),
    }).addTo(map);

    waterbodyLayerRef.current = L.geoJSON(undefined, {
      pane: HYDRO_WATERBODY_PANE,
      style: (feature) => getStyleForFeature('waterbody', HYDRO_LAYER_IDS.WATERBODY)(feature),
      onEachFeature: makeOnEachFeature('waterbody', HYDRO_LAYER_IDS.WATERBODY),
    }).addTo(map);

    flowlineLayerRef.current = L.geoJSON(undefined, {
      pane: HYDRO_FLOWLINE_PANE,
      style: (feature) => getStyleForFeature('flowline', HYDRO_LAYER_IDS.FLOWLINE)(feature),
      onEachFeature: makeOnEachFeature('flowline', HYDRO_LAYER_IDS.FLOWLINE),
    }).addTo(map);

    // Initial load
    loadFeatures();

    // Reload on move end
    const handleMoveEnd = () => {
      loadFeatures();
    };
    map.on('moveend', handleMoveEnd);

    // Cleanup - only runs when visibility, map, or config changes
    return () => {
      map.off('moveend', handleMoveEnd);
      abortControllerRef.current?.abort();
      if (flowlineLayerRef.current) {
        map.removeLayer(flowlineLayerRef.current);
        flowlineLayerRef.current = null;
      }
      if (waterbodyLayerRef.current) {
        map.removeLayer(waterbodyLayerRef.current);
        waterbodyLayerRef.current = null;
      }
      if (drainageAreaLayerRef.current) {
        map.removeLayer(drainageAreaLayerRef.current);
        drainageAreaLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, map, config.id, config.minZoom, config.maxZoom, config.showTooltips, config.selectable, config.singleSelect]);

  /**
   * Update styles when selection changes
   */
  useEffect(() => {
    if (flowlineLayerRef.current) {
      flowlineLayerRef.current.setStyle(
        getStyleForFeature('flowline', HYDRO_LAYER_IDS.FLOWLINE)
      );
    }
    if (waterbodyLayerRef.current) {
      waterbodyLayerRef.current.setStyle(
        getStyleForFeature('waterbody', HYDRO_LAYER_IDS.WATERBODY)
      );
    }
    if (drainageAreaLayerRef.current) {
      drainageAreaLayerRef.current.setStyle(
        getStyleForFeature('drainagearea', HYDRO_LAYER_IDS.DRAINAGE_AREA)
      );
    }
  }, [selectedFeatures, getStyleForFeature]);

  // This component doesn't render anything - it just manages Leaflet layers
  return null;
}
