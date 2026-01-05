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
  fetchRainForecast,
  type RainForecastData,
} from "../utils/nws-rain-forecast";

/**
 * Build natural language summary for agent responses
 */
function buildAgentSummary(
  forecast: RainForecastData,
  fieldName: string | null
): {
  location: string;
  fieldName: string | null;
  totalPrecipitation48hr: number;
  totalPrecipitationDescription: string;
  rainPeriods: string[];
  highestChanceHour: { time: string; chance: number } | null;
} {
  const locationStr = `${forecast.location.city}, ${forecast.location.state}`;

  // Generate human-readable precipitation description
  const totalInches = forecast.totalPrecipitation48hr;
  let description: string;
  if (totalInches === 0) {
    description = "No rain expected";
  } else if (totalInches < 0.1) {
    description = "Trace amounts possible";
  } else if (totalInches < 0.25) {
    description = "Light rain expected";
  } else if (totalInches < 0.5) {
    description = "Moderate rain expected";
  } else if (totalInches < 1.0) {
    description = "Significant rain expected";
  } else {
    description = "Heavy rain expected";
  }

  // Find rain periods (consecutive hours with precipitation)
  const rainPeriods: string[] = [];
  let periodStart: string | null = null;
  let periodTotal = 0;

  for (let i = 0; i < forecast.hourly.length; i++) {
    const hour = forecast.hourly[i];
    const hasRain =
      (hour.precipitationAmount ?? 0) > 0 ||
      (hour.precipitationChance ?? 0) >= 40;

    if (hasRain && !periodStart) {
      periodStart = hour.validTime;
      periodTotal = hour.precipitationAmount ?? 0;
    } else if (hasRain && periodStart) {
      periodTotal += hour.precipitationAmount ?? 0;
    } else if (!hasRain && periodStart) {
      // End of rain period
      const startDate = new Date(periodStart);
      const endDate = new Date(forecast.hourly[i - 1].validTime);
      rainPeriods.push(
        `${formatTimeRange(startDate, endDate)} (~${periodTotal.toFixed(2)}")`
      );
      periodStart = null;
      periodTotal = 0;
    }
  }

  // Handle rain period that extends to end of forecast
  if (periodStart) {
    const startDate = new Date(periodStart);
    const endDate = new Date(forecast.hourly[forecast.hourly.length - 1].validTime);
    rainPeriods.push(
      `${formatTimeRange(startDate, endDate)} (~${periodTotal.toFixed(2)}")`
    );
  }

  // Find hour with highest precipitation chance
  let highestChanceHour: { time: string; chance: number } | null = null;
  for (const hour of forecast.hourly) {
    if (
      hour.precipitationChance !== null &&
      (!highestChanceHour || hour.precipitationChance > highestChanceHour.chance)
    ) {
      highestChanceHour = {
        time: hour.validTime,
        chance: hour.precipitationChance,
      };
    }
  }

  return {
    location: locationStr,
    fieldName,
    totalPrecipitation48hr: Math.round(totalInches * 100) / 100,
    totalPrecipitationDescription: description,
    rainPeriods: rainPeriods.slice(0, 3),
    highestChanceHour,
  };
}

/**
 * Format a time range for display
 */
function formatTimeRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    hour: "numeric",
    hour12: true,
  };

  const startStr = start.toLocaleString("en-US", options);

  if (start.getTime() === end.getTime()) {
    return startStr;
  }

  const endOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: true,
  };

  // Include weekday in end time if different day
  if (start.getDate() !== end.getDate()) {
    endOptions.weekday = "short";
  }

  const endStr = end.toLocaleString("en-US", endOptions);
  return `${startStr} - ${endStr}`;
}

/**
 * Tool: Get Rain Forecast
 *
 * Get 48-hour rain accumulation forecast for a location.
 * Accepts either direct coordinates OR a fieldId to look up the boundary from cache.
 * Uses 5-minute caching to reduce NWS API calls.
 */
export const getRainForecastTool = createTool({
  id: "getRainForecast",
  description:
    "Get 48-hour rain accumulation forecast for a location. Returns the total expected precipitation in inches for the next 48 hours. Optionally includes full hourly breakdown. Use this when users ask specifically about upcoming rain, precipitation, or need to plan around weather. For general weather conditions (temperature, wind, etc.), use getWeather instead.",
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
    includeFullForecast: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "If true, includes full hourly precipitation breakdown in the response. Default is false (returns only 48hr total)."
      ),
  }),
  execute: async ({ context }) => {
    const {
      latitude,
      longitude,
      fieldId,
      fieldName: inputFieldName,
      includeFullForecast,
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

    // Validate coordinates are in CONUS (NWS API limitation)
    if (!isInContinentalUS(finalLat, finalLng)) {
      return {
        success: false,
        error:
          "Rain forecast data is only available for US locations (NWS API limitation)",
      };
    }

    try {
      // Fetch rain forecast (with automatic 5-minute caching)
      const forecast = await fetchRainForecast(finalLat, finalLng);

      // Build agent summary
      const agentSummary = buildAgentSummary(forecast, resolvedFieldName);

      // Build response based on includeFullForecast flag
      if (includeFullForecast) {
        return {
          success: true,
          agentSummary,
          uiData: {
            location: forecast.location,
            hourly: forecast.hourly,
            totalPrecipitation48hr: forecast.totalPrecipitation48hr,
            creationTime: forecast.creationTime,
            fieldName: resolvedFieldName,
          },
        };
      } else {
        // Default: condensed response with just the 48hr total
        return {
          success: true,
          agentSummary,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch rain forecast: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});

// Export all rain forecast tools
export const rainForecastTools = {
  getRainForecast: getRainForecastTool,
};
