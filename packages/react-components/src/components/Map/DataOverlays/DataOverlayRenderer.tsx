/**
 * DataOverlayRenderer Component
 *
 * Renders active data overlay layers based on visibility state
 */

import { useDataOverlay } from './hooks';
import { SoilLayer, HydroLayer } from './layers';
import type {
  SoilOverlayConfig,
  SoilFeatureClickEvent,
  SoilFeatureSelectEvent,
  HydroOverlayConfig,
  HydroFeatureClickEvent,
  HydroFeatureSelectEvent,
  HydroFeaturesData,
} from '../../../types/dataOverlay';
import type { LatLngBounds } from 'leaflet';

interface DataOverlayRendererProps {
  /** Callback when a soil feature is clicked */
  onSoilFeatureClick?: (event: SoilFeatureClickEvent) => void;
  /** Callback when soil feature selection changes */
  onSoilFeatureSelect?: (event: SoilFeatureSelectEvent) => void;
  /** Custom fetch function for soil features (for React Query integration) */
  fetchSoilFeatures?: (bounds: LatLngBounds) => Promise<GeoJSON.FeatureCollection>;
  /** Callback when a hydro feature is clicked */
  onHydroFeatureClick?: (event: HydroFeatureClickEvent) => void;
  /** Callback when hydro feature selection changes */
  onHydroFeatureSelect?: (event: HydroFeatureSelectEvent) => void;
  /** Custom fetch function for hydro features (for React Query integration) */
  fetchHydroFeatures?: (bounds: LatLngBounds) => Promise<HydroFeaturesData>;
}

export function DataOverlayRenderer({
  onSoilFeatureClick,
  onSoilFeatureSelect,
  fetchSoilFeatures,
  onHydroFeatureClick,
  onHydroFeatureSelect,
  fetchHydroFeatures,
}: DataOverlayRendererProps) {
  const { overlays, visibility } = useDataOverlay();

  return (
    <>
      {overlays.map((overlay) => {
        const isVisible = visibility[overlay.id] ?? false;

        // Render soil layers (WFS type with 'soil' in ID)
        if (overlay.type === 'wfs' && overlay.id.includes('soil')) {
          return (
            <SoilLayer
              key={overlay.id}
              config={overlay as SoilOverlayConfig}
              visible={isVisible}
              onFeatureClick={onSoilFeatureClick}
              onSelectionChange={onSoilFeatureSelect}
              fetchFeatures={fetchSoilFeatures}
            />
          );
        }

        // Render hydro layers (ESRI feature type with 'hydro' in ID)
        if (overlay.type === 'esri-feature' && overlay.id.includes('hydro')) {
          return (
            <HydroLayer
              key={overlay.id}
              config={overlay as HydroOverlayConfig}
              visible={isVisible}
              onFeatureClick={onHydroFeatureClick}
              onSelectionChange={onHydroFeatureSelect}
              fetchFeatures={fetchHydroFeatures}
            />
          );
        }

        // Generic WFS layers (not soil-specific) can still use SoilLayer
        if (overlay.type === 'wfs') {
          return (
            <SoilLayer
              key={overlay.id}
              config={overlay as SoilOverlayConfig}
              visible={isVisible}
              onFeatureClick={onSoilFeatureClick}
              onSelectionChange={onSoilFeatureSelect}
            />
          );
        }

        // Other overlay types not yet implemented
        return null;
      })}
    </>
  );
}
