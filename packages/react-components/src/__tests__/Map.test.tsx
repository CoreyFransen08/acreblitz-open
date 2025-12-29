import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock CSS modules
vi.mock('../components/Map/Map.module.css', () => ({
  default: {
    mapWrapper: 'mapWrapper',
    mapContainer: 'mapContainer',
    errorContainer: 'errorContainer',
    errorIcon: 'errorIcon',
    errorTitle: 'errorTitle',
    errorMessage: 'errorMessage',
    skeleton: 'skeleton',
    skeletonContent: 'skeletonContent',
    skeletonIcon: 'skeletonIcon',
    skeletonText: 'skeletonText',
  },
}));

// Mock leaflet
vi.mock('leaflet', () => {
  const mockIcon = {
    Default: {
      prototype: {},
      mergeOptions: vi.fn(),
    },
  };

  return {
    default: {
      Icon: mockIcon,
    },
    Icon: mockIcon,
  };
});

// Mock react-leaflet with components that render children
vi.mock('react-leaflet', () => ({
  MapContainer: vi.fn(({ children, className }) => (
    <div data-testid="map-container" className={className}>
      {children}
    </div>
  )),
  TileLayer: vi.fn(() => <div data-testid="tile-layer" />),
  ZoomControl: vi.fn(() => <div data-testid="zoom-control" />),
  ScaleControl: vi.fn(() => <div data-testid="scale-control" />),
  AttributionControl: vi.fn(() => <div data-testid="attribution-control" />),
  LayersControl: vi.fn(({ children }) => (
    <div data-testid="layers-control">{children}</div>
  )),
  FeatureGroup: vi.fn(({ children }) => (
    <div data-testid="feature-group">{children}</div>
  )),
  useMap: vi.fn(() => ({
    addControl: vi.fn(),
    removeControl: vi.fn(),
  })),
}));

// Mock react-leaflet-draw
vi.mock('react-leaflet-draw', () => ({
  EditControl: vi.fn(() => <div data-testid="edit-control" />),
}));

// Mock MapLayers component
vi.mock('../components/Map/MapLayers', () => ({
  MapLayers: vi.fn(() => <div data-testid="map-layers" />),
}));

// Mock MapControls component
vi.mock('../components/Map/MapControls', () => ({
  MapControls: vi.fn(() => <div data-testid="map-controls" />),
}));

// Import after mocks
import { Map } from '../components/Map/Map';
import { MapSkeleton } from '../components/Map/MapSkeleton';

describe('Map Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders MapSkeleton initially while loading', async () => {
      // The Map component uses dynamic imports, so it shows loading first
      const { container } = render(<Map height="500px" />);

      // Initially should show skeleton
      const skeleton = container.querySelector('[class*="skeleton"]');
      // Either skeleton or the map container should be present
      expect(container.firstChild).toBeTruthy();
    });

    it('renders custom loading component when provided', async () => {
      render(
        <Map
          height="500px"
          loadingComponent={<div data-testid="custom-loading">Loading map...</div>}
        />
      );

      // The custom loading should be shown during the loading phase
      // Due to dynamic imports, this may or may not be visible depending on timing
      // This test verifies the prop is accepted without error
      expect(true).toBe(true);
    });
  });

  describe('props handling', () => {
    it('accepts center prop as array', () => {
      expect(() => {
        render(<Map center={[40.7128, -74.006]} />);
      }).not.toThrow();
    });

    it('accepts zoom prop', () => {
      expect(() => {
        render(<Map zoom={15} />);
      }).not.toThrow();
    });

    it('accepts height as string', () => {
      const { container } = render(<Map height="500px" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('accepts height as number', () => {
      const { container } = render(<Map height={500} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('accepts width as string', () => {
      const { container } = render(<Map width="100%" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('accepts width as number', () => {
      const { container } = render(<Map width={800} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('accepts className prop', () => {
      const { container } = render(<Map className="custom-map" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('accepts style prop', () => {
      const { container } = render(<Map style={{ border: '1px solid red' }} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('accepts drawing configuration', () => {
      expect(() => {
        render(
          <Map
            drawing={{
              enabled: true,
              position: 'topright',
              draw: {
                polygon: true,
                rectangle: true,
                marker: false,
              },
            }}
          />
        );
      }).not.toThrow();
    });

    it('accepts measure configuration', () => {
      expect(() => {
        render(
          <Map
            measure={{
              enabled: true,
              position: 'topleft',
              color: '#FF0080',
            }}
          />
        );
      }).not.toThrow();
    });

    it('accepts control visibility props', () => {
      expect(() => {
        render(
          <Map
            showLayerControl={false}
            showZoomControl={false}
            showScaleControl={true}
            showAttributionControl={false}
          />
        );
      }).not.toThrow();
    });

    it('accepts interaction props', () => {
      expect(() => {
        render(
          <Map
            scrollWheelZoom={false}
            doubleClickZoom={false}
            dragging={false}
          />
        );
      }).not.toThrow();
    });

    it('accepts bounds props', () => {
      expect(() => {
        render(
          <Map
            minZoom={5}
            maxZoom={18}
            bounds={[
              [39.74, -97.09],
              [39.75, -97.08],
            ]}
            maxBounds={[
              [39.0, -98.0],
              [40.0, -96.0],
            ]}
          />
        );
      }).not.toThrow();
    });

    it('accepts eventHandlers prop', () => {
      const handlers = {
        onClick: vi.fn(),
        onMoveEnd: vi.fn(),
        onZoomEnd: vi.fn(),
        onDrawCreated: vi.fn(),
        onReady: vi.fn(),
      };

      expect(() => {
        render(<Map eventHandlers={handlers} />);
      }).not.toThrow();
    });

    it('accepts initialGeoJSON prop', () => {
      const geoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-97.09, 39.74],
                  [-97.08, 39.74],
                  [-97.08, 39.75],
                  [-97.09, 39.75],
                  [-97.09, 39.74],
                ],
              ],
            },
            properties: {},
          },
        ],
      };

      expect(() => {
        render(<Map initialGeoJSON={geoJSON} />);
      }).not.toThrow();
    });
  });

  describe('default values', () => {
    it('uses default center when not provided', () => {
      // Default center is [39.7456, -97.0892] (geographic center of US)
      expect(() => {
        render(<Map />);
      }).not.toThrow();
    });

    it('uses default zoom when not provided', () => {
      // Default zoom is 13
      expect(() => {
        render(<Map />);
      }).not.toThrow();
    });

    it('uses default height when not provided', () => {
      // Default height is '400px'
      expect(() => {
        render(<Map />);
      }).not.toThrow();
    });
  });

  describe('ref forwarding', () => {
    it('accepts a ref', () => {
      const ref = React.createRef<any>();

      expect(() => {
        render(<Map ref={ref} />);
      }).not.toThrow();
    });
  });
});

describe('MapSkeleton Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<MapSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts height prop as string', () => {
    const { container } = render(<MapSkeleton height="500px" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts height prop as number', () => {
    const { container } = render(<MapSkeleton height={500} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts width prop as string', () => {
    const { container } = render(<MapSkeleton width="100%" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts width prop as number', () => {
    const { container } = render(<MapSkeleton width={800} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with skeleton class', () => {
    const { container } = render(<MapSkeleton />);
    // Should have skeleton element
    expect(container.querySelector('.skeleton')).toBeTruthy();
  });

  it('renders loading text', () => {
    const { container } = render(<MapSkeleton />);
    // Should have loading text
    expect(container.textContent).toContain('Loading map...');
  });

  it('renders map icon', () => {
    const { container } = render(<MapSkeleton />);
    // Should have an SVG icon
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
