# Unified Services API Reference

The unified services provide provider-agnostic functions for working with agricultural field data. These functions work identically across all supported providers.

## Overview

| Function | Description |
|----------|-------------|
| `listFields()` | List fields with pagination, filtering, and optional geometry |
| `getField()` | Get a single field by ID |
| `listBoundaries()` | List boundaries with pagination and filtering |
| `getBoundary()` | Get a single boundary by ID |

## Import

```typescript
import {
  listFields,
  getField,
  listBoundaries,
  getBoundary,
  
  // Types
  type ListFieldsParams,
  type GetFieldParams,
  type ListBoundariesParams,
  type GetBoundaryParams,
  type PaginatedResult,
  type UnifiedField,
  type UnifiedBoundary,
} from '@acreblitz/platform-integrations';
```

---

## listFields()

List fields from a provider with pagination and filtering.

### Signature

```typescript
async function listFields(params: ListFieldsParams): Promise<PaginatedResult<UnifiedField>>
```

### Parameters

```typescript
interface ListFieldsParams {
  /** Provider context with authenticated client */
  context: ProviderContext;
  
  /** Organization/account ID */
  organizationId: string;
  
  /** Filter by farm ID (optional) */
  farmId?: string;
  
  /** Filter by status: 'active' | 'archived' | 'all' (default: 'active') */
  status?: 'active' | 'archived' | 'all';
  
  /** Search fields by name (optional) */
  search?: string;
  
  /** Pagination options */
  pagination?: {
    page?: number;      // 1-indexed (default: 1)
    pageSize?: number;  // 1-100 (default: 50)
    cursor?: string;    // For cursor-based pagination
  };
  
  /** Geometry options */
  geometry?: {
    includeGeometry?: boolean;  // Attach boundaries (default: false)
    geometryFormat?: 'geojson' | 'wkt' | 'coordinates';
    simplifyTolerance?: number;  // Simplify geometry in meters
  };
  
  /** Unit options */
  units?: {
    areaUnit?: 'ha' | 'ac' | 'sqm' | 'sqft';  // default: 'ha'
  };
}
```

### Returns

```typescript
interface PaginatedResult<UnifiedField> {
  data: UnifiedField[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems?: number;
    totalPages?: number;
    hasNextPage: boolean;
    nextCursor?: string;
  };
}
```

### Example

```typescript
import { createJohnDeereClient, listFields } from '@acreblitz/platform-integrations';

const client = await createJohnDeereClient({ /* ... */ });

const result = await listFields({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  status: 'active',
  search: 'north',
  pagination: { page: 1, pageSize: 25 },
  geometry: { includeGeometry: true, geometryFormat: 'geojson' },
  units: { areaUnit: 'ac' },
});

console.log(`Found ${result.pagination.totalItems} fields`);
result.data.forEach(field => {
  console.log(`${field.name}: ${field.area?.value} ${field.area?.unit}`);
});
```

---

## getField()

Get a single field by ID.

### Signature

```typescript
async function getField(params: GetFieldParams): Promise<UnifiedField>
```

### Parameters

```typescript
interface GetFieldParams {
  /** Provider context with authenticated client */
  context: ProviderContext;
  
  /** Organization/account ID */
  organizationId: string;
  
  /** Field ID */
  fieldId: string;
  
  /** Geometry options */
  geometry?: {
    includeGeometry?: boolean;  // Attach active boundary (default: false)
    geometryFormat?: 'geojson' | 'wkt' | 'coordinates';
    simplifyTolerance?: number;
  };
  
  /** Unit options */
  units?: {
    areaUnit?: 'ha' | 'ac' | 'sqm' | 'sqft';
  };
}
```

### Returns

```typescript
interface UnifiedField {
  id: string;
  providerId: string;
  provider: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
  farmId?: string;
  farmName?: string;
  area?: { value: number; unit: 'ha' | 'ac' | 'sqm' | 'sqft' };
  status: 'active' | 'archived';
  boundary?: UnifiedBoundary;
  metadata?: Record<string, unknown>;
}
```

### Example

```typescript
const field = await getField({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  fieldId: 'field-456',
  geometry: { includeGeometry: true, geometryFormat: 'geojson' },
  units: { areaUnit: 'ha' },
});

console.log(field.name);
console.log(field.boundary?.geometry);  // GeoJSON if includeGeometry was true
```

---

## listBoundaries()

List boundaries from a provider with pagination and filtering.

### Signature

```typescript
async function listBoundaries(params: ListBoundariesParams): Promise<PaginatedResult<UnifiedBoundary>>
```

### Parameters

