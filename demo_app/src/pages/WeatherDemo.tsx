import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Weather, WeatherSkeleton } from '@acreblitz/react-components';
import type { WeatherData } from '@acreblitz/react-components';

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

export function WeatherDemo() {
  const [latitude, setLatitude] = useState(38.5);
  const [longitude, setLongitude] = useState(-98.0);
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [compact, setCompact] = useState(false);
  const [showRefresh, setShowRefresh] = useState(true);
  const [forecastDays, setForecastDays] = useState(7);
  const [_lastData, setLastData] = useState<WeatherData | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const handleLocationSelect = (location: (typeof sampleLocations)[0]) => {
    setLatitude(location.lat);
    setLongitude(location.lng);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="section-title">Weather Component</h1>
            <p className="section-description">
              Display current weather conditions and hourly forecast for US locations
              using the National Weather Service API.
            </p>
          </div>
          <Link
            to="/docs/components/weather"
            className="btn-outline whitespace-nowrap self-start"
          >
            View Documentation
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {/* Controls Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Configuration
            </h2>

            {/* Quick Location Select */}
            <div className="mb-6">
              <label className="label">Quick Location Select</label>
              <select
                className="input"
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

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div>
                <label className="label">Latitude</label>
                <input
                  type="number"
                  className="input"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  step="0.0001"
                  min="-90"
                  max="90"
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  type="number"
                  className="input"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  step="0.0001"
                  min="-180"
                  max="180"
                />
              </div>
            </div>

            {/* Units */}
            <div className="mb-6">
              <label className="label">Units</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="units"
                    value="imperial"
                    checked={units === 'imperial'}
                    onChange={() => setUnits('imperial')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Imperial (°F, mph)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="units"
                    value="metric"
                    checked={units === 'metric'}
                    onChange={() => setUnits('metric')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Metric (°C, m/s)</span>
                </label>
              </div>
            </div>

            {/* Forecast Days */}
            <div className="mb-6">
              <label className="label">Forecast Hours: {forecastDays * 24}</label>
              <input
                type="range"
                min="1"
                max="7"
                value={forecastDays}
                onChange={(e) => setForecastDays(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compact}
                  onChange={(e) => setCompact(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Compact Mode</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRefresh}
                  onChange={(e) => setShowRefresh(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Show Refresh Button</span>
              </label>
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
              <span className="text-sm text-gray-700">Show WeatherSkeleton</span>
            </label>
            {showSkeleton && <div className="mt-4"><WeatherSkeleton /></div>}
          </div>
        </div>

        {/* Component Preview */}
        <div className="md:col-span-2">
          <div className="card">
            <div className="bg-gray-100 px-4 sm:px-6 py-3 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-700">Live Preview</h2>
            </div>
            <div className="p-4 sm:p-6">
              <Weather
                latitude={latitude}
                longitude={longitude}
                units={units}
                compact={compact}
                showRefreshButton={showRefresh}
                forecastDays={forecastDays}
                onDataLoad={setLastData}
                onError={(error) => console.error('Weather error:', error)}
              />
            </div>
          </div>

          {/* Code Example - Simplified */}
          <div className="card mt-6">
            <div className="bg-gray-100 px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-gray-700">Example Code</h2>
              <Link
                to="/docs/components/weather"
                className="text-xs text-primary-600 hover:text-primary-700 whitespace-nowrap"
              >
                View Full Docs →
              </Link>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 sm:p-6 overflow-x-auto">
              <pre className="text-sm">
                <code>{`import { Weather } from '@acreblitz/react-components';

<Weather
  latitude={${latitude}}
  longitude={${longitude}}
  units="${units}"
  forecastDays={${forecastDays}}
/>`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
