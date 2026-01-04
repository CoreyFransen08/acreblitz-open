# createJohnDeereClient

Factory function that creates an authenticated API client for John Deere Operations Center.

## Import

```typescript
import { createJohnDeereClient } from '@acreblitz/platform-integrations';
```

## Function Signature

```typescript
async function createJohnDeereClient(
  config: JohnDeereClientConfig
): Promise<JohnDeereClient>
```

## Configuration

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.clientId` | `string` | Yes | Your application's Client ID |
| `config.clientSecret` | `string` | Yes | Your application's Client Secret |
| `config.refreshToken` | `string` | Yes | The user's saved refresh token |
| `config.baseUrl` | `string` | No | Override API base URL |
| `config.onTokenRefresh` | `(token: string) => void` | No | Callback when a new refresh token is issued |

## Basic Usage

```typescript
const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  refreshToken: savedRefreshToken,
  onTokenRefresh: async (newToken) => {
    // IMPORTANT: Save the new token
    await db.updateRefreshToken(userId, newToken);
  },
});
```

## How It Works

1. **On creation:** Exchanges refresh token for a fresh access token
2. **If JD issues new refresh token:** Calls `onTokenRefresh` callback
3. **Returns:** Ready-to-use client with access token stored internally

> ⚠️ **Important:** Always implement `onTokenRefresh`. John Deere may issue a new refresh token, and if you don't save it, you'll lose access.

---

# JohnDeereClient

The client object returned by `createJohnDeereClient()`.

## Organizations

### organizations.list()

List all organizations the user has access to.

```typescript
async list(): Promise<Organization[]>
```

#### Example

```typescript
const orgs = await client.organizations.list();

for (const org of orgs) {
  console.log(`${org.name} (${org.id})`);
}
```

#### Response Type

```typescript
interface Organization {
  id: string;
  name: string;
  type?: string;      // "customer", "dealer", etc.
  member?: boolean;   // Is user a member?
  internal?: boolean; // Is this an internal org?
  links?: ApiLink[];  // HATEOAS links
}
```

---

### organizations.get()

Get a specific organization by ID.

```typescript
async get(orgId: string): Promise<Organization>
```

#### Example

```typescript
const org = await client.organizations.get('123456');
console.log(org.name);
```

---

## Fields

### fields.list()

List all fields for an organization.

```typescript
async list(orgId: string, options?: ListFieldsOptions): Promise<Field[]>
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `recordFilter` | `'active' \| 'archived' \| 'all'` | Filter by status |

#### Example

```typescript
// Get all active fields
const fields = await client.fields.list(orgId);

// Include archived fields
const allFields = await client.fields.list(orgId, { 
  recordFilter: 'all' 
});
```

#### Response Type

```typescript
interface Field {
  id: string;
  name: string;
  area?: {
    value: number;
    unit: string;   // e.g., "ac" for acres
  };
  archived?: boolean;
  links?: ApiLink[];
}
```

---

### fields.get()

Get a specific field by ID.

```typescript
async get(orgId: string, fieldId: string): Promise<Field>
```

#### Example

```typescript
const field = await client.fields.get(orgId, fieldId);
console.log(`${field.name}: ${field.area?.value} ${field.area?.unit}`);
```

---

## Boundaries

### boundaries.listForOrg()

List all boundaries for an organization.

```typescript
async listForOrg(orgId: string, options?: ListBoundariesOptions): Promise<Boundary[]>
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `embed` | `'multipolygons'` | Include geometry data |
| `recordFilter` | `'active' \| 'archived' \| 'all'` | Filter by status |

#### Example

```typescript
// Get boundaries with geometry
const boundaries = await client.boundaries.listForOrg(orgId, {
  embed: 'multipolygons',
});

