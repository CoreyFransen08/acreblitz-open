/**
 * John Deere Field Adapter
 * 
 * Implements FieldAdapter interface for John Deere Operations Center API.
 */

import type {
  FieldAdapter,
  ListFieldsAdapterOptions,
  GetFieldAdapterOptions,
} from '../types';
import type {
  UnifiedField,
  PaginatedResult,
  MapperOptions,
} from '../../services/types';
import type { 
  Field, 
  Boundary, 
  ListBoundariesOptions,
  ListFieldsOptions,
} from '../../types/john-deere';
import {
  mapJohnDeereField,
  mapJohnDeereBoundary,
} from '../../mappers/john-deere';

/**
 * John Deere client interface (matches the actual JohnDeereClient)
 */
export interface JohnDeereFieldClient {
  fields: {
    list: (orgId: string, options?: ListFieldsOptions) => Promise<Field[]>;
    get: (orgId: string, fieldId: string) => Promise<Field>;
  };
  boundaries: {
    listForField: (orgId: string, fieldId: string, options?: ListBoundariesOptions) => Promise<Boundary[]>;
  };
}

/**
 * John Deere Field Adapter Implementation
 */
export class JohnDeereFieldAdapter implements FieldAdapter<JohnDeereFieldClient> {
  readonly providerType = 'john_deere' as const;

  async listFields(
    client: JohnDeereFieldClient,
    options: ListFieldsAdapterOptions
  ): Promise<PaginatedResult<UnifiedField>> {
    const {
      organizationId,
      farmId,
      status,
      search,
      page,
      pageSize,
      mapperOptions,
      includeGeometry,
    } = options;

    // Map status to JD recordFilter
    const recordFilter = status === 'all' ? 'all' : status;

    // Fetch fields from JD
    // Note: JD client currently fetches all pages - we paginate client-side
    // TODO: Optimize to use cursor-based pagination with JD API
    const jdFields = await client.fields.list(organizationId, { recordFilter });

    // Filter by farm if specified
    let filteredFields = jdFields;
    if (farmId) {
      filteredFields = jdFields.filter(field => {
        const farmLink = field.links?.find(l => l.rel === 'farms');
        return farmLink?.uri?.includes(farmId);
      });
    }

    // Filter by search term if specified
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFields = filteredFields.filter(field =>
        field.name.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const totalItems = filteredFields.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageFields = filteredFields.slice(startIndex, endIndex);

    // Map to unified format
    let unifiedFields = pageFields.map(field => mapJohnDeereField(field, mapperOptions));

    // Add organization ID to all fields
    unifiedFields = unifiedFields.map(field => ({
      ...field,
      organizationId,
    }));

    // Fetch boundaries if geometry requested
    if (includeGeometry) {
      unifiedFields = await this.attachBoundaries(
        client,
        organizationId,
        unifiedFields,
        mapperOptions
      );
    }

    return {
      data: unifiedFields,
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

  async getField(
    client: JohnDeereFieldClient,
    options: GetFieldAdapterOptions
  ): Promise<UnifiedField> {
    const {
      organizationId,
      fieldId,
      mapperOptions,
      includeGeometry,
    } = options;

    // Fetch field from JD
    const jdField = await client.fields.get(organizationId, fieldId);

    // Map to unified format
    let unifiedField = mapJohnDeereField(jdField, mapperOptions);
    unifiedField.organizationId = organizationId;

    // Fetch boundary if geometry requested
    if (includeGeometry) {
      unifiedField = await this.attachBoundary(
        client,
        organizationId,
        unifiedField,
        mapperOptions
      );
    }

    return unifiedField;
  }

  /**
   * Attach boundaries to multiple fields
   */
  private async attachBoundaries(
    client: JohnDeereFieldClient,
    organizationId: string,
    fields: UnifiedField[],
    mapperOptions: MapperOptions
  ): Promise<UnifiedField[]> {
    const boundaryMapperOptions: MapperOptions = {
      ...mapperOptions,
      geometry: {
        ...mapperOptions.geometry,
        includeGeometry: true,
      },
    };

    return Promise.all(
      fields.map(field => this.attachBoundary(client, organizationId, field, boundaryMapperOptions))
    );
  }

  /**
   * Attach active boundary to a single field
   */
  private async attachBoundary(
    client: JohnDeereFieldClient,
    organizationId: string,
    field: UnifiedField,
    mapperOptions: MapperOptions
  ): Promise<UnifiedField> {
    const boundaryMapperOptions: MapperOptions = {
      ...mapperOptions,
      geometry: {
        ...mapperOptions.geometry,
        includeGeometry: true,
      },
    };

    try {
      const boundaries = await client.boundaries.listForField(
        organizationId,
        field.providerId,
        { embed: 'multipolygons', recordFilter: 'active' }
      );

      const activeBoundary = boundaries.find(b => b.active);
      if (activeBoundary) {
        const mappedBoundary = mapJohnDeereBoundary(
          activeBoundary,
          boundaryMapperOptions
        );
        return {
          ...field,
          boundary: mappedBoundary,
          area: field.area ?? mappedBoundary.area,
        };
      }
    } catch {
      // If boundary fetch fails, continue without geometry
    }

    return field;
  }
}

/**
 * Singleton instance for convenience
 */
export const johnDeereFieldAdapter = new JohnDeereFieldAdapter();

