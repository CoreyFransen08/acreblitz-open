# Adding a New Provider

This guide walks through adding support for a new agricultural data provider (e.g., Climate FieldView, Granular, CNHi).

## Overview

Adding a new provider involves:

1. Creating adapter implementations
2. Creating mappers to transform provider data to unified types
3. Registering adapters with the registry
4. (Optional) Creating OAuth/client helpers

## Step-by-Step Guide

### Step 1: Create Provider Directory

```
src/providers/climate-fieldview/
├── field-adapter.ts      # FieldAdapter implementation
├── boundary-adapter.ts   # BoundaryAdapter implementation
└── index.ts              # Exports
```

### Step 2: Define Client Interface

Define the interface your adapters expect from the authenticated client:

```typescript
// src/providers/climate-fieldview/types.ts (optional, can be in adapter files)

export interface CFVFieldClient {
  getFields(options?: { filter?: string }): Promise<CFVField[]>;
  getField(fieldId: string): Promise<CFVField>;
}

export interface CFVBoundaryClient {
  getBoundaries(fieldId?: string): Promise<CFVBoundary[]>;
  getBoundary(boundaryId: string): Promise<CFVBoundary>;
}

// Provider-specific types
interface CFVField {
  guid: string;
  name: string;
  acres: number;
  farm_guid: string;
  // ... other CFV-specific fields
}

interface CFVBoundary {
  guid: string;
  field_guid: string;
  geojson: GeoJSON.Feature;
  // ... other CFV-specific fields
}
```

### Step 3: Create Mappers

Create functions to transform provider data to unified types:

```typescript
// src/mappers/climate-fieldview.ts

import type { UnifiedField, UnifiedBoundary, MapperOptions } from '../services/types';

interface CFVField {
  guid: string;
  name: string;
  acres: number;
  farm_guid: string;
  farm_name?: string;
  is_archived: boolean;
}

export function mapCFVField(cfvField: CFVField, options?: MapperOptions): UnifiedField {
  const targetUnit = options?.units?.areaUnit ?? 'ac';
  
  return {
    id: cfvField.guid,
    providerId: cfvField.guid,
    provider: 'climate_fieldview',
    name: cfvField.name,
    farmId: cfvField.farm_guid,
    farmName: cfvField.farm_name,
    area: {
      value: convertArea(cfvField.acres, 'ac', targetUnit),
      unit: targetUnit,
    },
    status: cfvField.is_archived ? 'archived' : 'active',
    boundary: undefined,  // Set separately if geometry requested
  };
}

export function mapCFVBoundary(cfvBoundary: CFVBoundary, options?: MapperOptions): UnifiedBoundary {
  // Transform CFV boundary to unified format
  // ...
}
```

### Step 4: Implement Field Adapter

```typescript
// src/providers/climate-fieldview/field-adapter.ts

import type { FieldAdapter, ListFieldsAdapterOptions, GetFieldAdapterOptions } from '../types';
import type { UnifiedField, PaginatedResult, MapperOptions } from '../../services/types';
import { mapCFVField, mapCFVBoundary } from '../../mappers/climate-fieldview';

export interface CFVFieldClient {
  getFields(options?: { filter?: string }): Promise<CFVField[]>;
  getField(fieldId: string): Promise<CFVField>;
  getBoundaries(fieldId: string): Promise<CFVBoundary[]>;
}

export class ClimateFieldViewFieldAdapter implements FieldAdapter<CFVFieldClient> {
  readonly providerType = 'climate_fieldview' as const;

  async listFields(
    client: CFVFieldClient,
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

    // Fetch fields from CFV API
    const cfvFields = await client.getFields({
      filter: status === 'archived' ? 'archived' : 'active',
    });

    // Apply filters
    let filteredFields = cfvFields;
    
    if (farmId) {
      filteredFields = cfvFields.filter(f => f.farm_guid === farmId);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFields = filteredFields.filter(f => 
        f.name.toLowerCase().includes(searchLower)
      );
    }

    // Paginate
    const totalItems = filteredFields.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const pageFields = filteredFields.slice(startIndex, startIndex + pageSize);

    // Map to unified format
    let unifiedFields = pageFields.map(f => mapCFVField(f, mapperOptions));

    // Add organization ID
    unifiedFields = unifiedFields.map(f => ({
      ...f,
      organizationId,
    }));

    // Optionally attach boundaries
    if (includeGeometry) {
      unifiedFields = await this.attachBoundaries(client, unifiedFields, mapperOptions);
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
    client: CFVFieldClient,
    options: GetFieldAdapterOptions
  ): Promise<UnifiedField> {
    const { organizationId, fieldId, mapperOptions, includeGeometry } = options;

    const cfvField = await client.getField(fieldId);
    let unifiedField = mapCFVField(cfvField, mapperOptions);
    unifiedField.organizationId = organizationId;

    if (includeGeometry) {
      const boundaries = await client.getBoundaries(fieldId);
      const activeBoundary = boundaries.find(b => b.is_active);
      if (activeBoundary) {
        unifiedField.boundary = mapCFVBoundary(activeBoundary, {
          ...mapperOptions,
          geometry: { ...mapperOptions.geometry, includeGeometry: true },
        });
      }
    }

    return unifiedField;
  }

  private async attachBoundaries(
    client: CFVFieldClient,
    fields: UnifiedField[],
    mapperOptions: MapperOptions
  ): Promise<UnifiedField[]> {
    // Implement boundary attachment logic
    // ...
  }
}

export const cfvFieldAdapter = new ClimateFieldViewFieldAdapter();
```

