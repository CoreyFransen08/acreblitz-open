import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  calculateCenterPoint,
  isInContinentalUS,
  type GeoJSONGeometry,
} from "@/lib/geo-utils";
import { db } from "@/db/client";
import { cachedBoundaries, cachedFields } from "@/db/schema/john-deere-cache";
import {
  fetchDailySoilMoisture,
  getDefaultSoilMoistureDateRange,
  getMoistureDescription,
  type SoilMoistureResult,
} from "../utils/precip-ai-client";
import { logToolTokens } from "../utils/token-logger";

/**
 * Build natural language summary for agent responses
 */
function buildAgentSummary(
  result: SoilMoistureResult,
  fieldName: string | null,
  startDate: string,
  endDate: string
): {
  fieldName: string | null;
  dateRange: string;
  averageMoisture: number | null;
  moistureDescription: string;
  minMoisture: number | null;
  maxMoisture: number | null;
  daysWithData: number;
  trend: string;
} {
  const moistureDescription = result.averageMoisture !== null
    ? getMoistureDescription(result.averageMoisture)
    : "No data";

  // Calculate trend (comparing first half to second half of period)
  let trend = "stable";
  if (result.days.length >= 4) {
    const midpoint = Math.floor(result.days.length / 2);
    const firstHalf = result.days.slice(0, midpoint);
    const secondHalf = result.days.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, d) => sum + (d.soil_moisture ?? 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + (d.soil_moisture ?? 0), 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    if (change > 3) trend = "increasing";
    else if (change < -3) trend = "decreasing";
  }

  return {
    fieldName,
    dateRange: `${startDate} to ${endDate}`,
    averageMoisture: result.averageMoisture,
    moistureDescription,
    minMoisture: result.minMoisture,
    maxMoisture: result.maxMoisture,
    daysWithData: result.days.filter(d => d.soil_moisture !== null).length,
    trend,
  };
}

/**
 * Tool: Get Soil Moisture
 *
 * Get daily soil moisture data from Precip AI for a location.
 * Accepts either direct coordinates OR a fieldId to look up the boundary from cache.
 * Uses 1-hour caching to reduce API calls.
 */
export const getSoilMoistureTool = createTool({
  id: "getSoilMoisture",
  description:
    "Get daily soil moisture data for a location over a date range. Returns average, min, max moisture levels and trend. Use this when users ask about soil moisture, ground wetness, field conditions for planting/harvesting, or whether a field is too wet to work. Default date range is the last 7 days if not specified.",
  inputSchema: z.object({
    latitude: z
      .number()
      .optional()
      .describe("Latitude (-90 to 90). Required if no fieldId provided."),
    longitude: z
      .number()
      .optional()
      .describe("Longitude (-180 to 180). Required if no fieldId provided."),
    fieldId: z
      .string()
      .optional()
      .describe(
        "Field ID to look up cached boundary geometry. Center point will be calculated automatically."
      ),
    fieldName: z
      .string()
      .optional()
      .describe("Name of the field for display purposes"),
    startDate: z
      .string()
      .optional()
      .describe("Start date in YYYY-MM-DD format. Defaults to 7 days ago."),
    endDate: z
      .string()
      .optional()
      .describe("End date in YYYY-MM-DD format. Defaults to today."),
    includeDaily: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "If true, includes daily moisture values in the response. Default is false (returns only summary statistics)."
      ),
  }),
  execute: async ({ context }) => {
    const {
      latitude,
      longitude,
      fieldId,
      fieldName: inputFieldName,
      startDate: inputStartDate,
      endDate: inputEndDate,
      includeDaily,
    } = context;

    let finalLat: number;
    let finalLng: number;
    let resolvedFieldName: string | null = inputFieldName || null;

    // Resolve coordinates from fieldId or direct input
    if (fieldId) {
      try {
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

        const center = calculateCenterPoint(
          boundary.geometry as unknown as GeoJSONGeometry
        );
        finalLat = center.latitude;
        finalLng = center.longitude;

        // Get field name if not provided
        if (!resolvedFieldName) {
          const fields = await db
            .select({ name: cachedFields.name })
            .from(cachedFields)
            .where(eq(cachedFields.fieldId, fieldId))
            .limit(1);
          resolvedFieldName = fields[0]?.name || fieldId;
        }
      } catch {
        return {
          success: false,
          error: "Failed to calculate center point from boundary geometry",
        };
      }
    } else if (latitude !== undefined && longitude !== undefined) {
      finalLat = latitude;
      finalLng = longitude;
    } else {
      return {
        success: false,
        error:
          "Either coordinates (latitude/longitude) or a fieldId must be provided",
      };
    }

    // Validate coordinates are in CONUS
    if (!isInContinentalUS(finalLat, finalLng)) {
      return {
        success: false,
        error:
          "Soil moisture data is only available for US locations",
      };
    }

    // Resolve date range
    const defaultRange = getDefaultSoilMoistureDateRange();
    const startDate = inputStartDate || defaultRange.startDate;
    const endDate = inputEndDate || defaultRange.endDate;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return {
        success: false,
        error: "Dates must be in YYYY-MM-DD format",
      };
    }

    try {
      // Fetch soil moisture data (with automatic 1-hour caching)
      const results = await fetchDailySoilMoisture({
        coordinates: [{ latitude: finalLat, longitude: finalLng }],
        startDate,
        endDate,
        timeZoneId: "America/Chicago",
      });

      if (results.length === 0) {
        return {
          success: false,
          error: "No soil moisture data available for this location",
        };
      }

      const result = results[0];

      // Build agent summary
      const agentSummary = buildAgentSummary(
        result,
        resolvedFieldName,
        startDate,
        endDate
      );

      // Build response based on includeDaily flag
      let toolResult;
      if (includeDaily) {
        toolResult = {
          success: true,
          agentSummary,
          uiData: {
            fieldName: resolvedFieldName,
            latitude: result.latitude,
            longitude: result.longitude,
            timeZoneId: result.timeZoneId,
            startDate,
            endDate,
            days: result.days,
            averageMoisture: result.averageMoisture,
            minMoisture: result.minMoisture,
            maxMoisture: result.maxMoisture,
          },
        };
      } else {
        // Default: condensed response with just summary statistics
        toolResult = {
          success: true,
          agentSummary,
        };
      }

      logToolTokens("getSoilMoisture", context, toolResult);
      return toolResult;
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch soil moisture: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});

// Export all soil moisture tools
export const soilMoistureTools = {
  getSoilMoisture: getSoilMoistureTool,
};
