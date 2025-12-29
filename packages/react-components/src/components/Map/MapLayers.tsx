import { TileLayer, LayersControl } from 'react-leaflet';
import type { MapLayersProps, TileLayerConfig } from '../../types/map';
import { isAnimatedTileLayer } from '../../types/weatherRadar';
import { WeatherRadarLayer } from './WeatherRadar';

const { BaseLayer, Overlay } = LayersControl;

/**
 * Build TileLayer props, excluding undefined values to avoid overriding Leaflet defaults
 */
function getTileLayerProps(layer: TileLayerConfig) {
  const props: Record<string, unknown> = {
    url: layer.url,
    attribution: layer.attribution,
  };

  if (layer.maxZoom !== undefined) props.maxZoom = layer.maxZoom;
  if (layer.minZoom !== undefined) props.minZoom = layer.minZoom;
  if (layer.subdomains !== undefined) props.subdomains = layer.subdomains;

  return props;
}

/**
 * MapLayers component handles tile layer rendering and layer control
 */
export function MapLayers({ layers, showLayerControl }: MapLayersProps) {
  const { baseLayers, overlays = [], defaultBaseLayer, defaultOverlays = [] } = layers;

  // If no layer control, just render the default base layer
  if (!showLayerControl) {
    const defaultLayer = baseLayers.find((l) => l.id === defaultBaseLayer) || baseLayers[0];
    if (!defaultLayer) return null;

    return <TileLayer {...getTileLayerProps(defaultLayer)} />;
  }

  return (
    <LayersControl position="topright">
      {baseLayers.map((layer) => (
        <BaseLayer
          key={layer.id}
          checked={layer.id === defaultBaseLayer}
          name={layer.name}
        >
          <TileLayer {...getTileLayerProps(layer)} />
        </BaseLayer>
      ))}
      {overlays.map((layer) => (
        <Overlay
          key={layer.id}
          checked={defaultOverlays.includes(layer.id)}
          name={layer.name}
        >
          {isAnimatedTileLayer(layer) ? (
            <WeatherRadarLayer config={layer} visible={true} />
          ) : (
            <TileLayer {...getTileLayerProps(layer)} />
          )}
        </Overlay>
      ))}
    </LayersControl>
  );
}
