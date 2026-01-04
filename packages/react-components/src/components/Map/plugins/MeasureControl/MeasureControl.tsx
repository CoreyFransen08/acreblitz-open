import { useEffect } from 'react';
import L from 'leaflet';
import { useNativeMap } from '../../MapContext';
import type { DistanceUnit, AreaUnit } from '../../../../types/map';

// Import the Leaflet.Measure plugin (registers L.control.measure)
import './leaflet-measure';
import './leaflet-measure.css';

interface MeasureControlProps {
  /** Position of the measure control */
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** Color for measurement lines */
  color?: string;
  /** Control title */
  title?: string;
  /** Whether the control is collapsed by default */
  collapsed?: boolean;
  /** Distance unit for measurements (default: 'metric') */
  distanceUnit?: DistanceUnit;
  /** Area unit for measurements (default: 'metric') */
  areaUnit?: AreaUnit;
}

/**
 * MeasureControl component for distance and area measurements
 *
 * This wraps the Leaflet.Measure plugin for use with react-leaflet
 *
 * @example
 * ```tsx
 * <MeasureControl
 *   position="topleft"
 *   distanceUnit="imperial"
 *   areaUnit="acres"
 * />
 * ```
 */
export function MeasureControl({
  position = 'topleft',
  color = '#FF0080',
  title = 'Measure',
  collapsed = true,
  distanceUnit = 'metric',
  areaUnit = 'metric',
}: MeasureControlProps) {
  const map = useNativeMap();

  useEffect(() => {
    const measureControl = L.control.measure({
      position,
      color,
      title,
      collapsed,
      distanceUnit,
      areaUnit,
    });

    measureControl.addTo(map);

    return () => {
      measureControl.remove();
    };
  }, [map, position, color, title, collapsed, distanceUnit, areaUnit]);

  return null;
}
