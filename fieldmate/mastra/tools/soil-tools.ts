import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cachedBoundaries, cachedFields } from "@/db/schema/john-deere-cache";
import {
  calculateBoundingBox,
  toLeafletBounds,
  type GeoJSONGeometry,
} from "@/lib/geo-utils";
import { fetchSSURGOSoilData } from "@/lib/ssurgo-wfs";
import intersect from "@turf/intersect";
import area from "@turf/area";
import { polygon, multiPolygon, featureCollection } from "@turf/helpers";
import type {
  Feature,
  Polygon,
  MultiPolygon,
  FeatureCollection,
  Geometry,
} from "geojson";
import { logToolTokens } from "../utils/token-logger";

// Type for soil feature properties from SSURGO
interface SoilProperties {
  mukey?: string | number;
  muname?: string;
  musym?: string;
  drclassdcd?: string;
  farmlndcl?: string;
  hydgrpdcd?: string;
  slopegradwta?: number;
  aws0100wta?: number;
  niccdcd?: string;
  flodfreqdcd?: string;
}

// Clipped soil feature with area calculations
interface ClippedSoilFeature {
  mukey: string;
  muname: string;
  musym: string;
  drainageClass: string | null;
  farmlandClass: string | null;
  hydrologicGroup: string | null;
  slope: number | null;
  awc: number | null;
  areaAcres: number;
  percentOfField: number;
  geometry: Geometry;
}

// Soil composition summary
interface SoilComposition {
  dominantSoil: string;
  dominantSoilPercent: number;
  soils: Array<{
    name: string;
    acres: number;
    percent: number;
    drainage: string | null;
  }>;
  weightedSlope: number | null;
  weightedAWC: number | null;
  primaryDrainage: string | null;
}

/**
 * Clip a soil feature to the field boundary using turf.intersect
 * turf v7 requires a FeatureCollection with 2+ features
 */
function clipFeatureToField(
  soilFeature: Feature<Polygon | MultiPolygon>,
  fieldFeature: Feature<Polygon | MultiPolygon>
): Feature<Polygon | MultiPolygon> | null {
  try {
    const fc = featureCollection([soilFeature, fieldFeature]);
    const clipped = intersect(fc);
    return clipped;
  } catch (error) {
    console.error("Failed to clip soil feature:", error);
    return null;
  }
}

/**
 * Calculate area in acres from a GeoJSON geometry
 */
function calculateAreaAcres(geom: Geometry | GeoJSONGeometry): number {
  try {
    // turf.area returns square meters
    const sqMeters = area(geom as Geometry);
    // Convert to acres (1 acre = 4046.8564224 sq meters)
    return sqMeters / 4046.8564224;
  } catch {
    return 0;
  }
}

/**
 * Convert our GeoJSONGeometry to a turf Feature
 */
function geometryToFeature(
  geometry: GeoJSONGeometry
): Feature<Polygon | MultiPolygon> {
  if (geometry.type === "Polygon") {
    return polygon(geometry.coordinates as number[][][]);
  } else {
    return multiPolygon(geometry.coordinates as number[][][][]);
  }
}

/**
 * Process SSURGO features: clip to field boundary and calculate areas
 */
function processSSURGOFeatures(
  soilFeatures: FeatureCollection,
  fieldGeometry: GeoJSONGeometry,
  fieldAreaAcres: number
): ClippedSoilFeature[] {
  // Convert field geometry to turf feature
  const fieldFeature = geometryToFeature(fieldGeometry);

  const clippedFeatures: ClippedSoilFeature[] = [];

  for (const feature of soilFeatures.features) {
    if (
      !feature.geometry ||
      !["Polygon", "MultiPolygon"].includes(feature.geometry.type)
    ) {
      continue;
    }

    // Clip soil polygon to field boundary
    const clipped = clipFeatureToField(
      feature as Feature<Polygon | MultiPolygon>,
      fieldFeature
    );

    if (!clipped || !clipped.geometry) continue;

    const props = feature.properties as SoilProperties;
    const areaAcres = calculateAreaAcres(clipped.geometry);

    // Skip tiny slivers (< 0.01 acres)
    if (areaAcres < 0.01) continue;

    clippedFeatures.push({
      mukey: String(props.mukey || "unknown"),
      muname: props.muname || "Unknown Soil",
      musym: props.musym || "",
      drainageClass: props.drclassdcd || null,
      farmlandClass: props.farmlndcl || null,
      hydrologicGroup: props.hydgrpdcd || null,
      slope: props.slopegradwta ?? null,
      awc: props.aws0100wta ?? null,
      areaAcres: Math.round(areaAcres * 100) / 100,
      percentOfField:
        fieldAreaAcres > 0
          ? Math.round((areaAcres / fieldAreaAcres) * 1000) / 10
          : 0,
      geometry: clipped.geometry,
    });
  }

  // Sort by area (largest first)
  return clippedFeatures.sort((a, b) => b.areaAcres - a.areaAcres);
}

