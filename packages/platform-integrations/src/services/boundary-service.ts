/**
 * Boundary Service
 * 
 * Unified boundary operations across providers.
 * Designed for MCP tool compatibility.
 * 
 * This is a thin orchestration layer that delegates to provider-specific adapters.
 */

import type {
  ListBoundariesParams,
  GetBoundaryParams,
  PaginatedResult,
  UnifiedBoundary,
  MapperOptions,
} from './types';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_AREA_UNIT,
  DEFAULT_GEOMETRY_FORMAT,
} from './types';
import { getBoundaryAdapter } from '../providers/registry';

// ============================================================================
// LIST BOUNDARIES
// ============================================================================

/**
 * List boundaries from a provider with pagination and filtering.
 * 
 * @description
 * Retrieves a paginated list of boundaries from the connected provider.
 * Can list all boundaries for an organization or filter by field.
 * Includes geometry by default (boundaries without geometry are rarely useful).
 * 
 * @example
 * ```typescript
 * // List all boundaries for an organization
 * const result = await listBoundaries({
 *   context: { provider: 'john_deere', client },
 *   organizationId: 'org-123',
 *   pagination: { page: 1, pageSize: 25 },
 *   geometry: { geometryFormat: 'geojson' },
 *   units: { areaUnit: 'ac' },
 * });
 * 
 * // List boundaries for a specific field
 * const fieldBoundaries = await listBoundaries({
 *   context: { provider: 'john_deere', client },
 *   organizationId: 'org-123',
 *   fieldId: 'field-456',
 *   onlyActive: true,
 * });
 * ```
 */
export async function listBoundaries(
  params: ListBoundariesParams
): Promise<PaginatedResult<UnifiedBoundary>> {
  const {
    context,
    organizationId,
    fieldId,
    status = 'active',
    onlyActive = false,
    pagination = {},
    geometry = {},
    units = {},
  } = params;

  // Normalize pagination
  const page = Math.max(1, pagination.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination.pageSize ?? DEFAULT_PAGE_SIZE));
  
  // Build mapper options - include geometry by default for boundaries
  const mapperOptions: MapperOptions = {
    geometry: {
      includeGeometry: geometry.includeGeometry ?? true,
      geometryFormat: geometry.geometryFormat ?? DEFAULT_GEOMETRY_FORMAT,
      simplifyTolerance: geometry.simplifyTolerance,
    },
    units: {
      areaUnit: units.areaUnit ?? DEFAULT_AREA_UNIT,
    },
  };

  // Get the adapter for this provider and delegate
  const adapter = getBoundaryAdapter(context.provider);
  
  return adapter.listBoundaries(context.client, {
    organizationId,
    fieldId,
    status,
    onlyActive,
    page,
    pageSize,
    mapperOptions,
  });
}

// ============================================================================
// GET BOUNDARY
// ============================================================================

/**
 * Get a single boundary by ID.
 * 
 * @description
 * Retrieves detailed information about a specific boundary.
 * Includes geometry by default.
 * 
 * @example
 * ```typescript
 * const boundary = await getBoundary({
 *   context: { provider: 'john_deere', client },
 *   organizationId: 'org-123',
 *   boundaryId: 'boundary-789',
 *   geometry: { geometryFormat: 'wkt' },
 *   units: { areaUnit: 'ha' },
 * });
 * 
 * console.log(boundary.geometry); // WKT string
 * console.log(boundary.area); // { value: 32.5, unit: 'ha' }
 * ```
 */
export async function getBoundary(
  params: GetBoundaryParams
): Promise<UnifiedBoundary> {
  const {
    context,
    organizationId,
    boundaryId,
    geometry = {},
    units = {},
  } = params;

  // Build mapper options - include geometry by default for boundaries
  const mapperOptions: MapperOptions = {
    geometry: {
      includeGeometry: geometry.includeGeometry ?? true,
      geometryFormat: geometry.geometryFormat ?? DEFAULT_GEOMETRY_FORMAT,
      simplifyTolerance: geometry.simplifyTolerance,
    },
    units: {
      areaUnit: units.areaUnit ?? DEFAULT_AREA_UNIT,
    },
  };

  // Get the adapter for this provider and delegate
  const adapter = getBoundaryAdapter(context.provider);
  
  return adapter.getBoundary(context.client, {
    organizationId,
    boundaryId,
    mapperOptions,
  });
}
