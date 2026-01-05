import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  calculateCenterPoint,
  isInContinentalUS,
  type GeoJSONGeometry,
} from "@/lib/geo-utils";
import { db } from "@/db/client";
import { cachedBoundaries } from "@/db/schema/john-deere-cache";

/**
 * Tool: Get Weather
 *
 * Get current weather and forecast for a location.
 * Accepts either direct coordinates OR a fieldId to look up the boundary from cache.
 */
export const getWeatherTool = createTool({
  id: "getWeather",
  description:
    "Get current weather and forecast for a location. Can accept direct coordinates OR a fieldId (to look up the cached boundary and calculate center point). Use this when users ask about weather for their fields or a specific location.",
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
  }),
  execute: async ({ context }) => {
    const { latitude, longitude, fieldId, fieldName } = context;

    let finalLat: number;
    let finalLng: number;

    // Look up boundary from cache if fieldId provided
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

    // Validate coordinates are in US (NWS API limitation)
    if (!isInContinentalUS(finalLat, finalLng)) {
      return {
        success: false,
        error:
          "Weather data is only available for US locations (NWS API limitation)",
      };
    }

    // Return coordinates for the UI component to render
    // The actual weather fetching is done by the Weather component on the client
    return {
      success: true,
      latitude: finalLat,
      longitude: finalLng,
      fieldName: fieldName || null,
    };
  },
});

// Export all weather tools
export const weatherTools = {
  getWeather: getWeatherTool,
};
