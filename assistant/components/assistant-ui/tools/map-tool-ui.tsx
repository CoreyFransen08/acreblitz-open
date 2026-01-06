"use client";

import { memo, useMemo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import dynamic from "next/dynamic";
import type { DataOverlayProps } from "@acreblitz/react-components";
import {
  SSURGO_OVERLAY_CONFIG,
  HYDRO_3DHP_OVERLAY_CONFIG,
} from "@acreblitz/react-components";

// Dynamic import to avoid SSR issues with Leaflet
const Map = dynamic(
  () => import("@acreblitz/react-components").then((mod) => mod.Map),
  { ssr: false, loading: () => <MapLoadingPlaceholder /> }
);

function MapLoadingPlaceholder() {
  return (
    <div className="my-4 h-[400px] w-full animate-pulse rounded-lg bg-muted" />
  );
}

interface MapToolResult {
  success: boolean;
  error?: string;
  uiData?: {
    // Using unknown for GeoJSON to avoid type conflicts between our type and GeoJSON namespace
    geoJSON: unknown;
    bounds: [[number, number], [number, number]];
    center: [number, number];
    overlays: {
      soil: boolean;
      hydro: boolean;
    };
  };
  agentSummary?: {
    fieldCount: number;
    totalAcres: number;
    fieldNames: string[];
    overlaysEnabled: string[];
  };
}

/**
 * Build data overlay configuration based on enabled overlays.
 * Uses pre-configured overlay configs from react-components.
 */
function buildDataOverlays(overlays: {
  soil: boolean;
  hydro: boolean;
}): DataOverlayProps | undefined {
  const hasOverlays = overlays.soil || overlays.hydro;
  if (!hasOverlays) return undefined;

  const overlayConfigs: DataOverlayProps["overlays"] = [];
  const defaultVisibility: Record<string, boolean> = {};

  if (overlays.soil) {
    overlayConfigs.push(SSURGO_OVERLAY_CONFIG);
    defaultVisibility[SSURGO_OVERLAY_CONFIG.id] = true;
  }

  if (overlays.hydro) {
    overlayConfigs.push(HYDRO_3DHP_OVERLAY_CONFIG);
    defaultVisibility[HYDRO_3DHP_OVERLAY_CONFIG.id] = true;
  }

  return {
    enabled: true,
    showPanel: true,
    overlays: overlayConfigs,
    defaultVisibility,
    panelConfig: {
      position: "bottomright",
      collapsed: true,
    },
  };
}

/**
 * Memoized map display component to prevent re-renders during streaming.
 * Configures overlays based on tool response.
 */
const MemoizedMapDisplay = memo(function MemoizedMapDisplay({
  geoJSON,
  bounds,
  overlays,
}: {
  geoJSON: unknown;
  bounds: [[number, number], [number, number]];
  overlays: { soil: boolean; hydro: boolean };
}) {
  const dataOverlays = useMemo(
    () => buildDataOverlays(overlays),
    [overlays.soil, overlays.hydro]
  );

  return (
    <div className="my-4 w-full">
      <Map
        height="400px"
        bounds={bounds}
        initialGeoJSON={geoJSON as GeoJSON.FeatureCollection}
        dataOverlays={dataOverlays}
        showLayerControl={true}
        showZoomControl={true}
        showScaleControl={true}
        scrollWheelZoom={true}
        className="rounded-lg border shadow-sm"
      />
    </div>
  );
});

/**
 * Map Tool UI Component
 *
 * Renders an interactive map displaying field boundaries with optional
 * soil and hydrology data overlays.
 */
export const MapToolUI: ToolCallMessagePartComponent = ({
  toolName,
  result,
  status,
}) => {
  // Only handle showFieldsOnMap tool
  if (toolName !== "showFieldsOnMap") return null;

  const mapResult = result as MapToolResult | undefined;

  // Memoize data to prevent unnecessary re-renders during streaming
  const stableData = useMemo(() => {
    if (!mapResult?.success || !mapResult.uiData) return null;
    return mapResult.uiData;
  }, [mapResult?.success, mapResult?.uiData]);

  // Loading state
  if (status?.type === "requires-action" || status?.type === "running") {
    return <MapLoadingPlaceholder />;
  }

  // Framework-level error state
  if (status?.type === "incomplete") {
    return (
      <div className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load map</p>
      </div>
    );
  }

  // Tool-level error state
  if (!mapResult?.success) {
    return (
      <div className="my-4 rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {mapResult?.error || "Unable to display map"}
        </p>
      </div>
    );
  }

  // No data to render
  if (!stableData) return null;

  // Render the memoized map with stable data
  return (
    <MemoizedMapDisplay
      key={`map-${stableData.bounds[0][0]}-${stableData.bounds[1][1]}`}
      geoJSON={stableData.geoJSON}
      bounds={stableData.bounds}
      overlays={stableData.overlays}
    />
  );
};
