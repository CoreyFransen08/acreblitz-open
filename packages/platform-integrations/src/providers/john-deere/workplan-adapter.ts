/**
 * John Deere Work Plan Adapter
 *
 * Implements WorkPlanAdapter interface for John Deere Operations Center API.
 */

import type {
  WorkPlanAdapter,
  ListWorkPlansAdapterOptions,
  GetWorkPlanAdapterOptions,
} from '../types';
import type {
  UnifiedWorkPlan,
  UnifiedWorkType,
  UnifiedWorkStatus,
  PaginatedResult,
} from '../../services/types';
import type {
  WorkPlan,
  ListWorkPlansOptions,
  WorkType,
  WorkStatus,
} from '../../types/john-deere';
import { mapJohnDeereWorkPlan } from '../../mappers/john-deere';

/**
 * John Deere client interface for work plans
 */
export interface JohnDeereWorkPlanClient {
  workPlans: {
    list: (orgId: string, options?: ListWorkPlansOptions) => Promise<WorkPlan[]>;
    get: (orgId: string, erid: string) => Promise<WorkPlan>;
  };
}

/**
 * Map unified work type to JD work type
 */
function mapToJdWorkType(workType: UnifiedWorkType): WorkType {
  const mapping: Record<UnifiedWorkType, WorkType> = {
    tillage: 'dtiTillage',
    seeding: 'dtiSeeding',
    application: 'dtiApplication',
    harvest: 'dtiHarvest',
  };
  return mapping[workType];
}

/**
 * Map unified work status to JD work status
 */
function mapToJdWorkStatus(
  workStatus: UnifiedWorkStatus | undefined
): WorkStatus | undefined {
  if (!workStatus) return undefined;
  const mapping: Record<UnifiedWorkStatus, WorkStatus> = {
    planned: 'PLANNED',
    in_progress: 'IN_PROGRESS',
    completed: 'COMPLETED',
  };
  return mapping[workStatus];
}

/**
 * John Deere Work Plan Adapter Implementation
 */
export class JohnDeereWorkPlanAdapter
  implements WorkPlanAdapter<JohnDeereWorkPlanClient>
{
  readonly providerType = 'john_deere' as const;

  async listWorkPlans(
    client: JohnDeereWorkPlanClient,
    options: ListWorkPlansAdapterOptions
  ): Promise<PaginatedResult<UnifiedWorkPlan>> {
    const {
      organizationId,
      year,
      workType,
      workStatus,
      startDate,
      endDate,
      fieldIds,
      page,
      pageSize,
      mapperOptions,
    } = options;

    // Build JD options
    const jdOptions: ListWorkPlansOptions = {
      year,
      workType: workType ? mapToJdWorkType(workType) : undefined,
      workStatus:
        workStatus === 'all' ? 'ALL' : mapToJdWorkStatus(workStatus as UnifiedWorkStatus),
      startDate,
      endDate,
      fieldIds,
    };

    // Fetch work plans from JD (client handles all pages)
    const jdWorkPlans = await client.workPlans.list(organizationId, jdOptions);

    // Calculate client-side pagination
    const totalItems = jdWorkPlans.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageWorkPlans = jdWorkPlans.slice(startIndex, endIndex);

    // Map to unified format
    const unifiedWorkPlans = pageWorkPlans.map((wp) =>
      mapJohnDeereWorkPlan(wp, {
        ...mapperOptions,
        context: {
          ...mapperOptions.context,
          organizationId,
        },
      })
    );

    return {
      data: unifiedWorkPlans,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        nextCursor:
          page < totalPages
            ? btoa(JSON.stringify({ page: page + 1 }))
            : undefined,
      },
    };
  }

  async getWorkPlan(
    client: JohnDeereWorkPlanClient,
    options: GetWorkPlanAdapterOptions
  ): Promise<UnifiedWorkPlan> {
    const { organizationId, workPlanId, mapperOptions } = options;

    // Fetch work plan from JD
    const jdWorkPlan = await client.workPlans.get(organizationId, workPlanId);

    // Map to unified format
    return mapJohnDeereWorkPlan(jdWorkPlan, {
      ...mapperOptions,
      context: {
        ...mapperOptions.context,
        organizationId,
      },
    });
  }
}

/**
 * Singleton instance for convenience
 */
export const johnDeereWorkPlanAdapter = new JohnDeereWorkPlanAdapter();
