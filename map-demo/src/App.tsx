/**
 * AcreBlitz Map Component Demo
 *
 * This demo showcases all features of the @acreblitz/react-components Map component.
 * The Map is built on Leaflet and provides agricultural and weather-focused features.
 *
 * Open your browser's developer console to see event logs as you interact with the map.
 */

import {
  Map,
  DEFAULT_LAYERS,
  WEATHER_RADAR_OVERLAY_CONFIG,
  SSURGO_OVERLAY_CONFIG,
  HYDRO_3DHP_OVERLAY_CONFIG,
} from '@acreblitz/react-components';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ========================================
          HEADER SECTION
          ======================================== */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* AcreBlitz Logo */}
          <img
            src="/acreblitz_favicon.png"
            alt="AcreBlitz"
            className="h-10 w-10"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Map Component Demo
            </h1>
            <p className="text-sm text-gray-600">
              Interactive map with drawing, measurement, weather, and data overlay features
            </p>
          </div>
        </div>
      </header>

      {/* ========================================
          MAIN CONTENT - MAP
          ======================================== */}
      <main className="flex-1 flex flex-col">
        <Map
          /**
           * ====================================
           * UNITS CONFIGURATION
           * ====================================
           * Set the measurement units used throughout the map.
           * Applies to measurement tools, area calculations, etc.
           *
           * distance: 'metric' | 'imperial' - For distance measurements
           * area: 'metric' | 'imperial' | 'acres' | 'hectares' - For area measurements
           */
          units={{ distance: 'imperial', area: 'acres' }}

          /**
           * ====================================
           * POSITION & VIEW CONFIGURATION
           * ====================================
           * These props control the initial map view and navigation constraints.
           *
           * center: [latitude, longitude] - Initial center point
           * zoom: number - Initial zoom level (0-18, higher = more zoomed in)
           * minZoom/maxZoom: Constrain zoom range
           * bounds: Set initial view to fit specific bounds
           * maxBounds: Restrict panning to specific area
           */
          center={[39.7456, -97.0892]} // Kansas - center of Continental US
          zoom={12}

          /**
           * ====================================
           * SIZING & STYLING
           * ====================================
           * Control the map container dimensions and appearance.
           *
           * height: CSS height value (required for map to display)
           * width: CSS width value (defaults to '100%')
           * className: Additional CSS classes for the container
           * style: Inline styles for the container
           */
          height="calc(100vh - 130px)" // Full height minus header and feature list
          width="100%"

          /**
           * ====================================
           * MAP CONTROLS
           * ====================================
           * Toggle visibility of built-in map controls.
           *
           * showLayerControl: Layer switcher (satellite, street, topo)
           * showZoomControl: +/- zoom buttons
           * showScaleControl: Scale indicator bar
           * showAttributionControl: Data source attribution
           */
          showLayerControl={true}
          showZoomControl={true}
          showScaleControl={true}
          showAttributionControl={true}

          /**
           * ====================================
           * INTERACTION OPTIONS
           * ====================================
           * Enable/disable user interaction methods.
           *
           * scrollWheelZoom: Zoom with mouse wheel
           * doubleClickZoom: Zoom on double-click
           * dragging: Pan by dragging the map
           */
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}

          /**
           * ====================================
           * DRAWING TOOLS
           * ====================================
           * Enable interactive shape drawing on the map.
           *
           * enabled: Show/hide drawing controls
           * position: Control placement ('topleft', 'topright', 'bottomleft', 'bottomright')
           * draw: Configure which tools are available
           *   - polygon: Draw multi-point polygons
           *   - rectangle: Draw rectangles
           *   - marker: Place point markers
           *   - polyline: Draw lines/paths
           *   - circle: Draw circles
           *   - circlemarker: Draw small circle markers
           * edit: Configure edit/delete capabilities
           *   - edit: Allow editing existing shapes
           *   - remove: Allow deleting shapes
           * shapeOptions: Default styling for drawn shapes
           *
           * Events: onDrawCreated, onDrawEdited, onDrawDeleted
           */
          drawing={{
            enabled: true,
            position: 'topleft',
            // Optionally limit available tools:
            // draw: {
            //   polygon: true,
            //   rectangle: true,
            //   marker: true,
            //   polyline: false,
            //   circle: false,
            //   circlemarker: false,
            // },
          }}

          /**
           * ====================================
           * MEASUREMENT TOOLS
           * ====================================
           * Measure distances and areas directly on the map.
           *
           * enabled: Show/hide measurement control
           * position: Control placement ('topleft', 'topright', 'bottomleft', 'bottomright')
           * color: Line/fill color for measurements (default: '#FF0080')
           *
           * Events: onMeasureComplete
           *
           * How to use:
           * 1. Hover over the ruler icon to expand
           * 2. Click "Distance" or "Area" measurement
           * 3. Click points on the map
           * 4. Double-click or right-click to finish
           */
          measure={{
            enabled: true,
            position: 'topleft',
            color: '#FF0080',
          }}

          /**
           * ====================================
           * CLICK-TO-FORECAST
           * ====================================
           * Get 48-hour NWS weather forecast by clicking anywhere on the map.
           * Only works within Continental US (CONUS).
           *
           * enabled: Show/hide forecast toggle button
           * position: Button placement
           * forecastHours: Hours to display (default 48, max 168)
           * units: 'imperial' | 'metric'
           * popupMaxWidth/popupMaxHeight: Popup dimensions
           * autoPan: Auto-pan map to show full popup
           *
           * Events: onClickForecastFetched, onClickForecastModeChange
           *
           * How to use:
           * 1. Click the cloud/sun toggle button (turns blue when active)
           * 2. Click anywhere on the map (within CONUS)
           * 3. A popup shows 48-hour forecast with rain accumulation
           */
          clickForecast={{
            enabled: true,
            position: 'topright',
            forecastHours: 48,
            units: 'imperial',
          }}

          /**
           * ====================================
           * LAYER CONFIGURATION
           * ====================================
           * Configure base map layers and tile overlays.
           *
           * baseLayers: Array of tile layer configs (satellite, street, topo)
           *   - Use DEFAULT_LAYERS for pre-configured options
           *   - Or define custom: { id, name, url, attribution }
           * overlays: Array of overlay configs (like weather radar)
           * defaultBaseLayer: ID of initial base layer
           * defaultOverlays: Array of overlay IDs to show initially
           *
           * Available DEFAULT_LAYERS:
           * - esriWorldImagery: Satellite imagery
           * - openStreetMap: Street map
           * - esriWorldTopoMap: Topographic map
           */
          layers={{
            baseLayers: [
              DEFAULT_LAYERS.esriWorldImagery, // Satellite (default)
              DEFAULT_LAYERS.openStreetMap, // Street map
              DEFAULT_LAYERS.esriWorldTopoMap, // Topographic
            ],
            overlays: [WEATHER_RADAR_OVERLAY_CONFIG],
            defaultBaseLayer: 'esri-satellite',
            defaultOverlays: ['weather-radar-nexrad'],
          }}

          /**
           * ====================================
           * DATA OVERLAYS
           * ====================================
           * Interactive geographic data layers with click/hover support.
           *
           * enabled: Enable the data overlay system
           * showPanel: Show the layer toggle panel
           * panelConfig: Panel settings
           *   - position: Panel placement
           *   - collapsed: Start collapsed
           *   - title: Panel header text
           * overlays: Array of data overlay configs
           * defaultVisibility: Which overlays are visible initially
           *
           * Available pre-configured overlays:
           * - SSURGO_OVERLAY_CONFIG: USDA soil data (visible at zoom 12+)
           * - HYDRO_3DHP_OVERLAY_CONFIG: USGS streams/lakes (visible at zoom 14+)
           *
           * Events: onSoilFeatureClick, onSoilFeatureSelect,
           *         onHydroFeatureClick, onHydroFeatureSelect
           *
           * TIP: Zoom in to level 12+ to see soil data, 14+ for hydro data
           */
          dataOverlays={{
            enabled: true,
            showPanel: true,
            panelConfig: {
              position: 'bottomright',
              title: 'Overlays',
              collapsed: true,
            },
            overlays: [SSURGO_OVERLAY_CONFIG, HYDRO_3DHP_OVERLAY_CONFIG],
            defaultVisibility: {
              'ssurgo-soil': false, // Toggle on to see soil polygons
              '3dhp-hydro': false, // Toggle on to see streams/lakes
            },
          }}

          /**
           * ====================================
           * EVENT HANDLERS
           * ====================================
           * Callbacks for map interactions. Open browser console to see logs.
           *
           * Map events:
           * - onReady: Map initialization complete
           * - onClick: Map clicked (when not in special mode)
           * - onMoveEnd: Map pan/zoom finished
           * - onZoomEnd: Zoom level changed
           *
           * Drawing events:
           * - onDrawCreated: Shape finished drawing
           * - onDrawEdited: Shapes modified
           * - onDrawDeleted: Shapes removed
           *
           * Measurement events:
           * - onMeasureComplete: Measurement finished
           *
           * Forecast events:
           * - onClickForecastFetched: Forecast data received
           * - onClickForecastModeChange: Toggle state changed
           *
           * Data overlay events:
           * - onSoilFeatureClick: Soil polygon clicked
           * - onSoilFeatureSelect: Soil selection changed
           * - onHydroFeatureClick: Hydro feature clicked
           * - onHydroFeatureSelect: Hydro selection changed
           */
          eventHandlers={{
            // Map ready
            onReady: (map) => {
              console.log('Map ready!', map);
            },

            // Click events
            onClick: (e) => {
              console.log('Map clicked at:', e.latlng);
            },

            // Movement events
            onMoveEnd: (e) => {
              console.log('Map moved - Center:', e.center, 'Zoom:', e.zoom);
            },
            onZoomEnd: (e) => {
              console.log('Zoom changed to:', e.zoom);
            },

            // Drawing events
            onDrawCreated: (e) => {
              console.log('Shape drawn:', e.layerType);
              console.log('GeoJSON:', e.geoJSON);
            },
            onDrawEdited: (e) => {
              console.log('Shapes edited:', e.geoJSON.features.length, 'features');
            },
            onDrawDeleted: (e) => {
              console.log('Shapes deleted:', e.layers.length);
            },

            // Measurement events
            onMeasureComplete: (e) => {
              console.log(`Measurement complete - ${e.mode}: ${e.displayValue}`);
              console.log('Raw value:', e.value, e.mode === 'area' ? 'sq meters' : 'meters');
            },

            // Click forecast events
            onClickForecastFetched: (data) => {
              console.log('Forecast received for:', data.location.city, data.location.state);
              const totalPrecip = data.hourly.reduce(
                (sum, h) => sum + (h.precipitationAmount ?? 0),
                0
              );
              console.log('48hr precipitation:', totalPrecip.toFixed(2), 'inches');
            },
            onClickForecastModeChange: (enabled) => {
              console.log('Click forecast mode:', enabled ? 'ON' : 'OFF');
            },

            // Soil data events
            onSoilFeatureClick: (e) => {
              console.log('Soil clicked:', e.feature.properties.muname);
              console.log('Drainage class:', e.feature.properties.drclassdcd);
              console.log('Farmland class:', e.feature.properties.farmlndcl);
            },
            onSoilFeatureSelect: (e) => {
              console.log('Soil selection:', e.action, '-', e.selectedFeatures.length, 'features');
            },

            // Hydro data events
            onHydroFeatureClick: (e) => {
              console.log('Hydro feature clicked:', e.feature.properties.gnis_name || 'Unnamed');
              console.log('Feature type:', e.feature.featureType);
            },
            onHydroFeatureSelect: (e) => {
              console.log('Hydro selection:', e.action, '-', e.selectedFeatures.length, 'features');
            },

            // Error handling
            onError: (error) => {
              console.error('Map error:', error);
            },
          }}
        />
      </main>

      {/* ========================================
          FEATURE LIST FOOTER
          ======================================== */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Available Features (open console to see events):
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
            <span><strong>Drawing:</strong> Polygons, rectangles, markers (top-left toolbar)</span>
            <span><strong>Measure:</strong> Distance & area in acres (ruler icon, top-left)</span>
            <span><strong>Forecast:</strong> Click for 48hr weather (cloud icon, CONUS only)</span>
            <span><strong>Radar:</strong> Animated weather radar (layer control)</span>
            <span><strong>Soil Data:</strong> SSURGO info at zoom 12+ (Data Layers panel)</span>
            <span><strong>Hydro:</strong> Streams & lakes at zoom 14+ (Data Layers panel)</span>
            <span><strong>Layers:</strong> Satellite, Street, Topo (layer icon)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
