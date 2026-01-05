"use client";

import { memo, useMemo } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";

// Dynamic import to avoid SSR issues with Leaflet
const Map = dynamic(
  () => import("@acreblitz/react-components").then((mod) => mod.Map),
  { ssr: false, loading: () => <SoilMapLoadingPlaceholder /> }
);

function SoilMapLoadingPlaceholder() {
  return (
    <div className="my-4 h-[400px] w-full animate-pulse rounded-lg bg-muted" />
  );
}

interface SoilToolResult {
  success: boolean;
  error?: string;
  uiData?: {
    fieldGeoJSON: FeatureCollection;
    soilGeoJSON: FeatureCollection;
    bounds: [[number, number], [number, number]];
    center: [number, number];
    fieldName: string;
    fieldAreaAcres: number;
    soilCount: number;
  };
  agentSummary?: {
    fieldName: string;
    fieldAreaAcres: number;
    dominantSoil: string;
    dominantSoilPercent: number;
    soilTypeCount: number;
    primaryDrainage: string | null;
    weightedSlope: number | null;
    weightedAWC: number | null;
    soils: Array<{
      name: string;
      percent: number;
      drainage: string | null;
    }>;
  };
}

/**
 * Get fill color for soil based on drainage class
 */
function getDrainageColor(drainage: string | null): string {
  if (!drainage) return "#94a3b8"; // Default gray

  const d = drainage.toLowerCase();
  if (d.includes("excessively")) return "#16a34a"; // Dark green
  if (d.includes("well") && !d.includes("moderately") && !d.includes("somewhat"))
    return "#22c55e"; // Green
  if (d.includes("moderately well")) return "#84cc16"; // Lime
  if (d.includes("somewhat poorly")) return "#eab308"; // Yellow
  if (d.includes("poorly") && !d.includes("somewhat") && !d.includes("very"))
    return "#f97316"; // Orange
  if (d.includes("very poorly")) return "#ef4444"; // Red

  return "#94a3b8"; // Default gray
}

/**
 * Soil Legend component showing soil types and their colors
 */
function SoilLegend({
  soils,
}: {
  soils: Array<{ name: string; percent: number; drainage: string | null }>;
}) {
  if (soils.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] max-w-xs rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm">
      <h4 className="mb-2 text-sm font-semibold">Soil Types</h4>
      <div className="space-y-1.5">
        {soils.map((soil, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div
              className="h-3 w-3 shrink-0 rounded"
              style={{
                backgroundColor: getDrainageColor(soil.drainage),
              }}
            />
            <span className="truncate flex-1" title={soil.name}>
              {soil.name}
            </span>
            <span className="ml-auto text-muted-foreground whitespace-nowrap">
              {soil.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Memoized map display component for soil data visualization
 */
const MemoizedSoilMapDisplay = memo(function MemoizedSoilMapDisplay({
  fieldGeoJSON,
  soilGeoJSON,
  bounds,
  fieldName,
  soils,
}: {
  fieldGeoJSON: FeatureCollection;
  soilGeoJSON: FeatureCollection;
  bounds: [[number, number], [number, number]];
  fieldName: string;
  soils: Array<{ name: string; percent: number; drainage: string | null }>;
}) {
  // Combine field boundary and soil data into one GeoJSON
  // Field boundary will be rendered as outline, soils as filled polygons
  const combinedGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: [
        // Add soil features first (rendered below)
        ...soilGeoJSON.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            _layerType: "soil",
          },
        })),
        // Add field boundary on top (rendered as outline only)
        ...fieldGeoJSON.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            _layerType: "field",
          },
        })),
      ],
    };
  }, [fieldGeoJSON, soilGeoJSON]);

  return (
    <div className="relative my-4 w-full">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Soil data for {fieldName}
      </p>
      <div className="relative">
        <Map
          height="400px"
          bounds={bounds}
          initialGeoJSON={combinedGeoJSON}
          showLayerControl={true}
          showZoomControl={true}
          showScaleControl={true}
          scrollWheelZoom={true}
          className="rounded-lg border shadow-sm"
        />
        <SoilLegend soils={soils} />
      </div>
    </div>
  );
});

/**
 * Soil Tool UI Component
 *
 * Renders an interactive map displaying field boundary with clipped soil
 * polygons and a legend showing soil composition.
 */
export const SoilToolUI: ToolCallMessagePartComponent = ({
  toolName,
  result,
  status,
}) => {
  // Only handle getSoilData tool
  if (toolName !== "getSoilData") return null;

  const soilResult = result as SoilToolResult | undefined;

  // Memoize data to prevent unnecessary re-renders during streaming
  const stableData = useMemo(() => {
    if (
      !soilResult?.success ||
      !soilResult.uiData ||
      !soilResult.agentSummary
    ) {
      return null;
    }
    return {
      uiData: soilResult.uiData,
      agentSummary: soilResult.agentSummary,
    };
  }, [soilResult?.success, soilResult?.uiData, soilResult?.agentSummary]);

  // Loading state
  if (status?.type === "requires-action" || status?.type === "running") {
    return <SoilMapLoadingPlaceholder />;
  }

  // Framework-level error state
  if (status?.type === "incomplete") {
    return (
      <div className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load soil data</p>
      </div>
    );
  }

  // Tool-level error state
  if (!soilResult?.success) {
    return (
      <div className="my-4 rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {soilResult?.error || "Unable to get soil data"}
        </p>
      </div>
    );
  }

  // No data to render
  if (!stableData) return null;

  // Render the memoized map with soil data
  return (
    <MemoizedSoilMapDisplay
      key={`soil-${stableData.uiData.bounds[0][0]}-${stableData.uiData.bounds[1][1]}`}
      fieldGeoJSON={stableData.uiData.fieldGeoJSON}
      soilGeoJSON={stableData.uiData.soilGeoJSON}
      bounds={stableData.uiData.bounds}
      fieldName={stableData.uiData.fieldName}
      soils={stableData.agentSummary.soils}
    />
  );
};
