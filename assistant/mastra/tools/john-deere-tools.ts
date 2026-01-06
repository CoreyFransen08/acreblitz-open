import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  listFields,
  listBoundaries,
  listWorkPlans,
  getWorkPlan,
} from "@acreblitz/platform-integrations";
import { getJohnDeereClient } from "../utils/client-factory";
import { TokenManager } from "../utils/token-manager";
import { db } from "@/db/client";
import {
  cachedOrganizations,
  cachedFields,
  cachedBoundaries,
  cachedWorkPlans,
} from "@/db/schema/john-deere-cache";
import { eq } from "drizzle-orm";
import { logToolTokens } from "../utils/token-logger";

/**
 * Tool: Check Connection Status
 */
export const checkConnectionTool = createTool({
  id: "check_connection",
  description:
    "Check if the user has connected their John Deere account. Always call this first before using other John Deere tools.",
  inputSchema: z.object({}),
  execute: async () => {
    const connection = await TokenManager.getConnection();
    if (!connection) {
      return {
        connected: false,
        message:
          "No John Deere account connected. Please click the 'Connect John Deere' button to connect your account.",
      };
    }

    return {
      connected: true,
      organizationIds: connection.organizationIds || [],
      message: `Connected to John Deere with ${connection.organizationIds?.length || 0} organization(s).`,
    };
  },
});

/**
 * Tool: List Organizations
 */
export const listOrganizationsTool = createTool({
  id: "list_organizations",
  description:
    "List all John Deere organizations connected to this account. Returns organization IDs and names.",
  inputSchema: z.object({}),
  execute: async () => {
    const connection = await TokenManager.getConnection();
    if (!connection || !connection.organizationIds) {
      return {
        success: false,
        error:
          "No organizations connected. Please reconnect your John Deere account.",
        organizations: [],
      };
    }

    // Return cached organization data
    const orgs = await db.select().from(cachedOrganizations);

    // Filter to only connected orgs
    const connectedOrgs = orgs.filter((org) =>
      connection.organizationIds?.includes(org.organizationId)
    );

    return {
      success: true,
      organizations: connectedOrgs.map((org) => ({
        id: org.organizationId,
        name: org.name,
        type: org.type,
      })),
    };
  },
});

/**
 * Tool: List Fields
 */
export const listFieldsTool = createTool({
  id: "list_fields",
  description:
    "List all fields for a given organization. Returns field IDs, names, and areas.",
  inputSchema: z.object({
    organizationId: z.string().describe("The John Deere organization ID"),
  }),
  execute: async ({ context }) => {
    const { organizationId } = context;
    try {
      const client = await getJohnDeereClient();

      const result = await listFields({
        context: {
          provider: "john_deere",
          client,
        },
        organizationId,
        geometry: {
          includeGeometry: false,
        },
        units: {
          areaUnit: "ac",
        },
      });

      // Cache the results
      for (const field of result.data) {
        const existing = await db
          .select()
          .from(cachedFields)
          .where(eq(cachedFields.fieldId, field.id))
          .limit(1);

        const fieldData = {
          fieldId: field.id,
          organizationId,
          name: field.name,
          area: field.area || null,
          rawData: field as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        };

        if (existing.length > 0) {
          await db
            .update(cachedFields)
            .set(fieldData)
            .where(eq(cachedFields.id, existing[0].id));
        } else {
          await db.insert(cachedFields).values(fieldData);
        }
      }

      return {
        success: true,
        fields: result.data.map((f) => ({
          id: f.id,
          name: f.name,
          area: f.area,
        })),
        totalCount: result.pagination.totalItems,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list fields",
        fields: [],
      };
    }
  },
});

/**
 * Tool: Get Field Boundaries
 */
export const getFieldBoundariesTool = createTool({
  id: "get_field_boundaries",
  description:
    "Get the GeoJSON boundaries for fields in an organization. Returns boundary geometry for mapping.",
  inputSchema: z.object({
    organizationId: z.string().describe("The John Deere organization ID"),
    fieldId: z
      .string()
      .optional()
      .describe("Optional specific field ID to get boundary for"),
  }),
  execute: async ({ context }) => {
    const { organizationId, fieldId } = context;
    try {
      const client = await getJohnDeereClient();

      const result = await listBoundaries({
        context: {
          provider: "john_deere",
          client,
        },
        organizationId,
        fieldId,
        geometry: {
          includeGeometry: true,
          geometryFormat: "geojson",
        },
        units: {
          areaUnit: "ac",
        },
      });

      // Cache the results
      for (const boundary of result.data) {
        if (!boundary.geometry) continue;

        const existing = await db
          .select()
          .from(cachedBoundaries)
          .where(eq(cachedBoundaries.boundaryId, boundary.id))
          .limit(1);

        const boundaryData = {
          boundaryId: boundary.id,
          fieldId: boundary.fieldId || "",
          geometry: boundary.geometry as unknown as Record<string, unknown>,
          rawData: boundary as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        };

        if (existing.length > 0) {
          await db
            .update(cachedBoundaries)
            .set(boundaryData)
            .where(eq(cachedBoundaries.id, existing[0].id));
        } else {
          await db.insert(cachedBoundaries).values(boundaryData);
        }
      }

      const toolResult = {
        success: true,
        boundaries: result.data.map((b) => ({
          id: b.id,
          fieldId: b.fieldId,
          fieldName: b.fieldName,
          area: b.area,
          geometry: b.geometry,
        })),
      };

      logToolTokens("get_field_boundaries", context, toolResult);
      return toolResult;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get boundaries",
        boundaries: [],
      };
    }
  },
});