/**
 * Calculate soil composition summary from clipped features
 */
function calculateSoilComposition(
  features: ClippedSoilFeature[],
  fieldAreaAcres: number
): SoilComposition {
  if (features.length === 0) {
    return {
      dominantSoil: "Unknown",
      dominantSoilPercent: 0,
      soils: [],
      weightedSlope: null,
      weightedAWC: null,
      primaryDrainage: null,
    };
  }

  // Calculate weighted averages
  let totalWeightedSlope = 0;
  let totalWeightedAWC = 0;
  let slopeWeight = 0;
  let awcWeight = 0;
  const drainageCounts: Record<string, number> = {};

  for (const f of features) {
    if (f.slope !== null) {
      totalWeightedSlope += f.slope * f.areaAcres;
      slopeWeight += f.areaAcres;
    }
    if (f.awc !== null) {
      totalWeightedAWC += f.awc * f.areaAcres;
      awcWeight += f.areaAcres;
    }
    if (f.drainageClass) {
      drainageCounts[f.drainageClass] =
        (drainageCounts[f.drainageClass] || 0) + f.areaAcres;
    }
  }

  // Find primary drainage class
  let primaryDrainage: string | null = null;
  let maxDrainageArea = 0;
  for (const [drainage, drainageArea] of Object.entries(drainageCounts)) {
    if (drainageArea > maxDrainageArea) {
      maxDrainageArea = drainageArea;
      primaryDrainage = drainage;
    }
  }

  const dominant = features[0];

  return {
    dominantSoil: dominant.muname,
    dominantSoilPercent: dominant.percentOfField,
    soils: features.slice(0, 5).map((f) => ({
      name: f.muname,
      acres: f.areaAcres,
      percent: f.percentOfField,
      drainage: f.drainageClass,
    })),
    weightedSlope:
      slopeWeight > 0
        ? Math.round((totalWeightedSlope / slopeWeight) * 10) / 10
        : null,
    weightedAWC:
      awcWeight > 0
        ? Math.round((totalWeightedAWC / awcWeight) * 10) / 10
        : null,
    primaryDrainage,
  };
}

/**
 * Create GeoJSON FeatureCollection from clipped soil features
 */
function createSoilGeoJSON(features: ClippedSoilFeature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.map((f) => ({
      type: "Feature" as const,
      properties: {
        mukey: f.mukey,
        muname: f.muname,
        musym: f.musym,
        drclassdcd: f.drainageClass,
        farmlndcl: f.farmlandClass,
        hydgrpdcd: f.hydrologicGroup,
        slopegradwta: f.slope,
        aws0100wta: f.awc,
        areaAcres: f.areaAcres,
        percentOfField: f.percentOfField,
      },
      geometry: f.geometry,
    })),
  };
}

/**
 * Tool: Get Soil Data
 *
 * Query SSURGO soil data for a field, clip to field boundary, and return
 * both a condensed summary for the LLM and full data for map visualization.
 */