```typescript
interface ListBoundariesParams {
  /** Provider context with authenticated client */
  context: ProviderContext;
  
  /** Organization/account ID */
  organizationId: string;
  
  /** Filter by field ID (optional - if omitted, returns all org boundaries) */
  fieldId?: string;
  
  /** Filter by status: 'active' | 'archived' | 'all' (default: 'active') */
  status?: 'active' | 'archived' | 'all';
  
  /** Only return the active boundary per field (default: false) */
  onlyActive?: boolean;
  
  /** Pagination options */
  pagination?: {
    page?: number;
    pageSize?: number;
    cursor?: string;
  };
  
  /** Geometry options */
  geometry?: {
    includeGeometry?: boolean;  // Include geometry (default: true for boundaries)
    geometryFormat?: 'geojson' | 'wkt' | 'coordinates';
    simplifyTolerance?: number;
  };
  
  /** Unit options */
  units?: {
    areaUnit?: 'ha' | 'ac' | 'sqm' | 'sqft';
  };
}
```

### Returns

```typescript
interface PaginatedResult<UnifiedBoundary> {
  data: UnifiedBoundary[];
  pagination: { /* same as listFields */ };
}
```

### Example

```typescript
// List all boundaries for a specific field
const fieldBoundaries = await listBoundaries({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  fieldId: 'field-456',
  onlyActive: true,
  geometry: { geometryFormat: 'wkt' },
});

// List all boundaries for an organization
const allBoundaries = await listBoundaries({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  pagination: { page: 1, pageSize: 100 },
});
```

---

## getBoundary()

Get a single boundary by ID.

### Signature

```typescript
async function getBoundary(params: GetBoundaryParams): Promise<UnifiedBoundary>
```

### Parameters

```typescript
interface GetBoundaryParams {
  /** Provider context with authenticated client */
  context: ProviderContext;
  
  /** Organization/account ID */
  organizationId: string;
  
  /** Boundary ID */
  boundaryId: string;
  
  /** Geometry options */
  geometry?: {
    includeGeometry?: boolean;  // Include geometry (default: true)
    geometryFormat?: 'geojson' | 'wkt' | 'coordinates';
    simplifyTolerance?: number;
  };
  
  /** Unit options */
  units?: {
    areaUnit?: 'ha' | 'ac' | 'sqm' | 'sqft';
  };
}
```

### Returns

```typescript
interface UnifiedBoundary {
  id: string;
  providerId: string;
  provider: string;
  fieldId?: string;
  fieldName?: string;
  name?: string;
  isActive: boolean;
  area?: { value: number; unit: string };
  workableArea?: { value: number; unit: string };
  geometry?: GeoJSON.Geometry | string;  // Based on geometryFormat
  geometryFormat?: 'geojson' | 'wkt' | 'coordinates';
  status: 'active' | 'archived';
  sourceType?: string;
  signalType?: string;  // GPS accuracy type
  irrigated?: boolean;
  createdAt?: string;
  modifiedAt?: string;
  metadata?: Record<string, unknown>;
}
```

### Example

```typescript
const boundary = await getBoundary({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  boundaryId: 'boundary-789',
  geometry: { geometryFormat: 'geojson' },
  units: { areaUnit: 'ha' },
});

console.log(boundary.area);        // { value: 45.5, unit: 'ha' }
console.log(boundary.isActive);    // true
console.log(boundary.geometry);    // GeoJSON object
```

---

## Provider Context

All service functions require a `ProviderContext`:

```typescript
interface ProviderContext {
  /** Provider identifier */
  provider: 'john_deere' | 'climate_fieldview' | 'cnhi' | 'trimble' | 'raven' | 'ag_leader';
  
  /** Authenticated client instance for the provider */
  client: ProviderClient;
}
```

### Creating Context for John Deere

```typescript
import { createJohnDeereClient } from '@acreblitz/platform-integrations';

const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID!,
  clientSecret: process.env.JD_CLIENT_SECRET!,
  refreshToken: savedToken,
});

const context = { provider: 'john_deere' as const, client };
```

---

## Geometry Formats

### GeoJSON (default)

```typescript
geometry: { geometryFormat: 'geojson' }
// Returns: { type: 'Polygon', coordinates: [...] }
```

### WKT (Well-Known Text)

```typescript
geometry: { geometryFormat: 'wkt' }
// Returns: "POLYGON((-95.1 41.2, -95.2 41.3, ...))"
```

### Coordinates Array

```typescript
geometry: { geometryFormat: 'coordinates' }
// Returns: "[[-95.1, 41.2], [-95.2, 41.3], ...]" (JSON string)
```

---

## Constants

```typescript
import {
  DEFAULT_PAGE_SIZE,      // 50
  MAX_PAGE_SIZE,          // 100
  DEFAULT_AREA_UNIT,      // 'ha'
  DEFAULT_GEOMETRY_FORMAT // 'geojson'
} from '@acreblitz/platform-integrations';
```

---

## Error Handling

Services may throw provider-specific errors:

```typescript
try {
  const fields = await listFields({ /* ... */ });
} catch (error) {
  if (error instanceof JohnDeereError) {
    console.error(`JD Error: ${error.code} - ${error.message}`);
  }
  throw error;
}
```

See [Error Handling Guide](../guides/error-handling.md) for details.

