import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { cachedBoundaries, cachedFields } from "@/db/schema/john-deere-cache";
import {
  calculateBoundingBox,
  toLeafletBounds,
  createFeatureCollection,
  type GeoJSONGeometry,
  type FieldBoundaryData,
} from "@/lib/geo-utils";
import { logToolTokens } from "../utils/token-logger";

/**
 * Tool: Show Fields On Map
 *
 * Display field boundaries on an interactive map with optional data overlays.
 * Supports showing all fields, specific fields by ID, or searching by name.
 */
export const showFieldsOnMapTool = createTool({
  id: "showFieldsOnMap",
  description:
    "Display field boundaries on an interactive map. Can show all fields, specific fields by ID, or fields by name. Supports optional soil and hydrology data overlays. Use this when users ask to see their fields on a map or want to visualize field locations.",
  inputSchema: z.object({
    fieldIds: z
      .array(z.string())
      .optional()
      .describe("Specific field IDs to display"),
    fieldNames: z
      .array(z.string())
      .optional()
      .describe("Field names to search for (partial match)"),
    showAll: z
      .boolean()
      .optional()
      .describe("Show all cached fields"),
    enableSoilOverlay: z
      .boolean()
      .optional()
      .default(false)
      .describe("Enable SSURGO soil data overlay"),
    enableHydroOverlay: z
      .boolean()
      .optional()
      .default(false)
      .describe("Enable USGS hydrology overlay"),
  }),
  execute: async ({ context }) => {
    const {
      fieldIds,
      fieldNames,
      showAll,
      enableSoilOverlay,
      enableHydroOverlay,
    } = context;

    try {
      let fieldsToShow: string[] = [];

      if (showAll) {
        // Get all cached boundaries
        const allBoundaries = await db
          .select({ fieldId: cachedBoundaries.fieldId })
          .from(cachedBoundaries);
        fieldsToShow = allBoundaries.map((b) => b.fieldId);
      } else if (fieldIds?.length) {
        fieldsToShow = fieldIds;
      } else if (fieldNames?.length) {
        // Look up field IDs by name (partial match)
        const fields = await db
          .select({ fieldId: cachedFields.fieldId, name: cachedFields.name })
          .from(cachedFields);

        fieldsToShow = fields
          .filter((f) =>
            fieldNames.some((name) =>
              f.name.toLowerCase().includes(name.toLowerCase())
            )
          )
          .map((f) => f.fieldId);
      }

      if (fieldsToShow.length === 0) {
        return {
          success: false,
          error:
            "No fields found. Use get_field_boundaries first to cache field data.",
        };
      }

      // Fetch boundaries and field metadata
      const boundaries = await db
        .select()
        .from(cachedBoundaries)
        .where(inArray(cachedBoundaries.fieldId, fieldsToShow));

      const fields = await db
        .select()
        .from(cachedFields)
        .where(inArray(cachedFields.fieldId, fieldsToShow));

      // Create field lookup map
      const fieldMap = new Map(fields.map((f) => [f.fieldId, f]));

      // Build boundary data with metadata
      const boundaryData: FieldBoundaryData[] = boundaries
        .filter((b) => b.geometry)
        .map((b) => {
          const field = fieldMap.get(b.fieldId);
          return {
            fieldId: b.fieldId,
            fieldName: field?.name || b.fieldId,
            area: field?.area as { value: number; unit: string } | undefined,
            geometry: b.geometry as unknown as GeoJSONGeometry,
          };
        });

      if (boundaryData.length === 0) {
        return {
          success: false,
          error: "No boundary geometries found for the specified fields.",
        };
      }

      // Create GeoJSON and calculate bounds
      const geoJSON = createFeatureCollection(boundaryData);
      const boundingBox = calculateBoundingBox(
        boundaryData.map((b) => b.geometry)
      );
      const bounds = toLeafletBounds(boundingBox);

      // Calculate totals for summary
      const totalAcres = boundaryData.reduce(
        (sum, b) => sum + (b.area?.value || 0),
        0
      );

      const enabledOverlays: string[] = [];
      if (enableSoilOverlay) enabledOverlays.push("soil");
      if (enableHydroOverlay) enabledOverlays.push("hydrology");

      // Build minimal text summary for LLM context
      const fieldNamesList = boundaryData.length <= 3
        ? boundaryData.map((b) => b.fieldName).join(", ")
        : `${boundaryData.slice(0, 3).map((b) => b.fieldName).join(", ")} +${boundaryData.length - 3} more`;

      const agentSummary = `Displayed ${boundaryData.length} field(s) on map. ` +
        `Total: ${Math.round(totalAcres * 10) / 10} ac. ` +
        `Fields: ${fieldNamesList}.` +
        (enabledOverlays.length > 0 ? ` Overlays: ${enabledOverlays.join(", ")}.` : "");

      const result = {
        success: true,
        // UI data - full payload for map rendering
        uiData: {
          geoJSON,
          bounds,
          center: [
            (boundingBox.minLat + boundingBox.maxLat) / 2,
            (boundingBox.minLng + boundingBox.maxLng) / 2,
          ] as [number, number],
          overlays: {
            soil: enableSoilOverlay ?? false,
            hydro: enableHydroOverlay ?? false,
          },
        },
        // Minimal text summary for LLM context
        agentSummary,
      };

      // Log only the agentSummary size for accurate LLM context tracking
      logToolTokens("showFieldsOnMap", context, { success: true, agentSummary });
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to prepare map data: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// Export all map tools
export const mapTools = {
  showFieldsOnMap: showFieldsOnMapTool,
};
