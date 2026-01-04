# Provider Adapter Architecture

This guide explains the modular provider adapter architecture that allows `@acreblitz/platform-integrations` to support multiple agricultural data providers (John Deere, Climate FieldView, etc.) with a unified API.

## Overview

The architecture follows the **Adapter Pattern**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Application                            │
├─────────────────────────────────────────────────────────────────┤
│                    Unified Services                              │
│         listFields() · getField() · listBoundaries()            │
├─────────────────────────────────────────────────────────────────┤
│                    Provider Registry                             │
│        getFieldAdapter() · getBoundaryAdapter()                  │
├─────────────────────────────────────────────────────────────────┤
│    John Deere        │   Climate FieldView   │   Other...       │
│    Adapter           │   Adapter             │   Adapters       │
├─────────────────────────────────────────────────────────────────┤
│    John Deere        │   Climate FieldView   │   Other          │
│    API               │   API                 │   APIs           │
└─────────────────────────────────────────────────────────────────┘
```

## Key Benefits

- **Unified API**: Same functions work across all providers
- **Provider Agnostic**: Your app doesn't need to know provider details
- **Extensible**: Easy to add new providers without changing existing code
- **Testable**: Mock adapters for unit testing
- **Type Safe**: Full TypeScript support with provider-specific types

## Core Concepts

### 1. Unified Services

The service layer provides provider-agnostic functions:

```typescript
import { listFields, getField, listBoundaries, getBoundary } from '@acreblitz/platform-integrations';

// Works with ANY provider
const fields = await listFields({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
});
```

### 2. Provider Context

Every service function requires a `context` that identifies the provider:

```typescript
interface ProviderContext {
  provider: 'john_deere' | 'climate_fieldview' | '...';
  client: ProviderClient;  // The authenticated client for that provider
}
```

### 3. Provider Adapters

Each provider implements adapter interfaces:

```typescript
interface FieldAdapter<TClient> {
  readonly providerType: ProviderType;
  listFields(client: TClient, options: ListFieldsAdapterOptions): Promise<PaginatedResult<UnifiedField>>;
  getField(client: TClient, options: GetFieldAdapterOptions): Promise<UnifiedField>;
}

interface BoundaryAdapter<TClient> {
  readonly providerType: ProviderType;
  listBoundaries(client: TClient, options: ListBoundariesAdapterOptions): Promise<PaginatedResult<UnifiedBoundary>>;
  getBoundary(client: TClient, options: GetBoundaryAdapterOptions): Promise<UnifiedBoundary>;
}
```

### 4. Provider Registry

The registry maps provider types to their adapters:

```typescript
import { getFieldAdapter, getBoundaryAdapter } from '@acreblitz/platform-integrations';

// Services use the registry internally
const adapter = getFieldAdapter('john_deere');
const fields = await adapter.listFields(client, options);
```

## Directory Structure

```
src/
├── services/                   # Unified service layer
│   ├── field-service.ts        # listFields(), getField()
│   ├── boundary-service.ts     # listBoundaries(), getBoundary()
│   └── types.ts                # Unified types (UnifiedField, etc.)
│
├── providers/                  # Provider adapters
│   ├── types.ts                # Adapter interfaces
│   ├── registry.ts             # Provider registry
│   ├── index.ts                # Exports
│   │
│   ├── john-deere/             # John Deere implementation
│   │   ├── field-adapter.ts
│   │   ├── boundary-adapter.ts
│   │   ├── client.ts           # API client
│   │   ├── oauth.ts            # OAuth helper
│   │   └── index.ts
│   │
│   └── climate-fieldview/      # Future provider
│       ├── field-adapter.ts
│       ├── boundary-adapter.ts
│       └── index.ts
│
└── mappers/                    # Data transformation
    ├── john-deere.ts           # JD → Unified mappers
    └── geometry.ts             # Geometry utilities
```

## Unified Types

All providers return the same unified types:

### UnifiedField

```typescript
interface UnifiedField {
  id: string;                    // Unique ID (internal)
  providerId: string;            // Original provider ID
  provider: string;              // 'john_deere', etc.
  name: string;
  organizationId?: string;
  organizationName?: string;
  farmId?: string;
  farmName?: string;
  area?: AreaMeasurement;        // { value: 100, unit: 'ac' }
  status: 'active' | 'archived';
  boundary?: UnifiedBoundary;    // Attached if includeGeometry: true
  metadata?: Record<string, unknown>;
}
```

### UnifiedBoundary

```typescript
interface UnifiedBoundary {
  id: string;
  providerId: string;
  provider: string;
  fieldId?: string;
  fieldName?: string;
  name?: string;
  isActive: boolean;
  area?: AreaMeasurement;
  workableArea?: AreaMeasurement;
  geometry?: GeoJSONGeometry | string;  // Based on geometryFormat
  geometryFormat?: 'geojson' | 'wkt' | 'coordinates';
  status: 'active' | 'archived';
  sourceType?: string;
  signalType?: string;
  irrigated?: boolean;
  createdAt?: string;
  modifiedAt?: string;
  metadata?: Record<string, unknown>;
}
```

## Usage Examples

### Basic Field Listing

```typescript
import { 
  createJohnDeereClient, 
  listFields 
} from '@acreblitz/platform-integrations';

// Create authenticated client
const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID!,
  clientSecret: process.env.JD_CLIENT_SECRET!,
  refreshToken: savedToken,
});

// List fields using unified service
const result = await listFields({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  pagination: { page: 1, pageSize: 25 },
  units: { areaUnit: 'ac' },
});

console.log(result.data);  // UnifiedField[]
console.log(result.pagination.hasNextPage);
```

### With Geometry

```typescript
const fieldsWithGeometry = await listFields({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  geometry: {
    includeGeometry: true,
    geometryFormat: 'geojson',
    simplifyTolerance: 10,  // meters
  },
});

// Each field has its boundary attached
fieldsWithGeometry.data.forEach(field => {
  if (field.boundary?.geometry) {
    console.log(field.name, field.boundary.geometry);
  }
});
```

### Filtering and Search

```typescript
const filtered = await listFields({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  farmId: 'farm-456',           // Filter by farm
  status: 'active',             // 'active' | 'archived' | 'all'
  search: 'north',              // Name search
});
```

### Boundary Operations

```typescript
import { listBoundaries, getBoundary } from '@acreblitz/platform-integrations';

// List all boundaries for a field
const boundaries = await listBoundaries({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  fieldId: 'field-789',
  onlyActive: true,  // Only return active boundary
  geometry: { geometryFormat: 'wkt' },
});

// Get a specific boundary
const boundary = await getBoundary({
  context: { provider: 'john_deere', client },
  organizationId: 'org-123',
  boundaryId: 'boundary-abc',
  geometry: { geometryFormat: 'geojson' },
});
```

## Next Steps

- [Adding a New Provider](./adding-providers.md) - Step-by-step guide
- [Services API Reference](../api/services.md) - Complete API documentation
- [Provider Registry](../api/provider-registry.md) - Registry API

