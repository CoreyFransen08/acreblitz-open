/**
 * Leaflet.Measure Plugin
 * Based on https://github.com/ptma/Leaflet.Measure
 *
 * Modified for TypeScript and ES module usage
 * Added support for multiple unit systems (metric, imperial, acres, hectares)
 */

import L from 'leaflet';
import type { DistanceUnit, AreaUnit } from '../../../../types/map';

// ============================================
// Unit Conversion Constants
// ============================================

const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;
const SQ_METERS_PER_SQ_FOOT = 0.09290304;
const SQ_METERS_PER_SQ_MILE = 2589988.11;
const SQ_METERS_PER_ACRE = 4046.8564224;
const SQ_METERS_PER_HECTARE = 10000;

// ============================================
// Unit Formatters
// ============================================

export interface UnitConfig {
  distance: DistanceUnit;
  area: AreaUnit;
}

const DEFAULT_UNIT_CONFIG: UnitConfig = {
  distance: 'metric',
  area: 'metric',
};

/**
 * Format distance value based on unit system
 */
export function formatDistance(meters: number, unit: DistanceUnit = 'metric'): string {
  if (unit === 'imperial') {
    const feet = meters / METERS_PER_FOOT;
    if (feet < 5280) {
      return `${numberFormat(feet, 0)} ft`;
    }
    const miles = meters / METERS_PER_MILE;
    return `${numberFormat(miles, 2)} mi`;
  }

  // Metric
  if (meters < 1000) {
    return `${numberFormat(meters, 0)} m`;
  }
  return `${numberFormat(meters / 1000, 2)} km`;
}

/**
 * Format area value based on unit system
 */
export function formatArea(sqMeters: number, unit: AreaUnit = 'metric'): string {
  switch (unit) {
    case 'imperial': {
      const sqFeet = sqMeters / SQ_METERS_PER_SQ_FOOT;
      if (sqFeet < 27878400) { // Less than 1 sq mile
        return `${numberFormat(sqFeet, 0)} ft²`;
      }
      const sqMiles = sqMeters / SQ_METERS_PER_SQ_MILE;
      return `${numberFormat(sqMiles, 2)} mi²`;
    }

    case 'acres': {
      const acres = sqMeters / SQ_METERS_PER_ACRE;
      if (acres < 0.1) {
        // Show in sq feet for very small areas
        const sqFeet = sqMeters / SQ_METERS_PER_SQ_FOOT;
        return `${numberFormat(sqFeet, 0)} ft²`;
      }
      return `${numberFormat(acres, 2)} acres`;
    }

    case 'hectares': {
      const hectares = sqMeters / SQ_METERS_PER_HECTARE;
      if (hectares < 0.1) {
        // Show in sq meters for very small areas
        return `${numberFormat(sqMeters, 0)} m²`;
      }
      return `${numberFormat(hectares, 2)} ha`;
    }

    case 'metric':
    default: {
      if (sqMeters < 1000000) {
        return `${numberFormat(sqMeters, 0)} m²`;
      }
      return `${numberFormat(sqMeters / 1000000, 2)} km²`;
    }
  }
}

/**
 * Format number with thousands separator and decimals
 */
function numberFormat(num: number, decimals = 2): string {
  const thousandsSep = ',';
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(+num || 0);
  const intPart = parseInt(absNum.toFixed(decimals), 10) + '';
  const j = intPart.length > 3 ? intPart.length % 3 : 0;

  return [
    sign,
    j ? intPart.substr(0, j) + thousandsSep : '',
    intPart.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + thousandsSep),
    decimals
      ? '.' +
        Math.abs(absNum - parseInt(intPart))
          .toFixed(decimals)
          .slice(2)
      : '',
  ].join('');
}

// Extend the L namespace for our custom classes
declare module 'leaflet' {
  namespace Measure {
    let linearMeasurement: string;
    let areaMeasurement: string;
    let start: string;
    let meter: string;
    let meterDecimals: number;
    let kilometer: string;
    let kilometerDecimals: number;
    let squareMeter: string;
    let squareMeterDecimals: number;
    let squareKilometers: string;
    let squareKilometersDecimals: number;
  }

