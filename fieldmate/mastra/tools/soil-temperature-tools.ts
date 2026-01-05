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
  fetchSoilTemperature,
  getCurrentSoilTempDateRange,
  getSoilTempTrendDateRange,
  getSoilTempDescription,
  celsiusToFahrenheit,
  type SoilTemperatureResult,
} from "../utils/precip-ai-client";
import { logToolTokens } from "../utils/token-logger";

/**
 * Build natural language summary for agent responses
 */
function buildAgentSummary(
  result: SoilTemperatureResult,
  fieldName: string | null,
  showTrend: boolean
): {
  fieldName: string | null;
  currentTemperatureCelsius: number | null;
  currentTemperatureFahrenheit: number | null;
  temperatureDescription: string;
  averageTemperatureCelsius: number | null;
  minTemperatureCelsius: number | null;
  maxTemperatureCelsius: number | null;
  hoursOfData: number;
  trend: string;
} {
  const currentTemp = result.currentTemperature;
  const tempDescription = currentTemp !== null
    ? getSoilTempDescription(currentTemp)
    : "No data";

  // Calculate trend (comparing first half to second half of period)
  let trend = "stable";
  if (showTrend && result.hours.length >= 4) {
    const temps: number[] = [];
    for (const hour of result.hours) {
      // Extract temperature from hour data (handle different field names)
      const hourData = hour as unknown as Record<string, unknown>;
      const temp =
        (typeof hourData.temperature === "number" ? hourData.temperature : null) ??
        (typeof hourData.temp_0_10cm === "number" ? hourData.temp_0_10cm : null) ??
        (typeof hourData["temp_0-10cm"] === "number" ? hourData["temp_0-10cm"] : null);
      if (typeof temp === "number") {
        temps.push(temp);
      }
    }

    if (temps.length >= 4) {
      const midpoint = Math.floor(temps.length / 2);
      const firstHalf = temps.slice(0, midpoint);
      const secondHalf = temps.slice(midpoint);

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = secondAvg - firstAvg;
      if (change > 1) trend = "warming";
      else if (change < -1) trend = "cooling";
    }
  }

  return {
    fieldName,
    currentTemperatureCelsius: currentTemp,
    currentTemperatureFahrenheit: currentTemp !== null ? celsiusToFahrenheit(currentTemp) : null,
    temperatureDescription: tempDescription,
    averageTemperatureCelsius: result.averageTemperature,
    minTemperatureCelsius: result.minTemperature,
    maxTemperatureCelsius: result.maxTemperature,
    hoursOfData: result.hours.length,
    trend,
  };
}

/**
 * Tool: Get Soil Temperature
 *
 * Get soil temperature data (0-10cm depth) from Precip AI for a location.
 * Accepts either direct coordinates OR a fieldId to look up the boundary from cache.
 *
 * Two modes:
 * 1. Current temperature (default): Returns just the current temp reading
 * 2. Trend mode (includeTrend: true): Returns hourly data for chart display
 */
export const getSoilTemperatureTool = createTool({
  id: "getSoilTemperature",
  description:
    "Get soil temperature data (0-10cm depth) for a location. By default returns the current temperature. Use includeTrend: true to get hourly data to display a trend chart (default 7 days, can specify trendDays for longer periods like 14 for 2 weeks). Use this when users ask about soil temperature, ground temperature, or planting conditions related to temperature.",
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
    includeTrend: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "If true, fetches hourly data and includes it for trend chart display. Default is false (returns only current temperature)."
      ),
    trendDays: z
      .number()
      .optional()
      .default(7)
      .describe(
        "Number of days of historical data to fetch when includeTrend is true. Default is 7 days. Use 14 for 2 weeks."
      ),
  }),
  execute: async ({ context }) => {
    const {
      latitude,
      longitude,
      fieldId,
      fieldName: inputFieldName,
      includeTrend,
      trendDays,
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
          "Soil temperature data is only available for US locations",
      };
    }

    // Determine date range based on mode
    const dateRange = includeTrend
      ? getSoilTempTrendDateRange(trendDays ?? 7)
      : getCurrentSoilTempDateRange();

    try {
      // Fetch soil temperature data (with automatic caching)
      const results = await fetchSoilTemperature({
        coordinates: [{ latitude: finalLat, longitude: finalLng }],
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        timeZoneId: "America/Chicago",
      });

      if (results.length === 0) {
        return {
          success: false,
          error: "No soil temperature data available for this location",
        };
      }

      const result = results[0];

      // Build agent summary
      const agentSummary = buildAgentSummary(
        result,
        resolvedFieldName,
        includeTrend ?? false
      );

      // Build response based on includeTrend flag
      let toolResult;
      if (includeTrend) {
        toolResult = {
          success: true,
          agentSummary,
          uiData: {
            fieldName: resolvedFieldName,
            latitude: result.latitude,
            longitude: result.longitude,
            timeZoneId: result.timeZoneId,
            hours: result.hours,
            currentTemperature: result.currentTemperature,
            averageTemperature: result.averageTemperature,
            minTemperature: result.minTemperature,
            maxTemperature: result.maxTemperature,
          },
        };
      } else {
        // Default: just return current temperature summary
        toolResult = {
          success: true,
          agentSummary,
        };
      }

      logToolTokens("getSoilTemperature", context, toolResult);
      return toolResult;
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch soil temperature: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});

// Export all soil temperature tools
export const soilTemperatureTools = {
  getSoilTemperature: getSoilTemperatureTool,
};
