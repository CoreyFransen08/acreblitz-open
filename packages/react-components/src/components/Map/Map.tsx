import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { Map as LeafletMap, FeatureGroup } from 'leaflet';
import type { MapProps, MapClickEvent, MapMoveEvent } from '../../types/map';
import { createLayerConfig } from '../../utils/mapLayers';
import { MapSkeleton } from './MapSkeleton';
import { MapContext } from './MapContext';

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

// Import child components (they'll use useNativeMap from MapContext)
import { MapLayers } from './MapLayers';
import { MapControls } from './MapControls';
import { GeoJSONLayer } from './GeoJSONLayer';

/**
 * Map component using native Leaflet
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
    clickForecast,
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
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const drawnItemsRef = useRef<FeatureGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Expose map instance via ref
  useImperativeHandle<LeafletMap | null, LeafletMap | null>(ref, () => mapInstance, [mapInstance]);

  // Check if we're on the client side (for SSR safety)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize the Leaflet map
  useEffect(() => {
    // Don't initialize on server or if container doesn't exist
    if (!isClient || !containerRef.current) return;

    // Don't re-initialize if map already exists
    if (mapRef.current) return;

    try {
      // Create the map instance
      const map = L.map(containerRef.current, {
        center: center as L.LatLngExpression,
        zoom,
        minZoom,
        maxZoom,
        maxBounds: maxBounds as L.LatLngBoundsExpression | undefined,
        scrollWheelZoom,
        doubleClickZoom,
        dragging,
        zoomControl: false, // We'll add controls separately
        attributionControl: false,
      });

      mapRef.current = map;
      setMapInstance(map);

      // Fit to bounds if provided
      if (bounds) {
        map.fitBounds(bounds as L.LatLngBoundsExpression);
      }

      // Notify parent that map is ready
      eventHandlers?.onReady?.(map);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize map'));
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
      }
    };
  }, [isClient]); // Only re-run when isClient changes

  // Handle map event listeners
  useEffect(() => {
    if (!mapInstance) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (eventHandlers?.onClick) {
        const event: MapClickEvent = {
          latlng: { lat: e.latlng.lat, lng: e.latlng.lng },
          containerPoint: { x: e.containerPoint.x, y: e.containerPoint.y },
          originalEvent: e.originalEvent,
        };
        eventHandlers.onClick(event);
      }
    };

    const handleMoveEnd = () => {
      if (eventHandlers?.onMoveEnd) {
        const center = mapInstance.getCenter();
        const event: MapMoveEvent = {
          center: { lat: center.lat, lng: center.lng },
          bounds: mapInstance.getBounds(),
          zoom: mapInstance.getZoom(),
        };
        eventHandlers.onMoveEnd(event);
      }
    };

    const handleZoomEnd = () => {
      if (eventHandlers?.onZoomEnd) {
        const center = mapInstance.getCenter();
        const event: MapMoveEvent = {
          center: { lat: center.lat, lng: center.lng },
          bounds: mapInstance.getBounds(),
          zoom: mapInstance.getZoom(),
        };
        eventHandlers.onZoomEnd(event);
      }
    };

    mapInstance.on('click', handleClick);
    mapInstance.on('moveend', handleMoveEnd);
    mapInstance.on('zoomend', handleZoomEnd);

    return () => {
      mapInstance.off('click', handleClick);
      mapInstance.off('moveend', handleMoveEnd);
      mapInstance.off('zoomend', handleZoomEnd);
    };
  }, [mapInstance, eventHandlers]);

  // Handle native controls (zoom, scale, attribution)
  useEffect(() => {
    if (!mapInstance) return;

    const controls: L.Control[] = [];

    if (showZoomControl) {
      const zoomControl = L.control.zoom({ position: 'topleft' });
      zoomControl.addTo(mapInstance);
      controls.push(zoomControl);
    }

    if (showScaleControl) {
      const scaleControl = L.control.scale({ position: 'bottomleft' });
      scaleControl.addTo(mapInstance);
      controls.push(scaleControl);
    }

    if (showAttributionControl) {
      const attributionControl = L.control.attribution({ position: 'bottomright' });
      attributionControl.addTo(mapInstance);
      controls.push(attributionControl);
    }

    return () => {
      controls.forEach((control) => control.remove());
    };
  }, [mapInstance, showZoomControl, showScaleControl, showAttributionControl]);

  // Container styles
  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    ...style,
  };

  // Prepare layer config
  const layerConfig = createLayerConfig(layers);

  // Show loading state (before client-side hydration)
  if (!isClient) {
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

  // Child components that need map access
  const mapChildren = mapInstance ? (
    <>
      {/* Layers */}
      <MapLayers layers={layerConfig} showLayerControl={showLayerControl} />

      {/* GeoJSON Layer (display-only when drawing is disabled) */}
      {initialGeoJSON && !drawing?.enabled && <GeoJSONLayer data={initialGeoJSON} />}

      {/* Drawing, Measurement, and Forecast Controls */}
      <MapControls
        drawing={drawing}
        measure={measure}
        clickForecast={clickForecast}
        units={units}
        eventHandlers={eventHandlers}
        drawnItemsRef={drawnItemsRef}
        initialGeoJSON={drawing?.enabled ? initialGeoJSON : undefined}
      />

      {/* Data Overlay Components */}
      {dataOverlaysEnabled && (
        <>
          {showDataOverlayPanel && <DataOverlayPanel {...dataOverlays?.panelConfig} />}
          <DataOverlayRenderer
            onSoilFeatureClick={eventHandlers?.onSoilFeatureClick}
            onSoilFeatureSelect={eventHandlers?.onSoilFeatureSelect}
            onHydroFeatureClick={eventHandlers?.onHydroFeatureClick}
            onHydroFeatureSelect={eventHandlers?.onHydroFeatureSelect}
          />
        </>
      )}
    </>
  ) : null;

  // Wrap content with providers
  const content = (
    <MapContext.Provider value={mapInstance ? { map: mapInstance } : null}>
      {/* Map container div */}
      <div
        ref={containerRef}
        className="acb-map-container"
        style={{ width: '100%', height: '100%' }}
      />
      {/* Child components rendered outside map div but with context access */}
      {mapChildren}
    </MapContext.Provider>
  );

  // Wrap with DataOverlayProvider if enabled
  const wrappedContent = dataOverlaysEnabled ? (
    <DataOverlayProvider
      overlays={dataOverlays?.overlays}
      defaultVisibility={dataOverlays?.defaultVisibility}
    >
      {content}
    </DataOverlayProvider>
  ) : (
    content
  );

  return (
    <div ref={wrapperRef} className={`acb-map-wrapper ${className || ''}`} style={containerStyle}>
      {wrappedContent}
    </div>
  );
});

Map.displayName = 'Map';