  namespace control {
    function measure(options?: MeasureControlOptions): Control.Measure;
  }

  namespace Control {
    class Measure extends Control {
      constructor(options?: MeasureControlOptions);
    }
  }

  interface MeasureControlOptions extends ControlOptions {
    title?: string;
    collapsed?: boolean;
    color?: string;
    distanceUnit?: DistanceUnit;
    areaUnit?: AreaUnit;
  }
}

// Initialize Measure namespace (kept for backwards compatibility)
L.Measure = {
  linearMeasurement: 'Distance measurement',
  areaMeasurement: 'Area measurement',
  start: 'Start',
  meter: 'm',
  meterDecimals: 0,
  kilometer: 'km',
  kilometerDecimals: 2,
  squareMeter: 'm\u00B2',
  squareMeterDecimals: 0,
  squareKilometers: 'km\u00B2',
  squareKilometersDecimals: 2,
};

// MeasureLable class for displaying measurement results
const MeasureLable = L.Layer.extend({
  options: {
    offset: new L.Point(0, 30),
    latlng: null as L.LatLng | null,
    content: '',
    className: '',
  },

  initialize(options: Record<string, unknown>) {
    L.Util.setOptions(this, options);
  },

  onAdd(map: L.Map) {
    this._map = map;
    if (!this._container) this._initLayout();
    (map as any)._panes.popupPane.appendChild(this._container);
    map.on('viewreset', this._updatePosition, this);
    if (L.Browser.any3d) {
      map.on('zoomanim', this._zoomAnimation, this);
    }
    this._update();
    return this._container;
  },

  onRemove(map: L.Map) {
    (map as any)._panes.popupPane.removeChild(this._container);
    map.off('viewreset', this._updatePosition, this);
    map.off('zoomanim', this._zoomAnimation, this);
    this._map = null;
  },

  setLatLng(latlng: L.LatLngExpression) {
    this.options.latlng = L.latLng(latlng);
    this._updatePosition();
    return this;
  },

  setContent(content: string) {
    this.options.content = content;
    this._updateContent();
    return this;
  },

  _initLayout() {
    this._container = L.DomUtil.create('div', this.options.className);
    this._contentNode = L.DomUtil.create('div', 'content', this._container);
  },

  _update() {
    if (this._map) {
      this._updateContent();
      this._updatePosition();
    }
  },

  _updateContent() {
    if (this.options.content) {
      if (typeof this.options.content === 'string') {
        this._contentNode.innerHTML = this.options.content;
      } else {
        this._contentNode.innerHTML = '';
        this._contentNode.appendChild(this.options.content);
      }
    }
  },

  _updatePosition() {
    const point = this._map!.latLngToLayerPoint(this.options.latlng);
    const is3D = L.Browser.any3d;
    const offset = this.options.offset;
    if (is3D) L.DomUtil.setPosition(this._container, point);
    this._containerBottom = -offset.y - (is3D ? 0 : point.y);
    this._containerLeft = offset.x + (is3D ? 0 : point.x);
    this._container.style.bottom = this._containerBottom + 'px';
    this._container.style.left = this._containerLeft + 'px';
  },

  _zoomAnimation(a: any) {
    const pos = this._map!._latLngToNewLayerPoint(this.options.latlng, a.zoom, a.center);
    L.DomUtil.setPosition(this._container, pos);
  },

  enableClose() {
    this._closeButton = L.DomUtil.create('span', 'close', this._container);
    this._closeButton.innerHTML =
      '<svg class="icon" viewBox="0 0 40 40"><path stroke="#FF0000" stroke-width="3" d="M 10,10 L 30,30 M 30,10 L 10,30" /></svg>';
    return this._closeButton;
  },
});

