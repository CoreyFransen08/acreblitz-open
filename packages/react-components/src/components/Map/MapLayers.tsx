import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MapLayersProps, TileLayerConfig } from '../../types/map';
import { isAnimatedTileLayer } from '../../types/weatherRadar';
import { WeatherRadarLayer } from './WeatherRadar';
import { useNativeMap } from './MapContext';

/**
 * Build TileLayer options, excluding undefined values to avoid overriding Leaflet defaults
 */
function getTileLayerOptions(layer: TileLayerConfig): L.TileLayerOptions {
  const options: L.TileLayerOptions = {};

  if (layer.attribution !== undefined) options.attribution = layer.attribution;
  if (layer.maxZoom !== undefined) options.maxZoom = layer.maxZoom;
  if (layer.minZoom !== undefined) options.minZoom = layer.minZoom;
  if (layer.subdomains !== undefined) options.subdomains = layer.subdomains;

  return options;
}

/**
 * MapLayers component handles tile layer rendering and layer control
 * Uses native Leaflet instead of react-leaflet
 */
export function MapLayers({ layers, showLayerControl }: MapLayersProps) {
  const map = useNativeMap();
  const layerControlRef = useRef<L.Control.Layers | null>(null);
  const tileLayersRef = useRef<Map<string, L.TileLayer>>(new Map());
  const activeBaseLayerRef = useRef<string | null>(null);

  const { baseLayers, overlays = [], defaultBaseLayer, defaultOverlays = [] } = layers;

  useEffect(() => {
    // Create tile layer instances
    const baseLayerMap: Record<string, L.TileLayer> = {};
    const overlayMap: Record<string, L.TileLayer> = {};

    // Create base layers
    baseLayers.forEach((layer) => {
      // Skip animated layers - they're handled by WeatherRadarLayer component
      if (isAnimatedTileLayer(layer)) return;

      const tileLayer = L.tileLayer(layer.url, getTileLayerOptions(layer));
      baseLayerMap[layer.name] = tileLayer;
      tileLayersRef.current.set(layer.id, tileLayer);

      // Add default base layer to map
      if (layer.id === defaultBaseLayer) {
        tileLayer.addTo(map);
        activeBaseLayerRef.current = layer.id;
      }
    });

    // Create overlay layers (non-animated only)
    overlays.forEach((layer) => {
      // Skip animated layers - they're handled by WeatherRadarLayer component
      if (isAnimatedTileLayer(layer)) return;

      const tileLayer = L.tileLayer(layer.url, getTileLayerOptions(layer));
      overlayMap[layer.name] = tileLayer;
      tileLayersRef.current.set(layer.id, tileLayer);

      // Add default overlays to map
      if (defaultOverlays.includes(layer.id)) {
        tileLayer.addTo(map);
      }
    });

    // Create layers control if enabled
    if (showLayerControl && (Object.keys(baseLayerMap).length > 0 || Object.keys(overlayMap).length > 0)) {
      layerControlRef.current = L.control.layers(baseLayerMap, overlayMap, {
        position: 'topright',
      }).addTo(map);
    }

    // Cleanup
    return () => {
      if (layerControlRef.current) {
        layerControlRef.current.remove();
        layerControlRef.current = null;
      }
      tileLayersRef.current.forEach((layer) => {
        map.removeLayer(layer);
      });
      tileLayersRef.current.clear();
      activeBaseLayerRef.current = null;
    };
  }, [map, baseLayers, overlays, defaultBaseLayer, defaultOverlays, showLayerControl]);

  // Render WeatherRadarLayer components for animated overlays
  const animatedOverlays = overlays.filter(isAnimatedTileLayer);

  if (animatedOverlays.length === 0) {
    return null;
  }

  // Render animated overlay layers as React components
  return (
    <>
      {animatedOverlays.map((layer) => (
        <WeatherRadarLayer
          key={layer.id}
          config={layer}
          visible={defaultOverlays.includes(layer.id)}
        />
      ))}
    </>
  );
}
