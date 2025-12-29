import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LAYERS,
  DEFAULT_LAYER_CONFIG,
  createLayerConfig,
  getDefaultLayer,
} from '../utils/mapLayers';

describe('Map Layer Utilities', () => {
  describe('DEFAULT_LAYERS', () => {
    it('contains ESRI World Imagery layer', () => {
      expect(DEFAULT_LAYERS.esriWorldImagery).toBeDefined();
      expect(DEFAULT_LAYERS.esriWorldImagery.id).toBe('esri-satellite');
      expect(DEFAULT_LAYERS.esriWorldImagery.name).toBe('Satellite');
      expect(DEFAULT_LAYERS.esriWorldImagery.url).toContain('arcgisonline.com');
    });

    it('contains OpenStreetMap layer', () => {
      expect(DEFAULT_LAYERS.openStreetMap).toBeDefined();
      expect(DEFAULT_LAYERS.openStreetMap.id).toBe('osm');
      expect(DEFAULT_LAYERS.openStreetMap.name).toBe('Street Map');
      expect(DEFAULT_LAYERS.openStreetMap.url).toContain('openstreetmap.org');
    });

    it('contains ESRI World Topo Map layer', () => {
      expect(DEFAULT_LAYERS.esriWorldTopoMap).toBeDefined();
      expect(DEFAULT_LAYERS.esriWorldTopoMap.id).toBe('esri-topo');
      expect(DEFAULT_LAYERS.esriWorldTopoMap.name).toBe('Topographic');
    });

    it('contains ESRI World Street Map layer', () => {
      expect(DEFAULT_LAYERS.esriWorldStreetMap).toBeDefined();
      expect(DEFAULT_LAYERS.esriWorldStreetMap.id).toBe('esri-streets');
      expect(DEFAULT_LAYERS.esriWorldStreetMap.name).toBe('Streets');
    });

    it('all layers have required properties', () => {
      Object.values(DEFAULT_LAYERS).forEach((layer) => {
        expect(layer.id).toBeDefined();
        expect(layer.name).toBeDefined();
        expect(layer.url).toBeDefined();
        expect(layer.attribution).toBeDefined();
        expect(typeof layer.id).toBe('string');
        expect(typeof layer.name).toBe('string');
        expect(typeof layer.url).toBe('string');
        expect(typeof layer.attribution).toBe('string');
      });
    });

    it('all layer URLs contain tile placeholders', () => {
      Object.values(DEFAULT_LAYERS).forEach((layer) => {
        expect(layer.url).toContain('{z}');
        expect(layer.url).toContain('{x}');
        expect(layer.url).toContain('{y}');
      });
    });
  });

  describe('DEFAULT_LAYER_CONFIG', () => {
    it('has baseLayers array with default layers', () => {
      expect(DEFAULT_LAYER_CONFIG.baseLayers).toBeDefined();
      expect(Array.isArray(DEFAULT_LAYER_CONFIG.baseLayers)).toBe(true);
      expect(DEFAULT_LAYER_CONFIG.baseLayers.length).toBeGreaterThan(0);
    });

    it('includes satellite as a base layer', () => {
      const hasSatellite = DEFAULT_LAYER_CONFIG.baseLayers.some(
        (layer) => layer.id === 'esri-satellite'
      );
      expect(hasSatellite).toBe(true);
    });

    it('includes OpenStreetMap as a base layer', () => {
      const hasOSM = DEFAULT_LAYER_CONFIG.baseLayers.some(
        (layer) => layer.id === 'osm'
      );
      expect(hasOSM).toBe(true);
    });

    it('sets ESRI satellite as the default base layer', () => {
      expect(DEFAULT_LAYER_CONFIG.defaultBaseLayer).toBe('esri-satellite');
    });

    it('has empty overlays array by default', () => {
      expect(DEFAULT_LAYER_CONFIG.overlays).toBeDefined();
      expect(Array.isArray(DEFAULT_LAYER_CONFIG.overlays)).toBe(true);
      expect(DEFAULT_LAYER_CONFIG.overlays?.length).toBe(0);
    });

    it('has empty defaultOverlays array', () => {
      expect(DEFAULT_LAYER_CONFIG.defaultOverlays).toBeDefined();
      expect(Array.isArray(DEFAULT_LAYER_CONFIG.defaultOverlays)).toBe(true);
      expect(DEFAULT_LAYER_CONFIG.defaultOverlays?.length).toBe(0);
    });
  });

  describe('createLayerConfig', () => {
    it('returns default config when called with no arguments', () => {
      const config = createLayerConfig();

      expect(config).toEqual(DEFAULT_LAYER_CONFIG);
    });

    it('returns default config when called with undefined', () => {
      const config = createLayerConfig(undefined);

      expect(config).toEqual(DEFAULT_LAYER_CONFIG);
    });

    it('allows custom baseLayers', () => {
      const customLayers = [DEFAULT_LAYERS.openStreetMap];
      const config = createLayerConfig({
        baseLayers: customLayers,
      });

      expect(config.baseLayers).toEqual(customLayers);
      expect(config.baseLayers.length).toBe(1);
    });

    it('allows custom defaultBaseLayer', () => {
      const config = createLayerConfig({
        defaultBaseLayer: 'osm',
      });

      expect(config.defaultBaseLayer).toBe('osm');
      // baseLayers should still be default
      expect(config.baseLayers).toEqual(DEFAULT_LAYER_CONFIG.baseLayers);
    });

    it('allows custom overlays', () => {
      const customOverlay = {
        id: 'custom-overlay',
        name: 'Custom Overlay',
        url: 'https://example.com/tiles/{z}/{x}/{y}.png',
        attribution: '© Custom',
      };
      const config = createLayerConfig({
        overlays: [customOverlay],
      });

      expect(config.overlays).toHaveLength(1);
      expect(config.overlays?.[0].id).toBe('custom-overlay');
    });

    it('allows custom defaultOverlays', () => {
      const config = createLayerConfig({
        defaultOverlays: ['overlay-1', 'overlay-2'],
      });

      expect(config.defaultOverlays).toEqual(['overlay-1', 'overlay-2']);
    });

    it('merges partial config with defaults correctly', () => {
      const config = createLayerConfig({
        defaultBaseLayer: 'osm',
      });

      // Custom value
      expect(config.defaultBaseLayer).toBe('osm');
      // Default values preserved
      expect(config.baseLayers).toEqual(DEFAULT_LAYER_CONFIG.baseLayers);
      expect(config.overlays).toEqual([]);
      expect(config.defaultOverlays).toEqual([]);
    });

    it('handles empty config object', () => {
      const config = createLayerConfig({});

      expect(config.baseLayers).toEqual(DEFAULT_LAYER_CONFIG.baseLayers);
      expect(config.defaultBaseLayer).toBe(DEFAULT_LAYER_CONFIG.defaultBaseLayer);
      expect(config.overlays).toEqual([]);
      expect(config.defaultOverlays).toEqual([]);
    });

    it('allows completely custom configuration', () => {
      const customConfig = {
        baseLayers: [
          {
            id: 'custom-1',
            name: 'Custom Layer 1',
            url: 'https://example.com/1/{z}/{x}/{y}.png',
            attribution: '© Example 1',
          },
          {
            id: 'custom-2',
            name: 'Custom Layer 2',
            url: 'https://example.com/2/{z}/{x}/{y}.png',
            attribution: '© Example 2',
          },
        ],
        overlays: [
          {
            id: 'overlay-1',
            name: 'Overlay 1',
            url: 'https://example.com/overlay/{z}/{x}/{y}.png',
            attribution: '© Overlay',
          },
        ],
        defaultBaseLayer: 'custom-1',
        defaultOverlays: ['overlay-1'],
      };

      const config = createLayerConfig(customConfig);

      expect(config.baseLayers).toEqual(customConfig.baseLayers);
      expect(config.overlays).toEqual(customConfig.overlays);
      expect(config.defaultBaseLayer).toBe('custom-1');
      expect(config.defaultOverlays).toEqual(['overlay-1']);
    });
  });

  describe('getDefaultLayer', () => {
    it('finds ESRI satellite layer by id', () => {
      const layer = getDefaultLayer('esri-satellite');

      expect(layer).toBeDefined();
      expect(layer?.id).toBe('esri-satellite');
      expect(layer?.name).toBe('Satellite');
    });

    it('finds OpenStreetMap layer by id', () => {
      const layer = getDefaultLayer('osm');

      expect(layer).toBeDefined();
      expect(layer?.id).toBe('osm');
      expect(layer?.name).toBe('Street Map');
    });

    it('finds ESRI topo layer by id', () => {
      const layer = getDefaultLayer('esri-topo');

      expect(layer).toBeDefined();
      expect(layer?.id).toBe('esri-topo');
      expect(layer?.name).toBe('Topographic');
    });

    it('finds ESRI streets layer by id', () => {
      const layer = getDefaultLayer('esri-streets');

      expect(layer).toBeDefined();
      expect(layer?.id).toBe('esri-streets');
      expect(layer?.name).toBe('Streets');
    });

    it('returns undefined for unknown layer id', () => {
      const layer = getDefaultLayer('unknown-layer');

      expect(layer).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      const layer = getDefaultLayer('');

      expect(layer).toBeUndefined();
    });

    it('is case-sensitive', () => {
      const layer = getDefaultLayer('ESRI-SATELLITE');

      expect(layer).toBeUndefined();
    });

    it('returns the full layer config with all properties', () => {
      const layer = getDefaultLayer('esri-satellite');

      expect(layer).toEqual(DEFAULT_LAYERS.esriWorldImagery);
      expect(layer?.id).toBe('esri-satellite');
      expect(layer?.name).toBe('Satellite');
      expect(layer?.url).toBeDefined();
      expect(layer?.attribution).toBeDefined();
      expect(layer?.maxZoom).toBeDefined();
    });
  });
});
