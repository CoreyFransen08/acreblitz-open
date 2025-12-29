/**
 * Leaflet Click Forecast Control
 * Custom Leaflet control for toggle button
 */

import L from 'leaflet';

declare module 'leaflet' {
  namespace control {
    function clickForecast(
      options?: ClickForecastControlOptions
    ): Control.ClickForecast;
  }

  namespace Control {
    class ClickForecast extends Control {
      constructor(options?: ClickForecastControlOptions);
      setActive(active: boolean): void;
      isActive(): boolean;
    }
  }

  interface ClickForecastControlOptions extends ControlOptions {
    title?: string;
    activeTitle?: string;
    onToggle?: (active: boolean) => void;
  }
}

const ClickForecastControl = L.Control.extend({
  options: {
    position: 'topright' as L.ControlPosition,
    title: 'Click for forecast',
    activeTitle: 'Forecast mode active - click to disable',
    onToggle: undefined as ((active: boolean) => void) | undefined,
  },

  _active: false,
  _container: null as HTMLElement | null,
  _button: null as HTMLAnchorElement | null,

  initialize(options: L.ClickForecastControlOptions) {
    L.Util.setOptions(this, options);
  },

  onAdd(_map: L.Map) {
    this._container = L.DomUtil.create(
      'div',
      'leaflet-control-click-forecast leaflet-bar leaflet-control'
    );

    this._button = L.DomUtil.create(
      'a',
      'leaflet-click-forecast-toggle',
      this._container
    ) as HTMLAnchorElement;
    this._button.href = '#';
    this._button.title = this.options.title!;
    this._button.setAttribute('role', 'button');
    this._button.setAttribute('aria-label', this.options.title!);
    this._button.setAttribute('aria-pressed', 'false');

    // Prevent click propagation to map
    L.DomEvent.disableClickPropagation(this._container);
    L.DomEvent.on(this._button, 'click', this._onClick, this);

    return this._container;
  },

  onRemove(_map: L.Map) {
    if (this._button) {
      L.DomEvent.off(this._button, 'click', this._onClick, this);
    }
  },

  _onClick(e: Event) {
    L.DomEvent.preventDefault(e);
    L.DomEvent.stopPropagation(e);

    this._active = !this._active;
    this._updateButton();

    if (this.options.onToggle) {
      this.options.onToggle(this._active);
    }
  },

  _updateButton() {
    if (!this._button) return;

    if (this._active) {
      L.DomUtil.addClass(this._button, 'active');
      this._button.title = this.options.activeTitle!;
      this._button.setAttribute('aria-pressed', 'true');
    } else {
      L.DomUtil.removeClass(this._button, 'active');
      this._button.title = this.options.title!;
      this._button.setAttribute('aria-pressed', 'false');
    }
  },

  setActive(active: boolean) {
    this._active = active;
    this._updateButton();
  },

  isActive(): boolean {
    return this._active;
  },
});

L.Control.ClickForecast = ClickForecastControl;

L.control.clickForecast = function (options?: L.ClickForecastControlOptions) {
  return new ClickForecastControl(options);
};
