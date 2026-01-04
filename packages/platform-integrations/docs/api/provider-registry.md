# Provider Registry API Reference

The provider registry manages provider adapters and allows looking up, registering, and querying provider implementations.

## Overview

| Function | Description |
|----------|-------------|
| `getFieldAdapter()` | Get the field adapter for a provider |
| `getBoundaryAdapter()` | Get the boundary adapter for a provider |
| `registerFieldAdapter()` | Register a custom field adapter |
| `registerBoundaryAdapter()` | Register a custom boundary adapter |
| `hasFieldAdapter()` | Check if a field adapter is registered |
| `hasBoundaryAdapter()` | Check if a boundary adapter is registered |
| `getRegisteredProviders()` | Get list of all registered providers |
| `isProviderFullySupported()` | Check if a provider has all adapters |

## Import

```typescript
import {
  // Registry functions
  getFieldAdapter,
  getBoundaryAdapter,
  registerFieldAdapter,
  registerBoundaryAdapter,
  hasFieldAdapter,
  hasBoundaryAdapter,
  getRegisteredProviders,
  isProviderFullySupported,
  
  // Types
  type ProviderType,
  type FieldAdapter,
  type BoundaryAdapter,
} from '@acreblitz/platform-integrations';
```

---

## getFieldAdapter()

Get the field adapter for a specific provider.

### Signature

```typescript
function getFieldAdapter(provider: ProviderType): FieldAdapter
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `ProviderType` | Provider identifier (`'john_deere'`, `'climate_fieldview'`, etc.) |

### Returns

`FieldAdapter` - The registered field adapter for the provider.

### Throws

`Error` - If no adapter is registered for the provider.

### Example

```typescript
import { getFieldAdapter } from '@acreblitz/platform-integrations';

const adapter = getFieldAdapter('john_deere');
console.log(adapter.providerType);  // 'john_deere'

// Use the adapter directly (advanced usage)
const result = await adapter.listFields(client, {
  organizationId: 'org-123',
  page: 1,
  pageSize: 50,
  mapperOptions: {},
  includeGeometry: false,
});
```

---

## getBoundaryAdapter()

Get the boundary adapter for a specific provider.

### Signature

```typescript
function getBoundaryAdapter(provider: ProviderType): BoundaryAdapter
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `ProviderType` | Provider identifier |

### Returns

`BoundaryAdapter` - The registered boundary adapter for the provider.

### Throws

`Error` - If no adapter is registered for the provider.

### Example

```typescript
import { getBoundaryAdapter } from '@acreblitz/platform-integrations';

const adapter = getBoundaryAdapter('john_deere');
const boundaries = await adapter.listBoundaries(client, {
  organizationId: 'org-123',
  page: 1,
  pageSize: 50,
  mapperOptions: { geometry: { includeGeometry: true } },
});
```

---

## registerFieldAdapter()

Register a custom field adapter. Useful for:
- Adding new providers at runtime
- Replacing built-in adapters for testing
- Adding custom implementations

### Signature

```typescript
function registerFieldAdapter(provider: ProviderType, adapter: FieldAdapter): void
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `ProviderType` | Provider identifier |
| `adapter` | `FieldAdapter` | Adapter implementation |

### Example

```typescript
import { registerFieldAdapter, type FieldAdapter } from '@acreblitz/platform-integrations';

// Create a mock adapter for testing
const mockFieldAdapter: FieldAdapter = {
  providerType: 'john_deere',
  
  async listFields(client, options) {
    return {
      data: [{ id: '1', providerId: '1', provider: 'john_deere', name: 'Mock Field', status: 'active' }],
      pagination: { page: 1, pageSize: 50, hasNextPage: false },
    };
  },
  
  async getField(client, options) {
    return { id: '1', providerId: '1', provider: 'john_deere', name: 'Mock Field', status: 'active' };
  },
};

// Register the mock (replaces existing adapter)
registerFieldAdapter('john_deere', mockFieldAdapter);
```

---

## registerBoundaryAdapter()

Register a custom boundary adapter.

### Signature

```typescript
function registerBoundaryAdapter(provider: ProviderType, adapter: BoundaryAdapter): void
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `ProviderType` | Provider identifier |
| `adapter` | `BoundaryAdapter` | Adapter implementation |

### Example

```typescript
import { registerBoundaryAdapter, type BoundaryAdapter } from '@acreblitz/platform-integrations';

const customAdapter: BoundaryAdapter = {
  providerType: 'custom_provider',
  async listBoundaries(client, options) { /* ... */ },
  async getBoundary(client, options) { /* ... */ },
};

registerBoundaryAdapter('custom_provider' as ProviderType, customAdapter);
```

---

## hasFieldAdapter()

Check if a field adapter is registered for a provider.

### Signature

```typescript
function hasFieldAdapter(provider: ProviderType): boolean
```

### Example

```typescript
import { hasFieldAdapter } from '@acreblitz/platform-integrations';

if (hasFieldAdapter('john_deere')) {
  console.log('John Deere field operations supported');
}

if (!hasFieldAdapter('climate_fieldview')) {
  console.log('Climate FieldView not yet supported');
}
```

---