// MeasureAction handler
const MeasureAction = L.Handler.extend({
  options: {
    color: '#FF0080',
    model: 'distance', // 'area' or 'distance'
    distanceUnit: 'metric' as DistanceUnit,
    areaUnit: 'metric' as AreaUnit,
  },

  initialize(map: L.Map, options: Record<string, unknown>) {
    this._map = map;
    (map as any)._measureHandler = this;
    L.Util.setOptions(this, options);
  },

  addHooks() {
    this._activeMeasure();
  },

  removeHooks() {},

  _activeMeasure() {
    const mapHandler = (this._map as any)._measureHandler;
    if (mapHandler._measurementStarted) {
      mapHandler._finishMeasure();
    }
    if (this._measurementStarted) {
      this._finishMeasure();
    } else {
      this._enableMeasure();
    }
  },

  _onMouseClick(event: L.LeafletMouseEvent) {
    const latlng = event.latlng;
    if (this._lastPoint && latlng.equals(this._lastPoint)) {
      return;
    }
    if (this._trail.points.length > 0) {
      const points = this._trail.points;
      points.push(latlng);
      const length = points.length;
      this._totalDistance += this._getDistance(points[length - 2], points[length - 1]);
      this._addMeasurePoint(latlng);
      this._addMarker(latlng);
      if (this.options.model !== 'area') {
        this._addLable(latlng, this._getDistanceString(this._totalDistance), 'leaflet-measure-lable');
      }
    } else {
      this._totalDistance = 0;
      this._addMeasurePoint(latlng);
      this._addMarker(latlng);
      if (this.options.model !== 'area') {
        this._addLable(latlng, L.Measure.start, 'leaflet-measure-lable');
      }
      this._trail.points.push(latlng);
    }
    this._lastPoint = latlng;
    this._startMove = false;
  },

  _onMouseMove(event: L.LeafletMouseEvent) {
    const latlng = event.latlng;
    if (this._trail.points.length > 0) {
      if (this._startMove) {
        this._directPath.setLatLngs(this._trail.points.concat(latlng));
      } else {
        this._directPath.setLatLngs([latlng]);
        this._startMove = true;
      }
    }
  },

  _enableMeasure() {
    const map = this._map;
    this._trail = {
      points: [] as L.LatLng[],
      overlays: L.featureGroup(),
      canvas: (map.options as any).preferCanvas || false,
    };
    if ((map.options as any).preferCanvas) {
      (map.options as any).preferCanvas = false;
    }
    map.addLayer(this._trail.overlays);

    L.DomUtil.addClass(map.getContainer(), 'leaflet-measure-map');
    this._measurementStarted = true;
    map.on('click', this._onMouseClick, this);
    map.on('dblclick contextmenu', this._finishMeasure, this);
    map.doubleClickZoom.disable();
    map.on('mousemove', this._onMouseMove, this);
  },

  _disableMeasure() {
    const map = this._map;
    L.DomUtil.removeClass(map.getContainer(), 'leaflet-measure-map');
    map.off('click', this._onMouseClick, this);
    map.off('dblclick contextmenu', this._finishMeasure, this);
    map.off('mousemove', this._onMouseMove, this);
    map.doubleClickZoom.enable();
    this._measurementStarted = this._startMove = false;
    this.disable();
  },

  _finishMeasure(event?: L.LeafletMouseEvent) {
    if (this._trail.points.length > 0) {
      if (this._trail.points.length > 1) {
        if (!event || event.type === 'contextmenu') {
          this._directPath.setLatLngs(this._trail.points);
        }
        if (this.options.model === 'area') {
          this._addLable(
            this._lastPoint,
            this._getAreaString(this._trail.points),
            'leaflet-measure-lable',
            true
          );
        } else {
          this._addLable(
            this._lastPoint,
            this._getDistanceString(this._totalDistance),
            'leaflet-measure-lable',
            true
          );
        }
        if (this._directPath) this._map.removeLayer(this._directPath);
      } else {
        this._clearOverlay();
      }
    }
    this._disableMeasure();
  },

  _resetDirectPath(latlng: L.LatLng) {
    if (!this._directPath) {
      if (this.options.model === 'area') {
        this._directPath = new L.Polygon([latlng], {
          weight: 2,
          color: this.options.color,
          dashArray: '5, 5',
          fillOpacity: 0,
          interactive: false,
        });
      } else {
        this._directPath = new L.Polyline([latlng], {
          weight: 2,
          color: this.options.color,
          dashArray: '5, 5',
          interactive: false,
        });
      }
      this._trail.overlays.addLayer(this._directPath);
    } else {
      this._directPath.addLatLng(latlng);
    }
  },

  _addMeasurePoint(latlng: L.LatLng) {
    if (!this._measurePath) {
      if (this.options.model === 'area') {
        this._measurePath = new L.Polygon([latlng], {
          weight: 2,
          color: this.options.color,
          fillColor: this.options.color,
          fillOpacity: 0.5,
          interactive: false,
        });
      } else {
        this._measurePath = new L.Polyline([latlng], {
          weight: 2,
          color: this.options.color,
          interactive: false,
        });
      }
      this._trail.overlays.addLayer(this._measurePath);
    } else {
      this._measurePath.addLatLng(latlng);
    }
    this._resetDirectPath(latlng);
  },

  _addMarker(latLng: L.LatLng) {
    const marker = new L.CircleMarker(latLng, {
      color: this.options.color,
      opacity: 1,
      weight: 1,
      fillColor: '#FFFFFF',
      fill: true,
      fillOpacity: 1,
      radius: 3,
      interactive: false,
    });
    this._trail.overlays.addLayer(marker);
  },

  _addLable(latlng: L.LatLng, content: string, className: string, ended?: boolean) {
    const lable = new (MeasureLable as any)({
      latlng: latlng,
      content: content,
      className: className,
    });
    this._trail.overlays.addLayer(lable);
    if (ended) {
      const closeButton = lable.enableClose();
      L.DomEvent.on(closeButton, 'click', this._clearOverlay, this);
    }
  },

  _clearOverlay() {
    this._map.removeLayer(this._trail.overlays);
    this._trail.overlays = null;
    (this._map.options as any).preferCanvas = this._trail.canvas;
  },

  toRadians(deg: number) {
    return deg * (Math.PI / 180);
  },

  square(x: number) {
    return Math.pow(x, 2);
  },

  _getDistanceString(distance: number) {
    return formatDistance(distance, this.options.distanceUnit);
  },

  _getDistance(latlng1: L.LatLng, latlng2: L.LatLng) {
    const earthRadius = 6378137;
    const lat1 = this.toRadians(latlng1.lat);
    const lat2 = this.toRadians(latlng2.lat);
    const lat_dif = lat2 - lat1;
    const lng_dif = this.toRadians(latlng2.lng - latlng1.lng);
    const a =
      this.square(Math.sin(lat_dif / 2)) +
      Math.cos(lat1) * Math.cos(lat2) * this.square(Math.sin(lng_dif / 2));
    return 2 * earthRadius * Math.asin(Math.sqrt(a));
  },

  _getAreaString(points: L.LatLng[]) {
    const a = this._getArea(points);
    return formatArea(a, this.options.areaUnit);
  },

  _getArea(points: L.LatLng[]) {
    const earthRadius = 6378137;
    let area = 0;
    const len = points.length;
    let x1 = points[len - 1].lng;
    let y1 = points[len - 1].lat;
    for (let i = 0; i < len; i++) {
      const x2 = points[i].lng;
      const y2 = points[i].lat;
      area += this.toRadians(x2 - x1) * (2 + Math.sin(this.toRadians(y1)) + Math.sin(this.toRadians(y2)));
      x1 = x2;
      y1 = y2;
    }
    return Math.abs((area * earthRadius * earthRadius) / 2.0);
  },

  _numberFormat(number: number, decimals = 2) {
    const thousandsSep = ',';
    const sign = number < 0 ? '-' : '';
    const num = Math.abs(+number || 0);
    const intPart = parseInt(num.toFixed(decimals), 10) + '';
    const j = intPart.length > 3 ? intPart.length % 3 : 0;

    return [
      sign,
      j ? intPart.substr(0, j) + thousandsSep : '',
      intPart.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + thousandsSep),
      decimals
        ? '.' +
          Math.abs(num - parseInt(intPart))
            .toFixed(decimals)
            .slice(2)
        : '',
    ].join('');
  },
});

