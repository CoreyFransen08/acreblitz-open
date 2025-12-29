/**
 * WeatherRadarLayer Component
 *
 * Renders animated weather radar tiles using WMS-T
 * Pre-creates all layers and switches via opacity for smooth animation
 */

import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useRadarAnimation } from './useRadarAnimation';
import { RadarAnimationControls } from './RadarAnimationControls';
import type { WeatherRadarLayerProps } from '../../../types/weatherRadar';

// Radar layer pane z-index (below data overlays: soil=450, hydro=460+)
const RADAR_PANE = 'radarPane';
const RADAR_PANE_Z_INDEX = '400';

// Default radar opacity (semi-transparent to see map underneath)
const DEFAULT_RADAR_OPACITY = 0.7;

export function WeatherRadarLayer({
  config,
  visible = true,
  animationOptions,
  showControls = true,
  controlsPosition = 'bottomleft',
  onVisibilityChange,
  onFrameChange,
}: WeatherRadarLayerProps) {
  const map = useMap();

  // Create custom pane for radar (if not already exists)
  useEffect(() => {
    if (!map.getPane(RADAR_PANE)) {
      map.createPane(RADAR_PANE);
      const pane = map.getPane(RADAR_PANE);
      if (pane) {
        pane.style.zIndex = RADAR_PANE_Z_INDEX;
      }
    }
  }, [map]);

  // Merged config for animation hook
  const mergedConfig = useMemo(
    () => ({
      ...config,
      animationConfig: { ...config.animationConfig, ...animationOptions },
    }),
    [config, animationOptions]
  );

  // Animation hook
  const { state, play, pause, goToFrame, currentWmsTime } = useRadarAnimation({
    config: mergedConfig,
    onFrameChange,
  });

  // Track all WMS layers (keyed by wmsTime)
  const layersRef = useRef<Map<string, L.TileLayer.WMS>>(new Map());
  const currentTimeRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Pre-create all layers when frames are ready and visible
  useEffect(() => {
    if (!visible || state.frames.length === 0) {
      return;
    }

    // Create layers for all frames
    const layers = layersRef.current;
    const frameTimes = state.frames.map((f) => f.wmsTime);

    // Create any missing layers
    frameTimes.forEach((wmsTime) => {
      if (!layers.has(wmsTime)) {
        const layer = L.tileLayer.wms(config.url, {
          layers: config.layers,
          format: 'image/png',
          transparent: true,
          opacity: 0,
          pane: RADAR_PANE,
          // @ts-expect-error - Leaflet types don't include TIME but WMS supports it
          TIME: wmsTime,
        });
        layers.set(wmsTime, layer);
        layer.addTo(map);
      }
    });

    // Remove layers that are no longer in frames
    layers.forEach((layer, time) => {
      if (!frameTimes.includes(time)) {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
        layers.delete(time);
      }
    });

    isInitializedRef.current = true;
  }, [map, visible, state.frames, config.url, config.layers]);

  // Switch active frame by toggling opacity
  useEffect(() => {
    if (!visible || !currentWmsTime || !isInitializedRef.current) {
      return;
    }

    // Skip if same frame
    if (currentWmsTime === currentTimeRef.current) {
      return;
    }

    const prevTime = currentTimeRef.current;
    currentTimeRef.current = currentWmsTime;

    // Hide previous frame
    if (prevTime) {
      const prevLayer = layersRef.current.get(prevTime);
      if (prevLayer) {
        prevLayer.setOpacity(0);
      }
    }

    // Show current frame
    const currentLayer = layersRef.current.get(currentWmsTime);
    if (currentLayer) {
      currentLayer.setOpacity(DEFAULT_RADAR_OPACITY);
    }
  }, [visible, currentWmsTime]);

  // Handle visibility toggle - hide all layers when not visible
  useEffect(() => {
    if (!visible) {
      layersRef.current.forEach((layer) => {
        layer.setOpacity(0);
      });
      currentTimeRef.current = null;
    } else if (currentWmsTime && isInitializedRef.current) {
      // Restore current frame when becoming visible
      const currentLayer = layersRef.current.get(currentWmsTime);
      if (currentLayer) {
        currentLayer.setOpacity(DEFAULT_RADAR_OPACITY);
        currentTimeRef.current = currentWmsTime;
      }
    }
  }, [visible, currentWmsTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      layersRef.current.forEach((layer) => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current.clear();
      isInitializedRef.current = false;
    };
  }, [map]);

  // Notify visibility changes
  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  // Don't render controls if not visible or showControls is false
  if (!showControls || !visible) {
    return null;
  }

  return (
    <RadarAnimationControls
      position={controlsPosition}
      state={state}
      onPlay={play}
      onPause={pause}
      onSeek={goToFrame}
      showTimestamp={true}
    />
  );
}