## hasBoundaryAdapter()

Check if a boundary adapter is registered for a provider.

### Signature

```typescript
function hasBoundaryAdapter(provider: ProviderType): boolean
```

### Example

```typescript
import { hasBoundaryAdapter } from '@acreblitz/platform-integrations';

const supported = hasBoundaryAdapter('john_deere');  // true
```

---

## getRegisteredProviders()

Get a list of all providers that have at least one adapter registered.

### Signature

```typescript
function getRegisteredProviders(): ProviderType[]
```

### Returns

`ProviderType[]` - Array of provider identifiers.

### Example

```typescript
import { getRegisteredProviders } from '@acreblitz/platform-integrations';

const providers = getRegisteredProviders();
console.log(providers);  // ['john_deere']

// Use to build UI
providers.forEach(provider => {
  console.log(`Provider ${provider} is available`);
});
```

---

## isProviderFullySupported()

Check if a provider has both field and boundary adapters registered.

### Signature

```typescript
function isProviderFullySupported(provider: ProviderType): boolean
```

### Example

```typescript
import { isProviderFullySupported } from '@acreblitz/platform-integrations';

if (isProviderFullySupported('john_deere')) {
  console.log('Full field and boundary support available');
}
```

---

## Adapter Interfaces

### FieldAdapter

```typescript
interface FieldAdapter<TClient = ProviderClient> {
  /** Provider type this adapter handles */
  readonly providerType: ProviderType;

  /** List fields from the provider */
  listFields(
    client: TClient,
    options: ListFieldsAdapterOptions
  ): Promise<PaginatedResult<UnifiedField>>;

  /** Get a single field by ID */
  getField(
    client: TClient,
    options: GetFieldAdapterOptions
  ): Promise<UnifiedField>;
}
```

### BoundaryAdapter

```typescript
interface BoundaryAdapter<TClient = ProviderClient> {
  /** Provider type this adapter handles */
  readonly providerType: ProviderType;

  /** List boundaries from the provider */
  listBoundaries(
    client: TClient,
    options: ListBoundariesAdapterOptions
  ): Promise<PaginatedResult<UnifiedBoundary>>;

  /** Get a single boundary by ID */
  getBoundary(
    client: TClient,
    options: GetBoundaryAdapterOptions
  ): Promise<UnifiedBoundary>;
}
```

### Adapter Options

```typescript
interface ListFieldsAdapterOptions {
  organizationId: string;
  farmId?: string;
  status?: 'active' | 'archived' | 'all';
  search?: string;
  page: number;
  pageSize: number;
  mapperOptions: MapperOptions;
  includeGeometry: boolean;
}

interface GetFieldAdapterOptions {
  organizationId: string;
  fieldId: string;
  mapperOptions: MapperOptions;
  includeGeometry: boolean;
}

interface ListBoundariesAdapterOptions {
  organizationId: string;
  fieldId?: string;
  status?: 'active' | 'archived' | 'all';
  onlyActive?: boolean;
  page: number;
  pageSize: number;
  mapperOptions: MapperOptions;
}

interface GetBoundaryAdapterOptions {
  organizationId: string;
  boundaryId: string;
  mapperOptions: MapperOptions;
}
```

---

## Built-in Adapters

The package includes these pre-registered adapters:

| Provider | Field Adapter | Boundary Adapter |
|----------|--------------|------------------|
| `john_deere` | ✅ `JohnDeereFieldAdapter` | ✅ `JohnDeereBoundaryAdapter` |
| `climate_fieldview` | 🔜 Planned | 🔜 Planned |

### Accessing Built-in Adapters Directly

```typescript
import {
  johnDeereFieldAdapter,
  johnDeereBoundaryAdapter,
  JohnDeereFieldAdapter,
  JohnDeereBoundaryAdapter,
} from '@acreblitz/platform-integrations';

// Use singleton instances
const fields = await johnDeereFieldAdapter.listFields(client, options);

// Or create new instances
const customAdapter = new JohnDeereFieldAdapter();
```

---

## Testing with Mock Adapters

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  listFields, 
  registerFieldAdapter, 
  getFieldAdapter,
  johnDeereFieldAdapter,
} from '@acreblitz/platform-integrations';

describe('Field Service', () => {
  let originalAdapter: FieldAdapter;

  beforeEach(() => {
    // Save original adapter
    originalAdapter = getFieldAdapter('john_deere');
    
    // Register mock
    registerFieldAdapter('john_deere', {
      providerType: 'john_deere',
      async listFields() {
        return {
          data: [{ id: '1', providerId: '1', provider: 'john_deere', name: 'Test', status: 'active' }],
          pagination: { page: 1, pageSize: 50, hasNextPage: false },
        };
      },
      async getField() {
        return { id: '1', providerId: '1', provider: 'john_deere', name: 'Test', status: 'active' };
      },
    });
  });

  afterEach(() => {
    // Restore original adapter
    registerFieldAdapter('john_deere', originalAdapter);
  });

  it('should list fields with mock', async () => {
    const result = await listFields({
      context: { provider: 'john_deere', client: {} as any },
      organizationId: 'org-1',
    });
    
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Test');
  });
});
```

