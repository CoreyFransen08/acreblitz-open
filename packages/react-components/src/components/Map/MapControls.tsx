import { useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import type { MapControlsProps, DrawCreatedEvent, DrawEditedEvent, DrawDeletedEvent } from '../../types/map';
import { MeasureControl } from './plugins/MeasureControl';
import { ClickForecastControl } from './plugins/ClickForecastControl';
import { useNativeMap } from './MapContext';

// Import leaflet-draw styles
import 'leaflet-draw/dist/leaflet.draw.css';

/**
 * MapControls component handles drawing, measurement, and click forecast controls
 * Uses native Leaflet instead of react-leaflet
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
  const map = useNativeMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  // Initialize drawing functionality
  useEffect(() => {
    if (!drawing?.enabled) return;

    // Create feature group for drawn items
    const drawnItems = L.featureGroup().addTo(map);
    featureGroupRef.current = drawnItems;
    drawnItemsRef.current = drawnItems;

    // Build draw options
    const shapeOptions = drawing.shapeOptions || {
      color: '#3b82f6',
      weight: 2,
      fillOpacity: 0.2,
    };

    const drawConfig = drawing.draw;
    const drawOptions: L.Control.DrawConstructorOptions['draw'] = drawConfig
      ? {
          polyline: drawConfig.polyline === false ? false : { shapeOptions },
          polygon: drawConfig.polygon === false ? false : { shapeOptions },
          rectangle: drawConfig.rectangle === false ? false : { shapeOptions },
          circle: drawConfig.circle === false ? false : { shapeOptions },
          marker: drawConfig.marker === false ? false : {},
          circlemarker: drawConfig.circlemarker === false ? false : {},
        }
      : {
          polyline: { shapeOptions },
          polygon: { shapeOptions },
          rectangle: { shapeOptions },
          circle: { shapeOptions },
          marker: {},
          circlemarker: {},
        };

    // Build edit options
    const editConfig = drawing.edit;
    const editOptions: L.Control.DrawConstructorOptions['edit'] = {
      featureGroup: drawnItems,
      edit: editConfig?.edit === false ? false : {},
      remove: editConfig?.remove === false ? false : {},
    };

    // Create draw control
    const drawControl = new L.Control.Draw({
      position: drawing.position || 'topright',
      draw: drawOptions,
      edit: editOptions,
    });

    drawControlRef.current = drawControl;
    map.addControl(drawControl);

    // Event handlers
    const handleCreated = (e: L.DrawEvents.Created) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);

      if (eventHandlers?.onDrawCreated) {
        const geoJSON = (layer as any).toGeoJSON?.() || null;
        const event: DrawCreatedEvent = {
          layerType: e.layerType,
          layer,
          geoJSON,
        };
        eventHandlers.onDrawCreated(event);
      }
    };

    const handleEdited = (e: L.DrawEvents.Edited) => {
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
    };

    const handleDeleted = (e: L.DrawEvents.Deleted) => {
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
    };

    const handleDrawStart = (e: L.DrawEvents.DrawStart) => {
      if (eventHandlers?.onDrawStart) {
        eventHandlers.onDrawStart(e.layerType);
      }
    };

    const handleDrawStop = () => {
      if (eventHandlers?.onDrawStop) {
        eventHandlers.onDrawStop();
      }
    };

    // Attach event listeners
    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);
    map.on(L.Draw.Event.DRAWSTART, handleDrawStart);
    map.on(L.Draw.Event.DRAWSTOP, handleDrawStop);

    // Cleanup
    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.off(L.Draw.Event.DRAWSTART, handleDrawStart);
      map.off(L.Draw.Event.DRAWSTOP, handleDrawStop);

      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }

      if (featureGroupRef.current) {
        map.removeLayer(featureGroupRef.current);
        featureGroupRef.current = null;
        drawnItemsRef.current = null;
      }
    };
  }, [map, drawing?.enabled, drawing?.position, drawing?.draw, drawing?.edit, drawing?.shapeOptions, eventHandlers, drawnItemsRef]);

  // Load initial GeoJSON into feature group when drawing is enabled
  useEffect(() => {
    if (!initialGeoJSON || !featureGroupRef.current) return;

    try {
      L.geoJSON(initialGeoJSON, {
        onEachFeature: (_feature, layer) => {
          featureGroupRef.current?.addLayer(layer);
        },
      });
    } catch (error) {
      console.error('Failed to load initial GeoJSON:', error);
    }
  }, [initialGeoJSON]);

  // Hide draw actions on mobile to prevent duplicate icon issue
  useEffect(() => {
    if (!drawing?.enabled) return;

    const hideDrawActions = () => {
      const actions = document.querySelectorAll('.leaflet-draw-actions');
      actions.forEach((action) => {
        const el = action as HTMLElement;
        const parent = el.closest('li');
        if (parent && !parent.classList.contains('leaflet-draw-toolbar-button-enabled')) {
          el.style.display = 'none';
        }
      });
    };

    hideDrawActions();
    const timer = setTimeout(hideDrawActions, 100);

    map.on('draw:drawstop draw:editstop draw:deletestop', hideDrawActions);

    return () => {
      clearTimeout(timer);
      map.off('draw:drawstop draw:editstop draw:deletestop', hideDrawActions);
    };
  }, [map, drawing?.enabled]);

  return (
    <>
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
