import { Link } from 'react-router-dom';

const docsStructure = [
  {
    category: 'Getting Started',
    items: [
      { name: 'Overview', path: 'README', description: 'Introduction and quick start guide' },
    ],
  },
  {
    category: 'Components',
    items: [
      { name: 'Weather', path: 'components/weather', description: 'Weather display using NWS API' },
      {
        name: 'Map',
        path: 'components/map/map',
        description: 'Interactive Leaflet-based map with drawing and measurement',
      },
      {
        name: 'Weather Radar',
        path: 'components/map/weather-radar',
        description: 'Animated NEXRAD radar overlay',
      },
      {
        name: 'Data Overlays',
        path: 'components/map/data-overlays/index',
        description: 'SSURGO soil and 3DHP hydro layers',
      },
      {
        name: 'Soil Overlay',
        path: 'components/map/data-overlays/soil-overlay',
        description: 'SSURGO soil data overlay',
      },
      {
        name: 'Hydro Overlay',
        path: 'components/map/data-overlays/hydro-overlay',
        description: '3DHP hydro features overlay',
      },
      {
        name: 'Click Forecast',
        path: 'components/map/plugins/click-forecast',
        description: 'Click-to-get-forecast plugin',
      },
      {
        name: 'Measure',
        path: 'components/map/plugins/measure',
        description: 'Distance and area measurement tool',
      },
    ],
  },
  {
    category: 'Hooks',
    items: [
      {
        name: 'useWeather',
        path: 'hooks/use-weather',
        description: 'Fetch and manage weather data',
      },
      {
        name: 'useMapInstance',
        path: 'hooks/use-map-instance',
        description: 'Programmatic map control',
      },
    ],
  },
];

export function DocsIndex() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="section-title">Documentation</h1>
        <p className="section-description">
          Complete documentation for all components, hooks, and utilities in the AcreBlitz React Components library.
        </p>
      </div>

      <div className="space-y-8">
        {docsStructure.map((section) => (
          <div key={section.category} className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.category}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path === 'README' ? '/docs/README' : `/docs/${item.path}`}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors group"
                >
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

