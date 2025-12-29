import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Map as LeafletMap,
  FeatureGroup,
  LatLngExpression,
  LatLngBoundsExpression,
  LatLngBounds,
} from 'leaflet';
import type { UseMapInstanceOptions, UseMapInstanceResult } from '../types/map';

/**
 * Hook for programmatic control of a Map component
 *
 * @example
 * ```tsx
 * function MyMapComponent() {
 *   const mapRef = useRef<LeafletMap>(null);
 *   const { flyTo, exportGeoJSON, isReady } = useMapInstance({ mapRef });
 *
 *   const handleGoToLocation = () => {
 *     if (isReady) {
 *       flyTo([39.7456, -97.0892], 15);
 *     }
 *   };
 *
 *   const handleSave = () => {
 *     const geoJSON = exportGeoJSON();
 *     console.log('Drawn shapes:', geoJSON);
 *   };
 *
 *   return <Map ref={mapRef} />;
 * }
 * ```
 */
export function useMapInstance(
  options: UseMapInstanceOptions = {}
): UseMapInstanceResult {
  const { mapRef } = options;
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const drawnItemsRef = useRef<FeatureGroup | null>(null);
  const isMountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync with external map ref
  useEffect(() => {
    if (mapRef?.current && isMountedRef.current) {
      setMap(mapRef.current);
      setIsReady(true);
    } else {
      setMap(null);
      setIsReady(false);
    }
  }, [mapRef?.current]);

  // Fly to a location with animation
  const flyTo = useCallback(
    (latlng: LatLngExpression, zoom?: number) => {
      if (!map) return;
      map.flyTo(latlng, zoom ?? map.getZoom());
    },
    [map]
  );

  // Set view without animation
  const setView = useCallback(
    (latlng: LatLngExpression, zoom?: number) => {
      if (!map) return;
      map.setView(latlng, zoom ?? map.getZoom());
    },
    [map]
  );

  // Fit map to bounds
  const fitBounds = useCallback(
    (bounds: LatLngBoundsExpression, options?: { padding?: [number, number] }) => {
      if (!map) return;
      map.fitBounds(bounds, options);
    },
    [map]
  );

  // Get current center
  const getCenter = useCallback((): { lat: number; lng: number } | null => {
    if (!map) return null;
    const center = map.getCenter();
    return { lat: center.lat, lng: center.lng };
  }, [map]);

  // Get current zoom
  const getZoom = useCallback((): number | null => {
    if (!map) return null;
    return map.getZoom();
  }, [map]);

  // Get current bounds
  const getBounds = useCallback((): LatLngBounds | null => {
    if (!map) return null;
    return map.getBounds();
  }, [map]);

  // Invalidate map size (call after container resize)
  const invalidateSize = useCallback(() => {
    if (!map) return;
    map.invalidateSize();
  }, [map]);

  // Get the feature group containing drawn items
  const getDrawnItems = useCallback((): FeatureGroup | null => {
    return drawnItemsRef.current;
  }, []);

  // Add GeoJSON to drawn items
  const addGeoJSON = useCallback(
    (geoJSON: GeoJSON.FeatureCollection) => {
      if (!drawnItemsRef.current || !map) return;

      // Dynamically import L to avoid SSR issues
      import('leaflet').then((L) => {
        L.geoJSON(geoJSON, {
          onEachFeature: (_feature, layer) => {
            drawnItemsRef.current?.addLayer(layer);
          },
        });
      });
    },
    [map]
  );

  // Clear all drawn items
  const clearDrawnItems = useCallback(() => {
    if (!drawnItemsRef.current) return;
    drawnItemsRef.current.clearLayers();
  }, []);

  // Export drawn items as GeoJSON
  const exportGeoJSON = useCallback((): GeoJSON.FeatureCollection | null => {
    if (!drawnItemsRef.current) return null;

    const features: GeoJSON.Feature[] = [];
    drawnItemsRef.current.eachLayer((layer: any) => {
      if (layer.toGeoJSON) {
        features.push(layer.toGeoJSON());
      }
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }, []);

  return {
    map,
    isReady,
    flyTo,
    setView,
    fitBounds,
    getCenter,
    getZoom,
    getBounds,
    invalidateSize,
    getDrawnItems,
    addGeoJSON,
    clearDrawnItems,
    exportGeoJSON,
  };
}
