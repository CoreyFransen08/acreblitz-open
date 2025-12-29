import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapInstance } from '../hooks/useMapInstance';
import type { Map as LeafletMap, FeatureGroup, LatLngBounds } from 'leaflet';

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    geoJSON: vi.fn(() => ({
      addTo: vi.fn(),
    })),
  },
  geoJSON: vi.fn(() => ({
    addTo: vi.fn(),
  })),
}));

// Create mock map instance
function createMockMap(overrides: Partial<LeafletMap> = {}): LeafletMap {
  return {
    flyTo: vi.fn().mockReturnThis(),
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    getCenter: vi.fn().mockReturnValue({ lat: 39.7456, lng: -97.0892 }),
    getZoom: vi.fn().mockReturnValue(13),
    getBounds: vi.fn().mockReturnValue({
      getNorth: () => 40,
      getSouth: () => 39,
      getEast: () => -96,
      getWest: () => -98,
    } as unknown as LatLngBounds),
    invalidateSize: vi.fn().mockReturnThis(),
    ...overrides,
  } as unknown as LeafletMap;
}

// Create mock feature group
function createMockFeatureGroup(): FeatureGroup {
  const layers: any[] = [];

  return {
    addLayer: vi.fn((layer) => {
      layers.push(layer);
    }),
    clearLayers: vi.fn(() => {
      layers.length = 0;
    }),
    eachLayer: vi.fn((callback) => {
      layers.forEach(callback);
    }),
    toGeoJSON: vi.fn(() => ({
      type: 'FeatureCollection',
      features: layers.map((l) => l.toGeoJSON?.() || {}),
    })),
  } as unknown as FeatureGroup;
}

