import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Map, MapSkeleton, useMapInstance, SSURGO_OVERLAY_CONFIG, HYDRO_3DHP_OVERLAY_CONFIG, WEATHER_RADAR_OVERLAY_CONFIG, DEFAULT_LAYERS } from '@acreblitz/react-components';
import type {
  LeafletMap,
  DrawCreatedEvent,
  MeasureCompleteEvent,
  MapClickEvent,
  SoilFeatureClickEvent,
  SoilFeatureSelectEvent,
  HydroFeatureClickEvent,
  HydroFeatureSelectEvent,
  DWMLForecastData,
} from '@acreblitz/react-components';

// Sample locations - Agricultural regions
const sampleLocations = [
  { name: 'Central Kansas (Wheat Belt)', lat: 38.5, lng: -98.0 },
  { name: 'Iowa Corn Belt', lat: 41.8781, lng: -93.0977 },
  { name: 'Central Valley, CA', lat: 36.7378, lng: -119.7871 },
  { name: 'Nebraska Panhandle', lat: 41.4925, lng: -101.3598 },
  { name: 'Illinois Corn Belt', lat: 40.3495, lng: -88.9861 },
  { name: 'Texas Panhandle', lat: 35.2219, lng: -101.8313 },
  { name: 'North Dakota Wheat', lat: 47.5515, lng: -101.0020 },
  { name: 'Georgia Peanut Region', lat: 31.5785, lng: -84.1557 },
];

interface EventLog {
  id: number;
  type: string;
  data: string;
  timestamp: Date;
}

