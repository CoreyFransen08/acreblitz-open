/**
 * ClickForecastControl - Toggle button and click handler for forecast feature
 *
 * Following the MeasureControl pattern: render-less React component
 * that creates a Leaflet control and manages click events.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import { useNativeMap } from '../../MapContext';
import { renderToString } from 'react-dom/server';
import type { ClickForecastControlProps } from '../../../../types/clickForecast';
import { useMapClickForecast } from '../../../../hooks/useMapClickForecast';
import { ForecastPopupContent } from './ForecastPopupContent';

// Import the Leaflet control (registers L.control.clickForecast)
import './leaflet-click-forecast';
import './click-forecast.css';

/**
 * ClickForecastControl component for 48-hour forecast on map click
 *
 * @example
 * ```tsx
 * <ClickForecastControl
 *   position="topright"
 *   forecastHours={48}
 *   units="imperial"
 *   onForecastFetched={(data) => console.log(data)}
 * />
 * ```
 */
export function ClickForecastControl({
  position = 'topright',
  forecastHours = 48,
  units = 'imperial',
  popupMaxWidth = 400,
  popupMaxHeight = 350,
  autoPan = true,
  onForecastFetched,
  onError,
  onModeChange,
}: ClickForecastControlProps) {
  const map = useNativeMap();
  const [isActive, setIsActive] = useState(false);
  const popupRef = useRef<L.Popup | null>(null);
  const controlRef = useRef<L.Control.ClickForecast | null>(null);

  const { data, isLoading, error, fetchForecast, clearForecast } =
    useMapClickForecast({
      enabled: isActive,
      forecastHours,
      onForecastFetched,
      onError,
      onModeChange,
    });

  // Handle toggle
  const handleToggle = useCallback(
    (active: boolean) => {
      setIsActive(active);

      if (!active) {
        // Clear popup when deactivating
        if (popupRef.current) {
          map.closePopup(popupRef.current);
          popupRef.current = null;
        }
        clearForecast();
      }

      // Update map cursor
      if (active) {
        L.DomUtil.addClass(map.getContainer(), 'leaflet-click-forecast-active');
      } else {
        L.DomUtil.removeClass(
          map.getContainer(),
          'leaflet-click-forecast-active'
        );
      }
    },
    [map, clearForecast]
  );

  // Handle map click
  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (!isActive) return;

      const { lat, lng } = e.latlng;

      // Close existing popup
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }

      // Show loading popup
      const loadingContent = renderToString(
        <ForecastPopupContent
          isLoading={true}
          data={null}
          error={null}
          units={units}
        />
      );

      popupRef.current = L.popup({
        maxWidth: popupMaxWidth,
        maxHeight: popupMaxHeight,
        autoPan,
        className: 'leaflet-click-forecast-popup',
      })
        .setLatLng(e.latlng)
        .setContent(loadingContent)
        .openOn(map);

      // Fetch forecast
      fetchForecast(lat, lng);
    },
    [isActive, map, fetchForecast, units, popupMaxWidth, popupMaxHeight, autoPan]
  );

  // Update popup content when data/error changes
  useEffect(() => {
    if (!popupRef.current || !popupRef.current.isOpen()) return;

    const content = renderToString(
      <ForecastPopupContent
        isLoading={isLoading}
        data={data}
        error={error}
        units={units}
      />
    );

    popupRef.current.setContent(content);
  }, [data, isLoading, error, units]);

  // Create control on mount
  useEffect(() => {
    controlRef.current = L.control.clickForecast({
      position,
      onToggle: handleToggle,
    });

    controlRef.current.addTo(map);

    return () => {
      if (controlRef.current) {
        controlRef.current.remove();
      }
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
      L.DomUtil.removeClass(
        map.getContainer(),
        'leaflet-click-forecast-active'
      );
    };
  }, [map, position, handleToggle]);

  // Attach click handler
  useEffect(() => {
    if (isActive) {
      map.on('click', handleMapClick);
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, isActive, handleMapClick]);

  // Sync external state changes
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.setActive(isActive);
    }
  }, [isActive]);

  return null;
}