for (const boundary of boundaries) {
  if (boundary.multipolygons) {
    console.log('GeoJSON:', boundary.multipolygons[0]);
  }
}
```

---

### boundaries.listForField()

List boundaries for a specific field.

```typescript
async listForField(
  orgId: string, 
  fieldId: string, 
  options?: ListBoundariesOptions
): Promise<Boundary[]>
```

#### Example

```typescript
const boundaries = await client.boundaries.listForField(orgId, fieldId, {
  embed: 'multipolygons',
  recordFilter: 'active',
});
```

---

### boundaries.get()

Get a specific boundary by ID.

```typescript
async get(orgId: string, boundaryId: string): Promise<Boundary>
```

#### Response Type

```typescript
interface Boundary {
  id: string;
  name?: string;
  area?: {
    value: number;
    unit: string;
  };
  active?: boolean;
  source?: string;
  sourceType?: string;
  dateCreated?: string;
  dateModified?: string;
  multipolygons?: GeoJSONMultiPolygon[];
  links?: ApiLink[];
}

interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}
```

---

## Operations

### operations.list()

List operations (planting, harvest, applications) for a field.

```typescript
async list(orgId: string, fieldId: string): Promise<Operation[]>
```

#### Example

```typescript
const operations = await client.operations.list(orgId, fieldId);

for (const op of operations) {
  console.log(`${op.type} - ${op.startTime}`);
}
```

#### Response Type

```typescript
interface Operation {
  id: string;
  type?: string;     // "planting", "harvest", etc.
  startTime?: string;
  endTime?: string;
  area?: {
    value: number;
    unit: string;
  };
  links?: ApiLink[];
}
```

---

## Error Handling

All client methods may throw `JohnDeereError`:

```typescript
import { JohnDeereError } from '@acreblitz/platform-integrations';

try {
  const fields = await client.fields.list(orgId);
} catch (error) {
  if (error instanceof JohnDeereError) {
    switch (error.status) {
      case 401:
        // Token invalid - user needs to reconnect
        console.error('Authentication failed');
        break;
      case 403:
        // Permission denied - org connection not complete
        console.error('Access denied - check org connections');
        break;
      case 404:
        // Resource not found
        console.error('Organization or field not found');
        break;
      case 429:
        // Rate limited
        console.error('Too many requests - slow down');
        break;
      default:
        console.error('API error:', error.message);
    }
  }
}
```

---

## Pagination

All list methods automatically handle pagination. John Deere returns data in pages, but the client fetches all pages and returns a complete array.

```typescript
// This returns ALL fields, not just the first page
const fields = await client.fields.list(orgId);
console.log(`Total fields: ${fields.length}`);
```

---

## Using with Sandbox

For testing, use the sandbox API:

```typescript
const client = await createJohnDeereClient({
  clientId: process.env.JD_CLIENT_ID,
  clientSecret: process.env.JD_CLIENT_SECRET,
  refreshToken: savedRefreshToken,
  baseUrl: 'https://sandboxapi.deere.com/platform',
});
```

---

## Complete Example

```typescript
import { createJohnDeereClient, JohnDeereError } from '@acreblitz/platform-integrations';

async function fetchFarmData(userId: string) {
  // Get saved token from your database
  const refreshToken = await db.getRefreshToken(userId);
  
  if (!refreshToken) {
    throw new Error('User not connected to John Deere');
  }

  // Create client
  const client = await createJohnDeereClient({
    clientId: process.env.JD_CLIENT_ID!,
    clientSecret: process.env.JD_CLIENT_SECRET!,
    refreshToken,
    onTokenRefresh: async (newToken) => {
      await db.updateRefreshToken(userId, newToken);
    },
  });

  try {
    // Get organizations
    const orgs = await client.organizations.list();
    
    const farmData = [];
    
    for (const org of orgs) {
      // Get fields for each org
      const fields = await client.fields.list(org.id);
      
      for (const field of fields) {
        // Get boundary for each field
        const boundaries = await client.boundaries.listForField(
          org.id, 
          field.id,
          { embed: 'multipolygons' }
        );
        
        farmData.push({
          organization: org.name,
          field: field.name,
          area: field.area,
          boundaries: boundaries.map(b => ({
            id: b.id,
            geometry: b.multipolygons?.[0],
          })),
        });
      }
    }
    
    return farmData;
    
  } catch (error) {
    if (error instanceof JohnDeereError && error.status === 403) {
      // User needs to complete org connection
      throw new Error('Please complete John Deere setup');
    }
    throw error;
  }
}
```