// Control.Measure class
L.Control.Measure = L.Control.extend({
  options: {
    position: 'topright' as L.ControlPosition,
    title: 'Measurement',
    collapsed: true,
    color: '#FF0080',
    distanceUnit: 'metric' as DistanceUnit,
    areaUnit: 'metric' as AreaUnit,
  },

  initialize(options: L.MeasureControlOptions) {
    L.Util.setOptions(this, options);
  },

  onAdd(map: L.Map) {
    this._map = map;
    if (!this._container) this._initLayout();
    return this._container;
  },

  _buildContainer() {
    this._container = L.DomUtil.create('div', 'leaflet-control-measure leaflet-bar leaflet-control');
    this._contents = L.DomUtil.create('div', 'leaflet-measure-contents', this._container);
    this._link = L.DomUtil.create('a', 'leaflet-measure-toggle', this._container);
    this._link.title = this.options.title || 'Measurement';
    this._link.href = '#';

    if (this.options.title) {
      const title = L.DomUtil.create('h3', '', this._contents);
      title.innerText = this.options.title;
    }

    this._buildItems();
  },

  _buildItems() {
    const ele_ul = L.DomUtil.create('ul', 'leaflet-measure-actions', this._contents);
    let ele_li = L.DomUtil.create('li', 'leaflet-measure-action', ele_ul);
    const ele_link_line = L.DomUtil.create('a', 'start', ele_li);
    ele_link_line.innerText = L.Measure.linearMeasurement;
    ele_link_line.href = '#';
    L.DomEvent.disableClickPropagation(ele_link_line);
    L.DomEvent.on(ele_link_line, 'click', this._enableMeasureLine, this);

    ele_li = L.DomUtil.create('li', 'leaflet-measure-action', ele_ul);
    const ele_link_area = L.DomUtil.create('a', 'leaflet-measure-action start', ele_li);
    ele_link_area.innerText = L.Measure.areaMeasurement;
    ele_link_area.href = '#';
    L.DomEvent.disableClickPropagation(ele_link_area);
    L.DomEvent.on(ele_link_area, 'click', this._enableMeasureArea, this);
  },

  _initLayout() {
    this._buildContainer();
    L.DomEvent.disableClickPropagation(this._container);
    L.DomEvent.disableScrollPropagation(this._container);
    if (this.options.collapsed) {
      L.DomEvent.on(
        this._container,
        {
          mouseenter: this._expand,
          mouseleave: this._collapse,
        },
        this
      );
    } else {
      this._expand();
    }
  },

  _enableMeasureLine(ev: Event) {
    L.DomEvent.stopPropagation(ev as any);
    L.DomEvent.preventDefault(ev as any);
    this._measureHandler = new (MeasureAction as any)(this._map, {
      model: 'distance',
      color: this.options.color,
      distanceUnit: this.options.distanceUnit,
      areaUnit: this.options.areaUnit,
    });
    this._measureHandler.enable();
  },

  _enableMeasureArea(ev: Event) {
    L.DomEvent.stopPropagation(ev as any);
    L.DomEvent.preventDefault(ev as any);
    this._measureHandler = new (MeasureAction as any)(this._map, {
      model: 'area',
      color: this.options.color,
      distanceUnit: this.options.distanceUnit,
      areaUnit: this.options.areaUnit,
    });
    this._measureHandler.enable();
  },

  _expand() {
    this._link.style.display = 'none';
    L.DomUtil.addClass(this._container, 'leaflet-measure-expanded');
    return this;
  },

  _collapse() {
    this._link.style.display = 'block';
    L.DomUtil.removeClass(this._container, 'leaflet-measure-expanded');
    return this;
  },
});

L.control.measure = function (options?: L.MeasureControlOptions) {
  return new L.Control.Measure(options);
};

export { MeasureAction, MeasureLable };