export const getSoilDataTool = createTool({
  id: "getSoilData",
  description:
    "Get SSURGO soil data for a specific field. Returns soil composition analysis with dominant soil types, drainage characteristics, and slope information. The soil data is clipped to the field boundary for accurate acreage calculations. Use this when users ask about soil types, soil data, drainage, or land characteristics for a field.",
  inputSchema: z.object({
    fieldId: z.string().describe("The field ID to get soil data for"),
    fieldName: z
      .string()
      .optional()
      .describe("Name of the field for display purposes"),
  }),
  execute: async ({ context }) => {
    const { fieldId, fieldName: inputFieldName } = context;

    try {
      // 1. Fetch field boundary from cache
      const boundaries = await db
        .select()
        .from(cachedBoundaries)
        .where(eq(cachedBoundaries.fieldId, fieldId))
        .limit(1);

      if (boundaries.length === 0) {
        return {
          success: false,
          error: `No cached boundary found for field ${fieldId}. Please use get_field_boundaries first to cache the boundary.`,
        };
      }

      const boundary = boundaries[0];
      if (!boundary.geometry) {
        return {
          success: false,
          error: "Boundary has no geometry data",
        };
      }

      const fieldGeometry = boundary.geometry as unknown as GeoJSONGeometry;

      // Get field name if not provided
      let fieldName = inputFieldName;
      if (!fieldName) {
        const fields = await db
          .select({ name: cachedFields.name })
          .from(cachedFields)
          .where(eq(cachedFields.fieldId, fieldId))
          .limit(1);
        fieldName = fields[0]?.name || fieldId;
      }

      // 2. Calculate bounding box for WFS query
      const boundingBox = calculateBoundingBox([fieldGeometry]);

      // 3. Fetch SSURGO data from WFS
      const soilFeatures = await fetchSSURGOSoilData(boundingBox);

      if (!soilFeatures.features || soilFeatures.features.length === 0) {
        return {
          success: false,
          error:
            "No soil data available for this field location. SSURGO data may not cover this area.",
        };
      }

      // 4. Calculate field area
      const fieldAreaAcres = calculateAreaAcres(fieldGeometry);

      // 5. Clip soil polygons to field boundary
      const clippedFeatures = processSSURGOFeatures(
        soilFeatures,
        fieldGeometry,
        fieldAreaAcres
      );

      if (clippedFeatures.length === 0) {
        return {
          success: false,
          error: "No soil polygons intersect with the field boundary.",
        };
      }

      // 6. Calculate soil composition summary
      const composition = calculateSoilComposition(
        clippedFeatures,
        fieldAreaAcres
      );

      // 7. Create GeoJSON for UI
      const soilGeoJSON = createSoilGeoJSON(clippedFeatures);

      // 8. Create field boundary GeoJSON for overlay
      const fieldGeoJSON: FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { fieldId, fieldName, area: fieldAreaAcres },
            geometry: fieldGeometry as Geometry,
          },
        ],
      };

      // 9. Calculate bounds for map
      const bounds = toLeafletBounds(boundingBox);

      // Build a minimal text summary for LLM context (reduces tokens significantly)
      const topSoilsText = composition.soils
        .slice(0, 2)
        .map((s) => `${s.name} (${s.percent}%)`)
        .join(", ");

      const agentSummary = `${fieldName}: ${Math.round(fieldAreaAcres * 10) / 10} ac. ` +
        `Dominant: ${composition.dominantSoil} (${composition.dominantSoilPercent}%). ` +
        `Drainage: ${composition.primaryDrainage || "unknown"}. ` +
        `${clippedFeatures.length} soil types. ` +
        (composition.weightedSlope ? `Slope: ${composition.weightedSlope}%. ` : "") +
        `Top soils: ${topSoilsText}`;

      const result = {
        success: true,
        // UI data - full payload for map rendering
        uiData: {
          fieldGeoJSON,
          soilGeoJSON,
          bounds,
          center: [
            (boundingBox.minLat + boundingBox.maxLat) / 2,
            (boundingBox.minLng + boundingBox.maxLng) / 2,
          ] as [number, number],
          fieldName,
          fieldAreaAcres: Math.round(fieldAreaAcres * 10) / 10,
          soilCount: clippedFeatures.length,
        },
        // Minimal text summary for LLM context
        agentSummary,
      };

      // Log only the agentSummary size for accurate LLM context tracking
      logToolTokens("getSoilData", context, { success: true, agentSummary });
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to get soil data: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// Export all soil tools
export const soilTools = {
  getSoilData: getSoilDataTool,
};
