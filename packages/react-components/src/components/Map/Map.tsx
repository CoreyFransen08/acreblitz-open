import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Map as LeafletMap, FeatureGroup } from 'leaflet';
import type { MapProps, MapClickEvent, MapMoveEvent } from '../../types/map';
import { createLayerConfig } from '../../utils/mapLayers';
import { MapSkeleton } from './MapSkeleton';

// Leaflet CSS imports
import 'leaflet/dist/leaflet.css';
import './Map.css';

// Data Overlays
import { DataOverlayProvider, DataOverlayPanel, DataOverlayRenderer } from './DataOverlays';

// Fix for default marker icons in webpack/vite builds
import L from 'leaflet';

// Fix default icon paths using CDN URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Dynamic imports for SSR safety
let MapContainer: any;
let ZoomControl: any;
let ScaleControl: any;
let AttributionControl: any;
let MapLayers: any;
let MapControls: any;

/**
 * Map component using Leaflet with react-leaflet
 *
 * Features:
 * - ESRI World Imagery (satellite) as default layer
 * - Layer switching control
 * - Drawing tools (polygon, polyline, rectangle, circle, marker)
 * - Measurement tools (distance and area)
 * - Mobile responsive with gesture handling
 *
 * @example
 * ```tsx
 * <Map
 *   center={[39.7456, -97.0892]}
 *   zoom={15}
 *   height="500px"
 *   drawing={{ enabled: true }}
 *   measure={{ enabled: true }}
 *   eventHandlers={{
 *     onDrawCreated: (e) => console.log('Shape:', e.geoJSON),
 *   }}
 * />
 * ```
 */