describe('useMapInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns null map and isReady false when no ref provided', () => {
      const { result } = renderHook(() => useMapInstance());

      expect(result.current.map).toBeNull();
      expect(result.current.isReady).toBe(false);
    });

    it('returns null map when ref.current is null', () => {
      const mapRef = { current: null };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      expect(result.current.map).toBeNull();
      expect(result.current.isReady).toBe(false);
    });

    it('returns map and isReady true when ref has map instance', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };

      const { result } = renderHook(() => useMapInstance({ mapRef }));

      expect(result.current.map).toBe(mockMap);
      expect(result.current.isReady).toBe(true);
    });
  });

  describe('returned methods', () => {
    it('returns all expected methods', () => {
      const { result } = renderHook(() => useMapInstance());

      expect(typeof result.current.flyTo).toBe('function');
      expect(typeof result.current.setView).toBe('function');
      expect(typeof result.current.fitBounds).toBe('function');
      expect(typeof result.current.getCenter).toBe('function');
      expect(typeof result.current.getZoom).toBe('function');
      expect(typeof result.current.getBounds).toBe('function');
      expect(typeof result.current.invalidateSize).toBe('function');
      expect(typeof result.current.getDrawnItems).toBe('function');
      expect(typeof result.current.addGeoJSON).toBe('function');
      expect(typeof result.current.clearDrawnItems).toBe('function');
      expect(typeof result.current.exportGeoJSON).toBe('function');
    });
  });

  describe('navigation methods', () => {
    it('flyTo calls map.flyTo with coordinates and zoom', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      act(() => {
        result.current.flyTo([40.7128, -74.006], 12);
      });

      expect(mockMap.flyTo).toHaveBeenCalledWith([40.7128, -74.006], 12);
    });

    it('flyTo uses current zoom when zoom not provided', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      act(() => {
        result.current.flyTo([40.7128, -74.006]);
      });

      expect(mockMap.flyTo).toHaveBeenCalledWith([40.7128, -74.006], 13);
    });

    it('flyTo does nothing when map is null', () => {
      const mapRef = { current: null };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      // Should not throw
      act(() => {
        result.current.flyTo([40.7128, -74.006]);
      });
    });

    it('setView calls map.setView with coordinates and zoom', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      act(() => {
        result.current.setView([34.0522, -118.2437], 10);
      });

      expect(mockMap.setView).toHaveBeenCalledWith([34.0522, -118.2437], 10);
    });

    it('setView uses current zoom when zoom not provided', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      act(() => {
        result.current.setView([34.0522, -118.2437]);
      });

      expect(mockMap.setView).toHaveBeenCalledWith([34.0522, -118.2437], 13);
    });

    it('fitBounds calls map.fitBounds with bounds and options', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      const bounds = [
        [39.74, -97.09],
        [39.75, -97.08],
      ];
      const options = { padding: [50, 50] as [number, number] };

      act(() => {
        result.current.fitBounds(bounds, options);
      });

      expect(mockMap.fitBounds).toHaveBeenCalledWith(bounds, options);
    });

    it('invalidateSize calls map.invalidateSize', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      act(() => {
        result.current.invalidateSize();
      });

      expect(mockMap.invalidateSize).toHaveBeenCalled();
    });
  });

  describe('getter methods', () => {
    it('getCenter returns current map center', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      const center = result.current.getCenter();

      expect(center).toEqual({ lat: 39.7456, lng: -97.0892 });
      expect(mockMap.getCenter).toHaveBeenCalled();
    });

    it('getCenter returns null when map is null', () => {
      const mapRef = { current: null };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      const center = result.current.getCenter();

      expect(center).toBeNull();
    });

    it('getZoom returns current zoom level', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      const zoom = result.current.getZoom();

      expect(zoom).toBe(13);
      expect(mockMap.getZoom).toHaveBeenCalled();
    });

    it('getZoom returns null when map is null', () => {
      const mapRef = { current: null };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      const zoom = result.current.getZoom();

      expect(zoom).toBeNull();
    });

    it('getBounds returns current map bounds', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      const bounds = result.current.getBounds();

      expect(bounds).toBeDefined();
      expect(mockMap.getBounds).toHaveBeenCalled();
    });

    it('getBounds returns null when map is null', () => {
      const mapRef = { current: null };
      const { result } = renderHook(() => useMapInstance({ mapRef }));

      const bounds = result.current.getBounds();

      expect(bounds).toBeNull();
    });
  });

  describe('drawing methods', () => {
    it('getDrawnItems returns null initially', () => {
      const { result } = renderHook(() => useMapInstance());

      const drawnItems = result.current.getDrawnItems();

      expect(drawnItems).toBeNull();
    });

    it('exportGeoJSON returns null when no drawn items', () => {
      const { result } = renderHook(() => useMapInstance());

      const geoJSON = result.current.exportGeoJSON();

      expect(geoJSON).toBeNull();
    });

    it('clearDrawnItems does not throw when no drawn items', () => {
      const { result } = renderHook(() => useMapInstance());

      // Should not throw
      act(() => {
        result.current.clearDrawnItems();
      });
    });

    it('addGeoJSON does not throw when map is null', () => {
      const { result } = renderHook(() => useMapInstance());

      const geoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      };

      // Should not throw
      act(() => {
        result.current.addGeoJSON(geoJSON);
      });
    });
  });

  describe('ref updates', () => {
    it('updates map state when ref changes from null to map instance', () => {
      const mapRef = { current: null as LeafletMap | null };
      const { result, rerender } = renderHook(() => useMapInstance({ mapRef }));

      expect(result.current.map).toBeNull();
      expect(result.current.isReady).toBe(false);

      // Simulate map becoming ready
      const mockMap = createMockMap();
      mapRef.current = mockMap;
      rerender();

      expect(result.current.map).toBe(mockMap);
      expect(result.current.isReady).toBe(true);
    });

    it('updates map state when ref changes from map to null', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap as LeafletMap | null };
      const { result, rerender } = renderHook(() => useMapInstance({ mapRef }));

      expect(result.current.map).toBe(mockMap);
      expect(result.current.isReady).toBe(true);

      // Simulate map being destroyed
      mapRef.current = null;
      rerender();

      expect(result.current.map).toBeNull();
      expect(result.current.isReady).toBe(false);
    });
  });

  describe('method stability', () => {
    it('methods remain stable across rerenders when map does not change', () => {
      const mockMap = createMockMap();
      const mapRef = { current: mockMap };
      const { result, rerender } = renderHook(() => useMapInstance({ mapRef }));

      const firstFlyTo = result.current.flyTo;
      const firstSetView = result.current.setView;
      const firstGetCenter = result.current.getCenter;

      rerender();

      expect(result.current.flyTo).toBe(firstFlyTo);
      expect(result.current.setView).toBe(firstSetView);
      expect(result.current.getCenter).toBe(firstGetCenter);
    });
  });
});
