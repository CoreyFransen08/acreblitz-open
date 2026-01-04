/**
 * GeoJSONLayer Component
 *
 * Renders GeoJSON data on the map as a display-only layer.
 * Used when drawing tools are not enabled.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useNativeMap } from './MapContext';

interface GeoJSONLayerProps {
  data: GeoJSON.GeoJsonObject;
  style?: L.PathOptions;
}

const DEFAULT_STYLE: L.PathOptions = {
  color: '#3b82f6',
  weight: 2,
  fillOpacity: 0.2,
};

export function GeoJSONLayer({ data, style = DEFAULT_STYLE }: GeoJSONLayerProps) {
  const map = useNativeMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!data) return;

    // Remove previous layer if it exists
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    try {
      layerRef.current = L.geoJSON(data, { style }).addTo(map);
    } catch (error) {
      console.error('Failed to load GeoJSON:', error);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, data, style]);

  return null;
}
