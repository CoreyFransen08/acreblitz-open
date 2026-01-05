/**
 * Work Plan Service
 *
 * Unified work plan operations across providers.
 * Designed for MCP tool compatibility.
 *
 * This is a thin orchestration layer that delegates to provider-specific adapters.
 */

import type {
  ListWorkPlansParams,
  GetWorkPlanParams,
  PaginatedResult,
  UnifiedWorkPlan,
} from './types';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './types';
import { getWorkPlanAdapter } from '../providers/registry';

// ============================================================================
// LIST WORK PLANS
// ============================================================================

/**
 * List work plans from a provider with pagination and filtering.
 *
 * @description
 * Retrieves a paginated list of work plans from the connected provider.
 * Supports filtering by year, work type, work status, date range, and fields.
 *
 * @example
 * ```typescript
 * const result = await listWorkPlans({
 *   context: { provider: 'john_deere', client },
 *   organizationId: 'org-123',
 *   year: 2025,
 *   workType: 'seeding',
 *   workStatus: 'planned',
 *   pagination: { page: 1, pageSize: 25 },
 * });
 *
 * console.log(result.data); // UnifiedWorkPlan[]
 * console.log(result.pagination.hasNextPage);
 * ```
 */
export async function listWorkPlans(
  params: ListWorkPlansParams
): Promise<PaginatedResult<UnifiedWorkPlan>> {
  const {
    context,
    organizationId,
    year,
    workType,
    workStatus = 'all',
    startDate,
    endDate,
    fieldIds,
    pagination = {},
  } = params;

  // Normalize pagination
  const page = Math.max(1, pagination.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, pagination.pageSize ?? DEFAULT_PAGE_SIZE)
  );

  // Get the adapter for this provider and delegate
  const adapter = getWorkPlanAdapter(context.provider);

  return adapter.listWorkPlans(context.client, {
    organizationId,
    year,
    workType,
    workStatus,
    startDate,
    endDate,
    fieldIds,
    page,
    pageSize,
    mapperOptions: {},
  });
}

// ============================================================================
// GET WORK PLAN
// ============================================================================

/**
 * Get a single work plan by ID.
 *
 * @description
 * Retrieves detailed information about a specific work plan including
 * operations, inputs, prescriptions, assignments, and guidance settings.
 *
 * @example
 * ```typescript
 * const workPlan = await getWorkPlan({
 *   context: { provider: 'john_deere', client },
 *   organizationId: 'org-123',
 *   workPlanId: 'wp-456',
 * });
 *
 * console.log(workPlan.workType);    // 'seeding'
 * console.log(workPlan.workStatus);  // 'planned'
 * console.log(workPlan.operations);  // UnifiedWorkPlanOperation[]
 * ```
 */
export async function getWorkPlan(
  params: GetWorkPlanParams
): Promise<UnifiedWorkPlan> {
  const { context, organizationId, workPlanId } = params;

  // Get the adapter for this provider and delegate
  const adapter = getWorkPlanAdapter(context.provider);

  return adapter.getWorkPlan(context.client, {
    organizationId,
    workPlanId,
    mapperOptions: {},
  });
}