export const Map = forwardRef<LeafletMap | null, MapProps>(function Map(
  {
    center = [39.7456, -97.0892], // Geographic center of US
    zoom = 13,
    minZoom,
    maxZoom,
    bounds,
    height = '400px',
    width = '100%',
    className,
    style,
    layers,
    showLayerControl = true,
    showZoomControl = true,
    showScaleControl = false,
    showAttributionControl = true,
    units,
    drawing,
    measure,
    // TODO: Implement gesture handling with leaflet-gesture-handling
    mobile: _mobile = { gestureHandling: true },
    eventHandlers,
    loadingComponent,
    scrollWheelZoom = true,
    doubleClickZoom = true,
    dragging = true,
    maxBounds,
    initialGeoJSON,
    dataOverlays,
  },
  ref
) {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const drawnItemsRef = useRef<FeatureGroup | null>(null);

  // Expose map instance via ref
  useImperativeHandle(ref, () => mapInstance!, [mapInstance]);

  // Load react-leaflet components on client side only
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [reactLeaflet, mapLayersModule, mapControlsModule] = await Promise.all([
          import('react-leaflet'),
          import('./MapLayers'),
          import('./MapControls'),
        ]);

        MapContainer = reactLeaflet.MapContainer;
        ZoomControl = reactLeaflet.ZoomControl;
        ScaleControl = reactLeaflet.ScaleControl;
        AttributionControl = reactLeaflet.AttributionControl;
        MapLayers = mapLayersModule.MapLayers;
        MapControls = mapControlsModule.MapControls;

        setIsClient(true);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load map components'));
        setIsLoading(false);
      }
    };

    loadComponents();
  }, []);

  // Handle map ready event (from whenReady callback)
  const handleMapReady = useCallback(
    (e: { target: LeafletMap }) => {
      const map = e.target;
      mapRef.current = map;
      setMapInstance(map);

      // Fit to bounds if provided
      if (bounds) {
        map.fitBounds(bounds);
      }

      // Notify parent
      eventHandlers?.onReady?.(map);
    },
    [bounds, eventHandlers]
  );

  // Handle map click
  const handleClick = useCallback(
    (e: any) => {
      if (eventHandlers?.onClick) {
        const event: MapClickEvent = {
          latlng: { lat: e.latlng.lat, lng: e.latlng.lng },
          containerPoint: { x: e.containerPoint.x, y: e.containerPoint.y },
          originalEvent: e.originalEvent,
        };
        eventHandlers.onClick(event);
      }
    },
    [eventHandlers]
  );

  // Handle map move end
  const handleMoveEnd = useCallback(
    (e: any) => {
      if (eventHandlers?.onMoveEnd || eventHandlers?.onZoomEnd) {
        const map = e.target as LeafletMap;
        const center = map.getCenter();
        const event: MapMoveEvent = {
          center: { lat: center.lat, lng: center.lng },
          bounds: map.getBounds(),
          zoom: map.getZoom(),
        };

        eventHandlers?.onMoveEnd?.(event);
      }
    },
    [eventHandlers]
  );

  // Handle zoom end
  const handleZoomEnd = useCallback(
    (e: any) => {
      if (eventHandlers?.onZoomEnd) {
        const map = e.target as LeafletMap;
        const center = map.getCenter();
        const event: MapMoveEvent = {
          center: { lat: center.lat, lng: center.lng },
          bounds: map.getBounds(),
          zoom: map.getZoom(),
        };

        eventHandlers.onZoomEnd(event);
      }
    },
    [eventHandlers]
  );

  // Container styles
  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    ...style,
  };

  // Prepare layer config
  const layerConfig = createLayerConfig(layers);

  // Show loading state
  if (isLoading || !isClient) {
    if (loadingComponent) {
      return (
        <div className={`acb-map-wrapper ${className || ''}`} style={containerStyle}>
          {loadingComponent}
        </div>
      );
    }
    return <MapSkeleton height={height} width={width} />;
  }

  // Show error state
  if (error) {
    return (
      <div className={`acb-map-wrapper ${className || ''}`} style={containerStyle}>
        <div className="acb-map-error">
          <svg
            className="acb-map-error-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="acb-map-error-title">Failed to load map</span>
          <span className="acb-map-error-message">{error.message}</span>
        </div>
      </div>
    );
  }

  // Determine if data overlays are enabled
  const dataOverlaysEnabled = dataOverlays?.enabled ?? false;
  const showDataOverlayPanel = dataOverlays?.showPanel ?? true;

  // Map content (shared between with/without data overlays)
  const mapContent = (
    <MapContainer
      className="acb-map-container"
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      maxBounds={maxBounds}
      scrollWheelZoom={scrollWheelZoom}
      doubleClickZoom={doubleClickZoom}
      dragging={dragging}
      zoomControl={false}
      attributionControl={false}
      whenReady={handleMapReady}
      eventHandlers={{
        click: handleClick,
        moveend: handleMoveEnd,
        zoomend: handleZoomEnd,
      }}
    >
      {/* Layers */}
      <MapLayers layers={layerConfig} showLayerControl={showLayerControl} />

      {/* Controls */}
      {showZoomControl && <ZoomControl position="topleft" />}
      {showScaleControl && <ScaleControl position="bottomleft" />}
      {showAttributionControl && <AttributionControl position="bottomright" />}

      {/* Drawing and Measurement Controls */}
      <MapControls
        drawing={drawing}
        measure={measure}
        units={units}
        eventHandlers={eventHandlers}
        drawnItemsRef={drawnItemsRef}
        initialGeoJSON={initialGeoJSON}
      />

      {/* Data Overlay Components (rendered inside MapContainer for access to map) */}
      {dataOverlaysEnabled && (
        <>
          {showDataOverlayPanel && (
            <DataOverlayPanel {...dataOverlays?.panelConfig} />
          )}
          <DataOverlayRenderer
            onSoilFeatureClick={eventHandlers?.onSoilFeatureClick}
            onSoilFeatureSelect={eventHandlers?.onSoilFeatureSelect}
            onHydroFeatureClick={eventHandlers?.onHydroFeatureClick}
            onHydroFeatureSelect={eventHandlers?.onHydroFeatureSelect}
          />
        </>
      )}
    </MapContainer>
  );

  // Wrap with DataOverlayProvider if enabled
  const wrappedContent = dataOverlaysEnabled ? (
    <DataOverlayProvider
      overlays={dataOverlays?.overlays}
      defaultVisibility={dataOverlays?.defaultVisibility}
    >
      {mapContent}
    </DataOverlayProvider>
  ) : (
    mapContent
  );

  return (
    <div className={`acb-map-wrapper ${className || ''}`} style={containerStyle}>
      {wrappedContent}
    </div>
  );
});

Map.displayName = 'Map';
