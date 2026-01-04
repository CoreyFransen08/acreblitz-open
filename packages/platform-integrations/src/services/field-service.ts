/**
 * Field Service
 * 
 * Unified field operations across providers.
 * Designed for MCP tool compatibility.
 * 
 * This is a thin orchestration layer that delegates to provider-specific adapters.
 */

import type {
  ListFieldsParams,
  GetFieldParams,
  PaginatedResult,
  UnifiedField,
  MapperOptions,
} from './types';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_AREA_UNIT,
} from './types';
import { getFieldAdapter } from '../providers/registry';

// ============================================================================
// LIST FIELDS
// ============================================================================

/**
 * List fields from a provider with pagination and filtering.
 * 
 * @description
 * Retrieves a paginated list of fields from the connected provider.
 * Supports filtering by farm, status, and name search.
 * Optionally includes active boundary geometry.
 * 
 * @example
 * ```typescript
 * const result = await listFields({
 *   context: { provider: 'john_deere', client },
 *   organizationId: 'org-123',
 *   pagination: { page: 1, pageSize: 25 },
 *   geometry: { includeGeometry: true },
 *   units: { areaUnit: 'ac' },
 * });
 * 
 * console.log(result.data); // UnifiedField[]
 * console.log(result.pagination.hasNextPage);
 * ```
 */
export async function listFields(
  params: ListFieldsParams
): Promise<PaginatedResult<UnifiedField>> {
  const {
    context,
    organizationId,
    farmId,
    status = 'active',
    search,
    pagination = {},
    geometry = {},
    units = {},
  } = params;

  // Normalize pagination
  const page = Math.max(1, pagination.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination.pageSize ?? DEFAULT_PAGE_SIZE));
  
  // Build mapper options
  const mapperOptions: MapperOptions = {
    geometry: {
      includeGeometry: false,
      ...geometry,
    },
    units: {
      areaUnit: units.areaUnit ?? DEFAULT_AREA_UNIT,
    },
  };

  // Get the adapter for this provider and delegate
  const adapter = getFieldAdapter(context.provider);
  
  return adapter.listFields(context.client, {
    organizationId,
    farmId,
    status,
    search,
    page,
    pageSize,
    mapperOptions,
    includeGeometry: geometry.includeGeometry ?? false,
  });
}

// ============================================================================
// GET FIELD
// ============================================================================

/**
 * Get a single field by ID.
 * 
 * @description
 * Retrieves detailed information about a specific field.
 * Optionally includes active boundary geometry.
 * 
 * @example
 * ```typescript
 * const field = await getField({
 *   context: { provider: 'john_deere', client },
 *   organizationId: 'org-123',
 *   fieldId: 'field-456',
 *   geometry: { includeGeometry: true, geometryFormat: 'geojson' },
 *   units: { areaUnit: 'ha' },
 * });
 * ```
 */
export async function getField(
  params: GetFieldParams
): Promise<UnifiedField> {
  const {
    context,
    organizationId,
    fieldId,
    geometry = {},
    units = {},
  } = params;

  // Build mapper options
  const mapperOptions: MapperOptions = {
    geometry: {
      includeGeometry: false,
      ...geometry,
    },
    units: {
      areaUnit: units.areaUnit ?? DEFAULT_AREA_UNIT,
    },
  };

  // Get the adapter for this provider and delegate
  const adapter = getFieldAdapter(context.provider);
  
  return adapter.getField(context.client, {
    organizationId,
    fieldId,
    mapperOptions,
    includeGeometry: geometry.includeGeometry ?? false,
  });
}
