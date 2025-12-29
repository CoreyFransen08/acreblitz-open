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
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="https://www.npmjs.com/package/@acreblitz/react-components"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            npm install @acreblitz/react-components
          </a>
          <a
            href="https://github.com/CoreyFransen08/acreblitz-open/tree/main"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </a>
          <Link to="/docs" className="btn-outline">
            View Documentation
          </Link>
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
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              See the individual component pages for detailed usage examples and
              API documentation.
            </p>
            <Link to="/docs" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View Full Docs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