export function MapDemo() {
  const mapRef = useRef<LeafletMap>(null);
  const { flyTo, exportGeoJSON, clearDrawnItems, isReady, getCenter, getZoom } = useMapInstance({ mapRef });

  // Map settings
  const [center, setCenter] = useState<[number, number]>([38.5, -98.0]);
  const [zoom, _setZoom] = useState(13);
  const [height, _setHeight] = useState('500px');

  // Controls
  const [showLayerControl, setShowLayerControl] = useState(true);
  const [showZoomControl, setShowZoomControl] = useState(true);
  const [showScaleControl, setShowScaleControl] = useState(false);

  // Drawing
  const [drawingEnabled, setDrawingEnabled] = useState(true);
  const [drawPolygon, setDrawPolygon] = useState(true);
  const [drawRectangle, setDrawRectangle] = useState(true);
  const [drawMarker, setDrawMarker] = useState(true);
  const [drawPolyline, setDrawPolyline] = useState(true);
  const [drawCircle, setDrawCircle] = useState(true);

  // Measurement
  const [measureEnabled, setMeasureEnabled] = useState(true);

  // Click Forecast
  const [clickForecastEnabled, setClickForecastEnabled] = useState(true);

  // Data Overlays - track selections for event log
  const [selectedSoilFeatures, setSelectedSoilFeatures] = useState<string[]>([]);
  const [selectedHydroFeatures, setSelectedHydroFeatures] = useState<string[]>([]);

  // Event log
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const addEvent = (type: string, data: string) => {
    setEventLog((prev) => [
      { id: Date.now(), type, data, timestamp: new Date() },
      ...prev.slice(0, 9), // Keep last 10 events
    ]);
  };

  const handleLocationSelect = (location: (typeof sampleLocations)[0]) => {
    if (isReady) {
      flyTo([location.lat, location.lng], 14);
    } else {
      setCenter([location.lat, location.lng]);
    }
  };

  const handleExportGeoJSON = () => {
    const geoJSON = exportGeoJSON();
    if (geoJSON) {
      addEvent('Export', `${geoJSON.features.length} features exported`);
      console.log('Exported GeoJSON:', geoJSON);
      // Copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(geoJSON, null, 2));
      alert('GeoJSON copied to clipboard! Check console for full output.');
    } else {
      addEvent('Export', 'No features to export');
    }
  };

  const handleClearDrawings = () => {
    clearDrawnItems();
    addEvent('Clear', 'All drawings cleared');
  };

  const handleGetViewState = () => {
    const currentCenter = getCenter();
    const currentZoom = getZoom();
    if (currentCenter && currentZoom) {
      addEvent(
        'View State',
        `Center: [${currentCenter.lat.toFixed(4)}, ${currentCenter.lng.toFixed(4)}], Zoom: ${currentZoom}`
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="section-title">Map Component</h1>
            <p className="section-description">
              Interactive Leaflet-based map with satellite imagery, drawing tools,
              measurement, layer switching, and data overlays (SSURGO soil data, 3DHP hydro features).
            </p>
          </div>
          <Link
            to="/docs/components/map/map"
            className="btn-outline whitespace-nowrap"
          >
            View Documentation
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Location */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Location</h2>
            <select
              className="input text-sm"
              onChange={(e) => {
                const location = sampleLocations[parseInt(e.target.value)];
                if (location) handleLocationSelect(location);
              }}
            >
              {sampleLocations.map((loc, idx) => (
                <option key={loc.name} value={idx}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Controls */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Controls</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLayerControl}
                  onChange={(e) => setShowLayerControl(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Layer Control</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZoomControl}
                  onChange={(e) => setShowZoomControl(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Zoom Control</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showScaleControl}
                  onChange={(e) => setShowScaleControl(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Scale Control</span>
              </label>
            </div>
          </div>

          {/* Drawing Tools */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Drawing</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={drawingEnabled}
                  onChange={(e) => setDrawingEnabled(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-500">Enabled</span>
              </label>
            </div>
            {drawingEnabled && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawPolygon}
                    onChange={(e) => setDrawPolygon(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Polygon</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawRectangle}
                    onChange={(e) => setDrawRectangle(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Rectangle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawPolyline}
                    onChange={(e) => setDrawPolyline(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Polyline</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawCircle}
                    onChange={(e) => setDrawCircle(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Circle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawMarker}
                    onChange={(e) => setDrawMarker(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Marker</span>
                </label>
              </div>
            )}
          </div>

          {/* Measurement */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Measurement</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={measureEnabled}
                  onChange={(e) => setMeasureEnabled(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-500">Enabled</span>
              </label>
            </div>
          </div>

          {/* Click Forecast */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900">Click Forecast</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clickForecastEnabled}
                  onChange={(e) => setClickForecastEnabled(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-500">Enabled</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Click the sun icon, then click anywhere on the map to see a 48-hour forecast from NWS.
            </p>
          </div>

          {/* Actions */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleExportGeoJSON}
                disabled={!isReady}
                className="btn-primary w-full text-sm disabled:opacity-50"
              >
                Export GeoJSON
              </button>
              <button
                onClick={handleClearDrawings}
                disabled={!isReady}
                className="btn-secondary w-full text-sm disabled:opacity-50"
              >
                Clear Drawings
              </button>
              <button
                onClick={handleGetViewState}
                disabled={!isReady}
                className="btn-outline w-full text-sm disabled:opacity-50"
              >
                Get View State
              </button>
            </div>
          </div>

          {/* Skeleton Demo */}
          <div className="card p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSkeleton}
                onChange={(e) => setShowSkeleton(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show MapSkeleton</span>
            </label>
          </div>
        </div>

        {/* Map Preview */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Live Preview</h2>
              <span className={`text-xs px-2 py-1 rounded-full ${isReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isReady ? 'Ready' : 'Loading...'}
              </span>
            </div>
            {showSkeleton ? (
              <MapSkeleton height={height} />
            ) : (
              <Map
                ref={mapRef}
                center={center}
                zoom={zoom}
                height={height}
                units={{ distance: 'imperial', area: 'acres' }}
                showLayerControl={showLayerControl}
                showZoomControl={showZoomControl}
                showScaleControl={showScaleControl}
                layers={{
                  baseLayers: [
                    DEFAULT_LAYERS.esriWorldImagery,
                    DEFAULT_LAYERS.openStreetMap,
                    DEFAULT_LAYERS.esriWorldTopoMap,
                  ],
                  overlays: [WEATHER_RADAR_OVERLAY_CONFIG],
                  defaultBaseLayer: 'esri-satellite',
                  defaultOverlays: [],
                }}
                drawing={
                  drawingEnabled
                    ? {
                        enabled: true,
                        draw: {
                          polygon: drawPolygon,
                          rectangle: drawRectangle,
                          polyline: drawPolyline,
                          circle: drawCircle,
                          marker: drawMarker,
                          circlemarker: false,
                        },
                      }
                    : undefined
                }
                measure={measureEnabled ? { enabled: true } : undefined}
                clickForecast={
                  clickForecastEnabled
                    ? {
                        enabled: true,
                        position: 'topright',
                        forecastHours: 48,
                        units: 'imperial',
                      }
                    : undefined
                }
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
                    'ssurgo-soil': false,
                    '3dhp-hydro': false,
                  },
                }}
                eventHandlers={{
                  onReady: () => addEvent('Ready', 'Map initialized'),
                  onClick: (e: MapClickEvent) =>
                    addEvent('Click', `[${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]`),
                  onDrawCreated: (e: DrawCreatedEvent) =>
                    addEvent('Draw Created', `${e.layerType} added`),
                  onMeasureComplete: (e: MeasureCompleteEvent) =>
                    addEvent('Measure', `${e.mode}: ${e.displayValue}`),
                  onClickForecastFetched: (data: DWMLForecastData) =>
                    addEvent('Forecast', `${data.location.city}, ${data.location.state} - ${data.hourly.length} hours`),
                  onClickForecastModeChange: (enabled: boolean) =>
                    addEvent('Forecast Mode', enabled ? 'Enabled' : 'Disabled'),
                  onSoilFeatureClick: (e: SoilFeatureClickEvent) =>
                    addEvent('Soil Click', `${e.feature.properties.muname || e.feature.properties.musym}`),
                  onSoilFeatureSelect: (e: SoilFeatureSelectEvent) => {
                    setSelectedSoilFeatures(e.selectedFeatures.map((f) => f.id));
                    addEvent('Soil Select', `${e.action}: ${e.changedFeature.properties.muname || e.changedFeature.properties.musym}`);
                  },
                  onHydroFeatureClick: (e: HydroFeatureClickEvent) =>
                    addEvent('Hydro Click', `${e.feature.properties.gnis_name || e.feature.featureType}`),
                  onHydroFeatureSelect: (e: HydroFeatureSelectEvent) => {
                    setSelectedHydroFeatures(e.selectedFeatures.map((f) => f.id));
                    addEvent('Hydro Select', `${e.action}: ${e.changedFeature.properties.gnis_name || e.changedFeature.featureType}`);
                  },
                }}
              />
            )}
          </div>

          {/* Event Log - Collapsible */}
          {eventLog.length > 0 && (
            <div className="card">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">Event Log</h2>
                <button
                  onClick={() => setEventLog([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {eventLog.map((event) => (
                  <div key={event.id} className="px-4 py-2 flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="text-xs font-medium text-primary-600 w-24 flex-shrink-0">
                      {event.type}
                    </span>
                    <span className="text-sm text-gray-700 truncate">{event.data}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Example - Simplified */}
          <div className="card">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Example Code</h2>
              <Link
                to="/docs/components/map/map"
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                View Full Docs →
              </Link>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 overflow-x-auto">
              <pre className="text-xs">
                <code>{`import { Map, useMapInstance, DEFAULT_LAYERS } from '@acreblitz/react-components';
import '@acreblitz/react-components/styles.css';

function MyMap() {
  const mapRef = useRef(null);
  const { flyTo } = useMapInstance({ mapRef });

  return (
    <Map
      ref={mapRef}
      center={[${center[0]}, ${center[1]}]}
      zoom={${zoom}}
      height="${height}"
      drawing={{ enabled: true }}
      measure={{ enabled: true }}
      layers={{
        baseLayers: [DEFAULT_LAYERS.esriWorldImagery],
        defaultBaseLayer: 'esri-satellite',
      }}
    />
  );
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