/**
 * Tool: List Work Plans
 */
export const listWorkPlansTool = createTool({
  id: "list_work_plans",
  description:
    "List work plans for an organization. Work plans contain field operations like planting, harvesting, tillage, and applications.",
  inputSchema: z.object({
    organizationId: z.string().describe("The John Deere organization ID"),
    year: z.number().describe("Filter by calendar year (e.g., 2026). Always provide the current year."),
  }),
  execute: async ({ context }) => {
    const { organizationId, year } = context;

    try {
      const client = await getJohnDeereClient();

      // Fetch all work plans for the year (no type/status filters)
      const result = await listWorkPlans({
        context: {
          provider: "john_deere",
          client,
        },
        organizationId,
        year,
      });

      // Cache work plans
      for (const wp of result.data) {
        const existing = await db
          .select()
          .from(cachedWorkPlans)
          .where(eq(cachedWorkPlans.workPlanId, wp.id))
          .limit(1);

        const wpData = {
          workPlanId: wp.id,
          organizationId,
          name: wp.workOrder || null,
          workType: wp.workType,
          workStatus: wp.workStatus,
          year: wp.year?.toString() || null,
          rawData: wp as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        };

        if (existing.length > 0) {
          await db
            .update(cachedWorkPlans)
            .set(wpData)
            .where(eq(cachedWorkPlans.id, existing[0].id));
        } else {
          await db.insert(cachedWorkPlans).values(wpData);
        }
      }

      // Limit work plans to first 10 and truncate instructions for token efficiency
      const limitedWorkPlans = result.data.slice(0, 10).map((wp) => ({
        id: wp.id,
        workOrder: wp.workOrder,
        workType: wp.workType,
        workStatus: wp.workStatus,
        year: wp.year,
        fieldId: wp.fieldId,
        instructions: wp.instructions ? wp.instructions.slice(0, 100) + (wp.instructions.length > 100 ? "..." : "") : null,
      }));

      const toolResult = {
        success: true,
        workPlans: limitedWorkPlans,
        totalCount: result.pagination.totalItems,
        showing: Math.min(10, result.data.length),
      };

      logToolTokens("list_work_plans", context, toolResult);
      return toolResult;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list work plans",
        workPlans: [],
      };
    }
  },
});

/**
 * Tool: Get Work Plan Details
 */
export const getWorkPlanTool = createTool({
  id: "get_work_plan",
  description:
    "Get detailed information about a specific work plan including operations, inputs, and prescriptions.",
  inputSchema: z.object({
    organizationId: z.string().describe("The John Deere organization ID"),
    workPlanId: z.string().describe("The work plan ID"),
  }),
  execute: async ({ context }) => {
    const { organizationId, workPlanId } = context;
    try {
      const client = await getJohnDeereClient();

      const workPlan = await getWorkPlan({
        context: {
          provider: "john_deere",
          client,
        },
        organizationId,
        workPlanId,
      });

      // Cache the work plan
      const existing = await db
        .select()
        .from(cachedWorkPlans)
        .where(eq(cachedWorkPlans.workPlanId, workPlanId))
        .limit(1);

      const wpData = {
        workPlanId,
        organizationId,
        name: workPlan.workOrder || null,
        workType: workPlan.workType,
        workStatus: workPlan.workStatus,
        year: workPlan.year?.toString() || null,
        rawData: workPlan as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(cachedWorkPlans)
          .set(wpData)
          .where(eq(cachedWorkPlans.id, existing[0].id));
      } else {
        await db.insert(cachedWorkPlans).values(wpData);
      }

      // Limit operations and assignments for token efficiency
      const toolResult = {
        success: true,
        workPlan: {
          id: workPlan.id,
          workOrder: workPlan.workOrder,
          workType: workPlan.workType,
          workStatus: workPlan.workStatus,
          year: workPlan.year,
          fieldId: workPlan.fieldId,
          instructions: workPlan.instructions,
          operations: workPlan.operations?.slice(0, 5),
          operationsCount: workPlan.operations?.length ?? 0,
          assignments: workPlan.assignments?.slice(0, 5),
          assignmentsCount: workPlan.assignments?.length ?? 0,
        },
      };

      logToolTokens("get_work_plan", context, toolResult);
      return toolResult;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get work plan",
        workPlan: null,
      };
    }
  },
});

// Export all tools
export const johnDeereTools = {
  checkConnection: checkConnectionTool,
  listOrganizations: listOrganizationsTool,
  listFields: listFieldsTool,
  getFieldBoundaries: getFieldBoundariesTool,
  listWorkPlans: listWorkPlansTool,
  getWorkPlan: getWorkPlanTool,
};
