import { useEffect, useCallback } from 'react';
import { FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import type { MapControlsProps, DrawCreatedEvent, DrawEditedEvent, DrawDeletedEvent } from '../../types/map';
import { MeasureControl } from './plugins/MeasureControl';
import { ClickForecastControl } from './plugins/ClickForecastControl';

// Import leaflet-draw styles
import 'leaflet-draw/dist/leaflet.draw.css';

/**
 * MapControls component handles drawing, measurement, and click forecast controls
 */
export function MapControls({
  drawing,
  measure,
  clickForecast,
  units,
  eventHandlers,
  drawnItemsRef,
  initialGeoJSON,
}: MapControlsProps) {
  const map = useMap();

  // Hide draw actions on mobile to prevent duplicate icon issue
  useEffect(() => {
    const hideDrawActions = () => {
      const actions = document.querySelectorAll('.leaflet-draw-actions');
      actions.forEach((action) => {
        const el = action as HTMLElement;
        // Only hide if not actively drawing (no enabled button)
        const parent = el.closest('li');
        if (parent && !parent.classList.contains('leaflet-draw-toolbar-button-enabled')) {
          el.style.display = 'none';
        }
      });
    };

    // Run on mount and when draw tools change
    hideDrawActions();

    // Also run after a short delay to catch any late rendering
    const timer = setTimeout(hideDrawActions, 100);

    // Listen for draw events to show/hide actions appropriately
    map.on('draw:drawstart', () => {
      // Allow actions to show when actively drawing
    });

    map.on('draw:drawstop draw:editstop draw:deletestop', hideDrawActions);

    return () => {
      clearTimeout(timer);
      map.off('draw:drawstop draw:editstop draw:deletestop', hideDrawActions);
    };
  }, [map]);

  // Load initial GeoJSON if provided
  useEffect(() => {
    if (initialGeoJSON && drawnItemsRef.current) {
      try {
        L.geoJSON(initialGeoJSON, {
          onEachFeature: (_feature, layer) => {
            drawnItemsRef.current?.addLayer(layer);
          },
        });
      } catch (error) {
        console.error('Failed to load initial GeoJSON:', error);
      }
    }
  }, [initialGeoJSON, drawnItemsRef]);

  // Handle draw:created event
  const handleCreated = useCallback(
    (e: any) => {
      const layer = e.layer;
      const layerType = e.layerType;

      // The layer is automatically added to the FeatureGroup by EditControl
      // We just need to notify the parent

      if (eventHandlers?.onDrawCreated) {
        const geoJSON = layer.toGeoJSON?.() || null;
        const event: DrawCreatedEvent = {
          layerType,
          layer,
          geoJSON,
        };
        eventHandlers.onDrawCreated(event);
      }
    },
    [eventHandlers]
  );

  // Handle draw:edited event
  const handleEdited = useCallback(
    (e: any) => {
      if (eventHandlers?.onDrawEdited) {
        const layers: L.Layer[] = [];
        const features: GeoJSON.Feature[] = [];

        e.layers.eachLayer((layer: any) => {
          layers.push(layer);
          if (layer.toGeoJSON) {
            features.push(layer.toGeoJSON());
          }
        });

        const event: DrawEditedEvent = {
          layers,
          geoJSON: { type: 'FeatureCollection', features },
        };
        eventHandlers.onDrawEdited(event);
      }
    },
    [eventHandlers]
  );

  // Handle draw:deleted event
  const handleDeleted = useCallback(
    (e: any) => {
      if (eventHandlers?.onDrawDeleted) {
        const layers: L.Layer[] = [];
        e.layers.eachLayer((layer: L.Layer) => {
          layers.push(layer);
        });

        const event: DrawDeletedEvent = {
          layers,
        };
        eventHandlers.onDrawDeleted(event);
      }
    },
    [eventHandlers]
  );

  // Handle draw:drawstart event
  const handleDrawStart = useCallback(
    (e: any) => {
      if (eventHandlers?.onDrawStart) {
        eventHandlers.onDrawStart(e.layerType);
      }
    },
    [eventHandlers]
  );

  // Handle draw:drawstop event
  const handleDrawStop = useCallback(() => {
    if (eventHandlers?.onDrawStop) {
      eventHandlers.onDrawStop();
    }
  }, [eventHandlers]);

  // Store ref to feature group
  const handleFeatureGroupRef = useCallback(
    (ref: L.FeatureGroup | null) => {
      drawnItemsRef.current = ref;
    },
    [drawnItemsRef]
  );

  // Build draw options from props
  const getDrawOptions = () => {
    if (!drawing?.enabled) {
      return false;
    }

    const drawConfig = drawing.draw;
    const shapeOptions = drawing.shapeOptions || {
      color: '#3b82f6',
      weight: 2,
      fillOpacity: 0.2,
    };

    // Default: all tools enabled
    const defaultTools = {
      polyline: { shapeOptions },
      polygon: { shapeOptions },
      rectangle: { shapeOptions },
      circle: { shapeOptions },
      marker: {},
      circlemarker: {},
    };

    if (!drawConfig) {
      return defaultTools;
    }

    return {
      polyline: drawConfig.polyline === false ? false : { shapeOptions },
      polygon: drawConfig.polygon === false ? false : { shapeOptions },
      rectangle: drawConfig.rectangle === false ? false : { shapeOptions },
      circle: drawConfig.circle === false ? false : { shapeOptions },
      marker: drawConfig.marker === false ? false : {},
      circlemarker: drawConfig.circlemarker === false ? false : {},
    };
  };

  // Build edit options from props
  const getEditOptions = () => {
    if (!drawing?.enabled) {
      return false;
    }

    const editConfig = drawing.edit;
    if (!editConfig) {
      // Default: edit and remove enabled
      return {
        edit: {},
        remove: {},
      };
    }

    return {
      edit: editConfig.edit === false ? false : {},
      remove: editConfig.remove === false ? false : {},
    };
  };

  return (
    <>
      {/* Feature Group for drawn items */}
      <FeatureGroup ref={handleFeatureGroupRef}>
        {drawing?.enabled && (
          <EditControl
            position={drawing.position || 'topright'}
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            onDrawStart={handleDrawStart}
            onDrawStop={handleDrawStop}
            draw={getDrawOptions()}
            edit={getEditOptions()}
          />
        )}
      </FeatureGroup>

      {/* Measure Control */}
      {measure?.enabled && (
        <MeasureControl
          position={measure.position || 'topleft'}
          color={measure.color || '#FF0080'}
          distanceUnit={units?.distance || 'metric'}
          areaUnit={units?.area || 'metric'}
        />
      )}

      {/* Click Forecast Control */}
      {clickForecast?.enabled && (
        <ClickForecastControl
          position={clickForecast.position || 'topright'}
          forecastHours={clickForecast.forecastHours || 48}
          units={clickForecast.units || (units?.distance === 'imperial' ? 'imperial' : 'metric')}
          popupMaxWidth={clickForecast.popupMaxWidth}
          popupMaxHeight={clickForecast.popupMaxHeight}
          autoPan={clickForecast.autoPan}
          onForecastFetched={eventHandlers?.onClickForecastFetched}
          onModeChange={eventHandlers?.onClickForecastModeChange}
          onError={eventHandlers?.onError}
        />
      )}
    </>
  );
}
