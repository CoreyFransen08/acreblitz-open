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
  fetchHourlyPrecipitation,
  getPrecipDateRange,
  getPrecipDescription,
  type HourlyPrecipitationResult,
} from "../utils/precip-ai-client";
import { logToolTokens } from "../utils/token-logger";

/**
 * Build natural language summary for agent responses
 */
function buildAgentSummary(
  result: HourlyPrecipitationResult,
  fieldName: string | null,
  startDate: string,
  endDate: string
): {
  fieldName: string | null;
  dateRange: string;
  totalPrecipitationInches: number;
  precipDescription: string;
  maxHourlyInches: number;
  hoursWithPrecip: number;
  precipType: "rain" | "snow" | "mixed" | null;
} {
  const precipDescription = getPrecipDescription(result.totalPrecipitationInches);

  // Determine dominant precip type from hours with precipitation
  let precipType: "rain" | "snow" | "mixed" | null = null;
  const typeCounts = { rain: 0, snow: 0, mixed: 0 };

  for (const hour of result.hours) {
    if (hour.precip > 0 && hour.precip_type) {
      typeCounts[hour.precip_type]++;
    }
  }

  const maxCount = Math.max(typeCounts.rain, typeCounts.snow, typeCounts.mixed);
  if (maxCount > 0) {
    if (typeCounts.rain === maxCount) precipType = "rain";
    else if (typeCounts.snow === maxCount) precipType = "snow";
    else precipType = "mixed";
  }

  return {
    fieldName,
    dateRange: `${startDate} to ${endDate}`,
    totalPrecipitationInches: result.totalPrecipitationInches,
    precipDescription,
    maxHourlyInches: result.maxHourlyInches,
    hoursWithPrecip: result.hoursWithPrecip,
    precipType,
  };
}

/**
 * Tool: Get Hourly Precipitation
 *
 * Get hourly precipitation data from Precip AI for a location.
 * Accepts either direct coordinates OR a fieldId to look up the boundary from cache.
 * Uses 30-minute caching to reduce API calls.
 */
export const getHourlyPrecipitationTool = createTool({
  id: "getHourlyPrecipitation",
  description:
    "Get historical hourly precipitation data for a location over a date range (1-14 days). Returns total accumulation, max hourly amount, and hours with precipitation. Use this when users ask about past/recent precipitation, rainfall history, or how much rain has fallen. Default is last 7 days. Note: This shows HISTORICAL data. For forecasted rain, use getRainForecast instead.",
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
    days: z
      .number()
      .optional()
      .default(7)
      .describe(
        "Number of days of historical data (1-14). Default is 7 days. Use 3 for 'last few days', 14 for 'last 2 weeks'."
      ),
    includeHourly: z
      .boolean()
      .optional()
      .describe(
        "If true, includes hourly precipitation values for chart display. Automatically enabled for ranges > 1 day."
      ),
  }),
  execute: async ({ context }) => {
    const {
      latitude,
      longitude,
      fieldId,
      fieldName: inputFieldName,
      days,
      includeHourly,
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
          "Precipitation data is only available for US locations",
      };
    }

    // Validate days parameter (1-14)
    const validDays = Math.min(Math.max(days ?? 7, 1), 14);

    // Get date range
    const dateRange = getPrecipDateRange(validDays);

    try {
      // Fetch hourly precipitation data (with automatic 30-minute caching)
      const results = await fetchHourlyPrecipitation({
        coordinates: [{ latitude: finalLat, longitude: finalLng }],
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        timeZoneId: "America/Chicago",
      });

      if (results.length === 0) {
        return {
          success: false,
          error: "No precipitation data available for this location",
        };
      }

      const result = results[0];

      // Build agent summary
      const agentSummary = buildAgentSummary(
        result,
        resolvedFieldName,
        dateRange.startDate,
        dateRange.endDate
      );

      // Automatically show chart for ranges > 1 day, or when explicitly requested
      const shouldShowChart = includeHourly === true || validDays > 1;

      let toolResult;
      if (shouldShowChart) {
        toolResult = {
          success: true,
          agentSummary,
          uiData: {
            fieldName: resolvedFieldName,
            latitude: result.latitude,
            longitude: result.longitude,
            timeZoneId: result.timeZoneId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            hours: result.hours,
            totalPrecipitationInches: result.totalPrecipitationInches,
            maxHourlyInches: result.maxHourlyInches,
            hoursWithPrecip: result.hoursWithPrecip,
          },
        };
      } else {
        // Only for single-day requests without explicit includeHourly
        toolResult = {
          success: true,
          agentSummary,
        };
      }

      logToolTokens("getHourlyPrecipitation", context, toolResult);
      return toolResult;
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch precipitation data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});

// Export all precipitation tools
export const precipitationTools = {
  getHourlyPrecipitation: getHourlyPrecipitationTool,
};
