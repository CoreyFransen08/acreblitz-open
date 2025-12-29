import { Link } from 'react-router-dom';

const components = [
  {
    name: 'Weather',
    description:
      'Display current weather conditions and hourly forecast using the National Weather Service API.',
    path: '/weather',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        />
      </svg>
    ),
    features: ['Current conditions', 'Hourly forecast', 'Auto-refresh', 'Imperial/Metric units'],
  },
  {
    name: 'Map',
    description:
      'Interactive Leaflet-based map with satellite imagery, drawing tools, and measurement.',
    path: '/map',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
    features: ['Satellite/Street layers', 'Drawing tools', 'Measurement', 'GeoJSON export'],
  },
];

export function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AcreBlitz React Components
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A collection of reusable React components for agriculture and mapping
          applications. Open source and ready for production use.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a
            href="https://www.npmjs.com/package/@acreblitz/react-components"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            npm install @acreblitz/react-components
          </a>
          <a
            href="https://github.com/acreblitz/acreblitz"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            View on GitHub
          </a>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {components.map((component) => (
          <Link
            key={component.name}
            to={component.path}
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                {component.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {component.name}
                </h2>
                <p className="text-gray-600 mb-4">{component.description}</p>
                <div className="flex flex-wrap gap-2">
                  {component.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Start */}
      <div className="mt-16">
        <h2 className="section-title text-center">Quick Start</h2>
        <div className="card max-w-2xl mx-auto">
          <div className="bg-gray-900 text-gray-100 p-6 rounded-t-xl">
            <code className="text-sm">
              <span className="text-gray-500"># Install the package</span>
              <br />
              <span className="text-green-400">npm</span> install
              @acreblitz/react-components
              <br />
              <br />
              <span className="text-gray-500"># Import styles in your app</span>
              <br />
              <span className="text-purple-400">import</span>{' '}
              <span className="text-yellow-300">
                '@acreblitz/react-components/styles.css'
              </span>
              ;
              <br />
              <br />
              <span className="text-gray-500"># Use the components</span>
              <br />
              <span className="text-purple-400">import</span> {'{ '}
              <span className="text-blue-300">Weather, Map</span>
              {' }'} <span className="text-purple-400">from</span>{' '}
              <span className="text-yellow-300">'@acreblitz/react-components'</span>;
            </code>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              See the individual component pages for detailed usage examples and
              API documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