### Step 5: Implement Boundary Adapter

```typescript
// src/providers/climate-fieldview/boundary-adapter.ts

import type { BoundaryAdapter, ListBoundariesAdapterOptions, GetBoundaryAdapterOptions } from '../types';
import type { UnifiedBoundary, PaginatedResult } from '../../services/types';
import { mapCFVBoundary } from '../../mappers/climate-fieldview';

export interface CFVBoundaryClient {
  getBoundaries(fieldId?: string): Promise<CFVBoundary[]>;
  getBoundary(boundaryId: string): Promise<CFVBoundary>;
}

export class ClimateFieldViewBoundaryAdapter implements BoundaryAdapter<CFVBoundaryClient> {
  readonly providerType = 'climate_fieldview' as const;

  async listBoundaries(
    client: CFVBoundaryClient,
    options: ListBoundariesAdapterOptions
  ): Promise<PaginatedResult<UnifiedBoundary>> {
    // Implementation similar to field adapter
    // ...
  }

  async getBoundary(
    client: CFVBoundaryClient,
    options: GetBoundaryAdapterOptions
  ): Promise<UnifiedBoundary> {
    // Implementation
    // ...
  }
}

export const cfvBoundaryAdapter = new ClimateFieldViewBoundaryAdapter();
```

### Step 6: Create Provider Index

```typescript
// src/providers/climate-fieldview/index.ts

export { ClimateFieldViewFieldAdapter, cfvFieldAdapter } from './field-adapter';
export type { CFVFieldClient } from './field-adapter';

export { ClimateFieldViewBoundaryAdapter, cfvBoundaryAdapter } from './boundary-adapter';
export type { CFVBoundaryClient } from './boundary-adapter';
```

### Step 7: Register with Registry

```typescript
// src/providers/registry.ts

import { cfvFieldAdapter } from './climate-fieldview/field-adapter';
import { cfvBoundaryAdapter } from './climate-fieldview/boundary-adapter';

// In the field adapters map initialization:
fieldAdapters.set('john_deere', johnDeereFieldAdapter);
fieldAdapters.set('climate_fieldview', cfvFieldAdapter);  // Add this

// In the boundary adapters map initialization:
boundaryAdapters.set('john_deere', johnDeereBoundaryAdapter);
boundaryAdapters.set('climate_fieldview', cfvBoundaryAdapter);  // Add this
```

### Step 8: Update Provider Type (if needed)

If the provider isn't already in the `Provider` type:

```typescript
// src/services/types.ts

export type Provider = 
  | 'john_deere' 
  | 'climate_fieldview'  // Already exists
  | 'cnhi' 
  | 'trimble' 
  | 'raven' 
  | 'ag_leader'
  | 'new_provider';  // Add new provider here
```

### Step 9: Export from Package

```typescript
// src/providers/index.ts

// Add exports
export {
  ClimateFieldViewFieldAdapter,
  cfvFieldAdapter,
  ClimateFieldViewBoundaryAdapter,
  cfvBoundaryAdapter,
} from './climate-fieldview';
export type {
  CFVFieldClient,
  CFVBoundaryClient,
} from './climate-fieldview';

// src/index.ts - add to main exports if needed
```

### Step 10: Add Documentation

Create documentation for the new provider:

```
docs/
├── guides/
│   └── climate-fieldview-setup.md  # OAuth & setup guide
└── api/
    └── climate-fieldview-client.md  # API reference
```

## Testing Your Provider

### Unit Tests

```typescript
// src/providers/climate-fieldview/__tests__/field-adapter.test.ts

import { describe, it, expect, vi } from 'vitest';
import { cfvFieldAdapter } from '../field-adapter';

describe('ClimateFieldViewFieldAdapter', () => {
  it('should list fields', async () => {
    const mockClient = {
      getFields: vi.fn().mockResolvedValue([
        { guid: '1', name: 'North Field', acres: 100, farm_guid: 'farm-1', is_archived: false },
      ]),
      getBoundaries: vi.fn().mockResolvedValue([]),
    };

    const result = await cfvFieldAdapter.listFields(mockClient, {
      organizationId: 'org-1',
      page: 1,
      pageSize: 50,
      mapperOptions: {},
      includeGeometry: false,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].provider).toBe('climate_fieldview');
    expect(result.data[0].name).toBe('North Field');
  });
});
```

### Integration Testing

Use the registry to test:

```typescript
import { getFieldAdapter, registerFieldAdapter } from '@acreblitz/platform-integrations';

// Test that adapter is registered
const adapter = getFieldAdapter('climate_fieldview');
expect(adapter.providerType).toBe('climate_fieldview');
```

## Best Practices

1. **Keep adapters thin** - Complex logic should be in mappers
2. **Handle provider quirks** - Normalize data in mappers
3. **Error handling** - Catch provider-specific errors, throw unified errors
4. **Pagination** - Handle different pagination styles (cursor vs offset)
5. **Type safety** - Define proper interfaces for provider clients
6. **Documentation** - Document provider-specific setup requirements

## Checklist

- [ ] Provider directory created
- [ ] Client interface defined
- [ ] Mappers created
- [ ] FieldAdapter implemented
- [ ] BoundaryAdapter implemented
- [ ] Adapters registered
- [ ] Provider type added (if new)
- [ ] Exports updated
- [ ] Unit tests written
- [ ] Documentation added
- [ ] Build passes

