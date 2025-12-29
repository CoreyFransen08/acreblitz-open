/**
 * SoilLayer Component
 *
 * Displays SSURGO soil data as an interactive GeoJSON layer
 * Supports feature selection, tooltips, and custom styling
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDataOverlaySafe } from '../hooks';
import { fetchWFSFeatures } from '../utils/wfsUtils';
import { getSoilStyle, getSelectedSoilStyle, getHoverSoilStyle } from '../utils/soilStyles';
import { buildSoilTooltip } from '../utils/soilProperties';
import type {
  SoilLayerProps,
  SoilFeature,
  SoilFeatureProperties,
  SoilFeatureClickEvent,
  SoilFeatureSelectEvent,
} from '../../../../types/dataOverlay';

export function SoilLayer({
  config,
  visible,
  onFeatureClick,
  onFeatureHover,
  onSelectionChange,
  fetchFeatures,
}: SoilLayerProps) {
  const map = useMap();
  const context = useDataOverlaySafe();

  // Custom pane for soil layer (z-index 450, below hydro)
  const SOIL_PANE = 'soilPane';
  if (!map.getPane(SOIL_PANE)) {
    map.createPane(SOIL_PANE);
    map.getPane(SOIL_PANE)!.style.zIndex = '450';
  }

  // Layer reference
  const layerRef = useRef<L.GeoJSON | null>(null);
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
  const selectedFeatures = context?.selection.soilFeatures || [];
  const selectedFeaturesRef = useRef(selectedFeatures);
  useEffect(() => {
    selectedFeaturesRef.current = selectedFeatures;
  }, [selectedFeatures]);

  /**
   * Get feature ID from GeoJSON feature
   */
  const getFeatureId = useCallback((feature: GeoJSON.Feature): string => {
    const mukey = (feature.properties as SoilFeatureProperties)?.mukey;
    return `soil-${mukey || feature.id || Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Check if a feature is selected (uses ref for current value)
   */
  const isFeatureSelected = useCallback(
    (featureId: string): boolean => {
      return selectedFeaturesRef.current.some((f) => f.id === featureId);
    },
    []
  );

  /**
   * Style function for features
   */
  const getStyleForFeature = useCallback(
    (feature?: GeoJSON.Feature): L.PathOptions => {
      if (!feature) {
        return getSoilStyle({ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} });
      }
      const featureId = getFeatureId(feature);
      if (isFeatureSelected(featureId)) {
        return config.selectedStyle || getSelectedSoilStyle();
      }
      return config.style?.(feature as unknown as SoilFeature) || getSoilStyle(feature);
    },
    [config, getFeatureId, isFeatureSelected]
  );

  /**
   * Load features for current map bounds
   */
  const loadFeatures = useCallback(async () => {
    if (!layerRef.current) return;

    const currentZoom = map.getZoom();

    // Check zoom constraints
    if (config.minZoom && currentZoom < config.minZoom) {
      layerRef.current.clearLayers();
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
      const geojson = fetchFeaturesRef.current
        ? await fetchFeaturesRef.current(bounds)
        : await fetchWFSFeatures(config, bounds, abortControllerRef.current.signal);

      if (layerRef.current) {
        layerRef.current.clearLayers();
        layerRef.current.addData(geojson);
      }

      context?.setLoading(config.id, false);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch soil features:', error);
        context?.setError(config.id, error as Error);
        context?.setLoading(config.id, false);
      }
    }
  }, [map, config, context]);

  /**
   * Initialize or remove layer based on visibility
   */
  useEffect(() => {
    if (!isVisible) {
      // Remove layer when not visible
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      lastBoundsRef.current = null;
      abortControllerRef.current?.abort();
      return;
    }

    // Create GeoJSON layer with stable references
    layerRef.current = L.geoJSON(undefined, {
      pane: SOIL_PANE,
      style: (feature) => getStyleForFeature(feature),
      onEachFeature: (feature, layer) => {
        const featureId = getFeatureId(feature);

        // Click handler - uses refs for current callbacks
        layer.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);

          const soilFeature: SoilFeature = {
            id: featureId,
            geometry: feature.geometry,
            properties: feature.properties as SoilFeatureProperties,
          };

          // Fire click event
          const clickEvent: SoilFeatureClickEvent = {
            feature: soilFeature,
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
              // Single-select mode: replace previous selection
              context.replaceSelection(config.id, soilFeature);
            } else {
              // Multi-select mode: add to selection
              context.selectFeature(config.id, soilFeature);
            }

            // Fire selection change event
            const selectEvent: SoilFeatureSelectEvent = {
              selectedFeatures: wasSelected
                ? [] // Deselected, so now empty
                : [soilFeature], // In single-select mode, only the new feature
              changedFeature: soilFeature,
              action: wasSelected ? 'remove' : 'add',
            };
            onSelectionChangeRef.current?.(selectEvent);
          }
        });

        // Tooltip
        if (config.showTooltips) {
          const tooltipContent = buildSoilTooltip(
            feature.properties as SoilFeatureProperties,
            config.displayProperties
          );
          layer.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'acb-soil-tooltip-container',
          });
        }

        // Hover effects
        layer.on('mouseover', () => {
          const soilFeature: SoilFeature = {
            id: featureId,
            geometry: feature.geometry,
            properties: feature.properties as SoilFeatureProperties,
          };
          onFeatureHoverRef.current?.(soilFeature);

          if (!isFeatureSelected(featureId)) {
            const hoverStyle = config.hoverStyle || getHoverSoilStyle();
            (layer as L.Path).setStyle(hoverStyle);
          }
        });

        layer.on('mouseout', () => {
          onFeatureHoverRef.current?.(null);
          (layer as L.Path).setStyle(getStyleForFeature(feature));
        });
      },
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
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [isVisible, map, config.id, config.minZoom, config.maxZoom, config.showTooltips, config.selectable, config.singleSelect]);

  /**
   * Update styles when selection changes
   */
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setStyle((feature) => getStyleForFeature(feature));
    }
  }, [selectedFeatures, getStyleForFeature]);

  // This component doesn't render anything - it just manages Leaflet layers
  return null;
}
