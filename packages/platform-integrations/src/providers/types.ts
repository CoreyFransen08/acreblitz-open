/**
 * Provider Adapter Interfaces
 * 
 * Each provider implements these interfaces to provide unified field/boundary operations.
 * This allows the service layer to remain provider-agnostic.
 */

import type {
  UnifiedField,
  UnifiedBoundary,
  UnifiedWorkPlan,
  UnifiedWorkType,
  UnifiedWorkStatus,
  PaginatedResult,
  MapperOptions,
  Provider,
} from '../services/types';

// ============================================================================
// PROVIDER TYPES
// ============================================================================

/**
 * Supported provider identifiers
 * Re-exported from services/types.ts for convenience
 */
export type ProviderType = Provider;

/**
 * Provider client - the authenticated API client for a specific provider
 * Each provider will have its own client type
 */
export interface ProviderClient {
  // Marker interface - actual client methods vary by provider
}

// ============================================================================
// FIELD ADAPTER INTERFACE
// ============================================================================

/**
 * Options for listing fields from a provider
 */
export interface ListFieldsAdapterOptions {
  organizationId: string;
  farmId?: string;
  status?: 'active' | 'archived' | 'all';
  search?: string;
  page: number;
  pageSize: number;
  mapperOptions: MapperOptions;
  includeGeometry: boolean;
}

/**
 * Options for getting a single field from a provider
 */
export interface GetFieldAdapterOptions {
  organizationId: string;
  fieldId: string;
  mapperOptions: MapperOptions;
  includeGeometry: boolean;
}

/**
 * Field adapter interface - implemented by each provider
 */
export interface FieldAdapter<TClient = ProviderClient> {
  /**
   * The provider type this adapter handles
   */
  readonly providerType: ProviderType;

  /**
   * List fields from the provider
   */
  listFields(
    client: TClient,
    options: ListFieldsAdapterOptions
  ): Promise<PaginatedResult<UnifiedField>>;

  /**
   * Get a single field by ID
   */
  getField(
    client: TClient,
    options: GetFieldAdapterOptions
  ): Promise<UnifiedField>;
}

// ============================================================================
// BOUNDARY ADAPTER INTERFACE
// ============================================================================

/**
 * Options for listing boundaries from a provider
 */
export interface ListBoundariesAdapterOptions {
  organizationId: string;
  fieldId?: string;
  status?: 'active' | 'archived' | 'all';
  onlyActive?: boolean;
  page: number;
  pageSize: number;
  mapperOptions: MapperOptions;
}

/**
 * Options for getting a single boundary from a provider
 */
export interface GetBoundaryAdapterOptions {
  organizationId: string;
  boundaryId: string;
  mapperOptions: MapperOptions;
}

/**
 * Boundary adapter interface - implemented by each provider
 */
export interface BoundaryAdapter<TClient = ProviderClient> {
  /**
   * The provider type this adapter handles
   */
  readonly providerType: ProviderType;

  /**
   * List boundaries from the provider
   */
  listBoundaries(
    client: TClient,
    options: ListBoundariesAdapterOptions
  ): Promise<PaginatedResult<UnifiedBoundary>>;

  /**
   * Get a single boundary by ID
   */
  getBoundary(
    client: TClient,
    options: GetBoundaryAdapterOptions
  ): Promise<UnifiedBoundary>;
}

// ============================================================================
// WORK PLAN ADAPTER INTERFACE
// ============================================================================

/**
 * Options for listing work plans from a provider
 */
export interface ListWorkPlansAdapterOptions {
  organizationId: string;
  year?: number;
  workType?: UnifiedWorkType;
  workStatus?: UnifiedWorkStatus | 'all';
  startDate?: string;
  endDate?: string;
  fieldIds?: string[];
  page: number;
  pageSize: number;
  mapperOptions: MapperOptions;
}

/**
 * Options for getting a single work plan from a provider
 */
export interface GetWorkPlanAdapterOptions {
  organizationId: string;
  workPlanId: string;
  mapperOptions: MapperOptions;
}

/**
 * Work plan adapter interface - implemented by each provider
 */
export interface WorkPlanAdapter<TClient = ProviderClient> {
  /**
   * The provider type this adapter handles
   */
  readonly providerType: ProviderType;

  /**
   * List work plans from the provider
   */
  listWorkPlans(
    client: TClient,
    options: ListWorkPlansAdapterOptions
  ): Promise<PaginatedResult<UnifiedWorkPlan>>;

  /**
   * Get a single work plan by ID
   */
  getWorkPlan(
    client: TClient,
    options: GetWorkPlanAdapterOptions
  ): Promise<UnifiedWorkPlan>;
}

// ============================================================================
// COMBINED PROVIDER ADAPTER
// ============================================================================

/**
 * Complete provider adapter combining all resource adapters
 * Providers can implement this interface for full functionality
 */
export interface ProviderAdapter<TClient = ProviderClient> {
  readonly providerType: ProviderType;
  readonly fields: FieldAdapter<TClient>;
  readonly boundaries: BoundaryAdapter<TClient>;
  readonly workPlans?: WorkPlanAdapter<TClient>;
}

