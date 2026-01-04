/**
 * John Deere Boundary Adapter
 * 
 * Implements BoundaryAdapter interface for John Deere Operations Center API.
 */

import type {
  BoundaryAdapter,
  ListBoundariesAdapterOptions,
  GetBoundaryAdapterOptions,
} from '../types';
import type {
  UnifiedBoundary,
  PaginatedResult,
} from '../../services/types';
import type { Boundary, ListBoundariesOptions } from '../../types/john-deere';
import { mapJohnDeereBoundary } from '../../mappers/john-deere';

/**
 * John Deere client interface for boundaries
 */
export interface JohnDeereBoundaryClient {
  boundaries: {
    listForField: (orgId: string, fieldId: string, options?: ListBoundariesOptions) => Promise<Boundary[]>;
    listForOrg: (orgId: string, options?: ListBoundariesOptions) => Promise<Boundary[]>;
    get: (orgId: string, boundaryId: string) => Promise<Boundary>;
  };
}

/**
 * John Deere Boundary Adapter Implementation
 */
export class JohnDeereBoundaryAdapter implements BoundaryAdapter<JohnDeereBoundaryClient> {
  readonly providerType = 'john_deere' as const;

  async listBoundaries(
    client: JohnDeereBoundaryClient,
    options: ListBoundariesAdapterOptions
  ): Promise<PaginatedResult<UnifiedBoundary>> {
    const {
      organizationId,
      fieldId,
      status,
      onlyActive,
      page,
      pageSize,
      mapperOptions,
    } = options;

    // Map status to JD recordFilter
    const recordFilter = status === 'all' ? 'all' : status;

    // Build JD options
    const jdOptions: ListBoundariesOptions = {
      recordFilter,
      embed: mapperOptions.geometry?.includeGeometry ? 'multipolygons' : undefined,
    };

    // Fetch boundaries from JD
    let jdBoundaries: Boundary[];

    if (fieldId) {
      jdBoundaries = await client.boundaries.listForField(
        organizationId,
        fieldId,
        jdOptions
      );
    } else {
      jdBoundaries = await client.boundaries.listForOrg(organizationId, jdOptions);
    }

    // Filter to active only if requested
    let filteredBoundaries = jdBoundaries;
    if (onlyActive) {
      filteredBoundaries = jdBoundaries.filter(b => b.active === true);
    }

    // Calculate pagination
    const totalItems = filteredBoundaries.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageBoundaries = filteredBoundaries.slice(startIndex, endIndex);

    // Map to unified format
    const unifiedBoundaries = pageBoundaries.map(boundary =>
      mapJohnDeereBoundary(boundary, mapperOptions)
    );

    return {
      data: unifiedBoundaries,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        nextCursor: page < totalPages
          ? btoa(JSON.stringify({ page: page + 1 }))
          : undefined,
      },
    };
  }

  async getBoundary(
    client: JohnDeereBoundaryClient,
    options: GetBoundaryAdapterOptions
  ): Promise<UnifiedBoundary> {
    const {
      organizationId,
      boundaryId,
      mapperOptions,
    } = options;

    // Fetch boundary from JD
    const jdBoundary = await client.boundaries.get(organizationId, boundaryId);

    // If geometry is requested but not included, fetch from list with embed
    if (mapperOptions.geometry?.includeGeometry && !jdBoundary.multipolygons) {
      try {
        const allBoundaries = await client.boundaries.listForOrg(organizationId, {
          embed: 'multipolygons',
          recordFilter: 'all',
        });

        const foundBoundary = allBoundaries.find(b => b.id === boundaryId);
        if (foundBoundary) {
          return mapJohnDeereBoundary(foundBoundary, mapperOptions);
        }
      } catch {
        // Fall through to return boundary without geometry
      }
    }

    return mapJohnDeereBoundary(jdBoundary, mapperOptions);
  }
}

/**
 * Singleton instance for convenience
 */
export const johnDeereBoundaryAdapter = new JohnDeereBoundaryAdapter();

