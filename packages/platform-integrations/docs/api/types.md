# Types Reference

Complete TypeScript type definitions for `@acreblitz/platform-integrations`.

## Import

```typescript
import type {
  // Unified Service Types
  Provider,
  ProviderContext,
  UnifiedField,
  UnifiedBoundary,
  PaginatedResult,
  PaginationOptions,
  GeometryOptions,
  UnitOptions,
  AreaUnit,
  AreaMeasurement,
  GeometryFormat,
  RecordStatus,
  
  // Service Parameters
  ListFieldsParams,
  GetFieldParams,
  ListBoundariesParams,
  GetBoundaryParams,
  MapperOptions,
  
  // Provider Adapter Types
  ProviderType,
  FieldAdapter,
  BoundaryAdapter,
  ListFieldsAdapterOptions,
  GetFieldAdapterOptions,
  ListBoundariesAdapterOptions,
  GetBoundaryAdapterOptions,
  
  // John Deere OAuth Types
  JohnDeereOAuthConfig,
  AuthorizationUrlOptions,
  AuthorizationUrlResult,
  TokenExchangeResult,
  OrganizationConnectionInfo,
  
  // John Deere Client Types
  JohnDeereClientConfig,
  JohnDeereClient,
  
  // John Deere API Response Types
  Organization,
  Field,
  Boundary,
  GeoJSONMultiPolygon,
  Operation,
  
  // John Deere Options
  ListBoundariesOptions,
  ListFieldsOptions,
  
  // Common Types
  ApiLink,
  PaginatedResponse,
  
  // Errors
  JohnDeereError,
  JohnDeereApiError,
} from '@acreblitz/platform-integrations';
```

---

## Unified Service Types

These types are provider-agnostic and used across all providers.

### Provider

Supported provider identifiers.

```typescript
type Provider = 
  | 'john_deere' 
  | 'climate_fieldview' 
  | 'cnhi' 
  | 'trimble' 
  | 'raven' 
  | 'ag_leader';
```

### ProviderContext

Context passed to all service functions.

```typescript
interface ProviderContext {
  /** Provider identifier */
  provider: Provider;
  
  /** Authenticated client instance */
  client: ProviderClient;  // Type varies by provider
}
```

### UnifiedField

Provider-agnostic field representation.

```typescript
interface UnifiedField {
  /** Internal unique ID */
  id: string;
  
  /** Original ID from provider */
  providerId: string;
  
  /** Provider source ('john_deere', etc.) */
  provider: string;
  
  /** Field name */
  name: string;
  
  /** Organization/account ID */
  organizationId?: string;
  
  /** Organization name */
  organizationName?: string;
  
  /** Farm/client ID */
  farmId?: string;
  
  /** Farm/client name */
  farmName?: string;
  
  /** Field area */
  area?: AreaMeasurement;
  
  /** Record status */
  status: RecordStatus;
  
  /** Active boundary (if geometry requested) */
  boundary?: UnifiedBoundary;
  
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}
```

### UnifiedBoundary

Provider-agnostic boundary representation.

```typescript
interface UnifiedBoundary {
  /** Internal unique ID */
  id: string;
  
  /** Original ID from provider */
  providerId: string;
  
  /** Provider source */
  provider: string;
  
  /** Associated field ID */
  fieldId?: string;
  
  /** Associated field name */
  fieldName?: string;
  
  /** Boundary name */
  name?: string;
  
  /** Whether this is the active boundary */
  isActive: boolean;
  
  /** Boundary area */
  area?: AreaMeasurement;
  
  /** Workable (headlands removed) area */
  workableArea?: AreaMeasurement;
  
  /** Geometry (format depends on geometryFormat option) */
  geometry?: GeoJSONGeometry | string;
  
  /** Format of the geometry field */
  geometryFormat?: GeometryFormat;
  
  /** Record status */
  status: RecordStatus;
  
  /** Source type (how boundary was created) */
  sourceType?: string;
  
  /** GPS signal type used */
  signalType?: string;
  
  /** Whether the field is irrigated */
  irrigated?: boolean;
  
  /** ISO timestamp of creation */
  createdAt?: string;
  
  /** ISO timestamp of last modification */
  modifiedAt?: string;
  
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}
```

### AreaMeasurement

```typescript
interface AreaMeasurement {
  value: number;
  unit: AreaUnit;
}
```

### AreaUnit

```typescript
type AreaUnit = 'ha' | 'ac' | 'sqm' | 'sqft';
```

### GeometryFormat

```typescript
type GeometryFormat = 'geojson' | 'wkt' | 'coordinates';
```

### RecordStatus

```typescript
type RecordStatus = 'active' | 'archived';
```

### PaginatedResult

Generic paginated response from services.

```typescript
interface PaginatedResult<T> {
  /** Array of results */
  data: T[];
  
  /** Pagination metadata */
  pagination: PaginationMeta;
}

interface PaginationMeta {
  /** Current page (1-indexed) */
  page: number;
  
  /** Items per page */
  pageSize: number;
  
  /** Total items (if known) */
  totalItems?: number;
  
  /** Total pages (if known) */
  totalPages?: number;
  
  /** Whether there are more pages */
  hasNextPage: boolean;
  
  /** Cursor for next page (if cursor-based) */
  nextCursor?: string;
}
```

---

## Service Parameter Types

### ListFieldsParams

```typescript
interface ListFieldsParams {
  context: ProviderContext;
  organizationId: string;
  farmId?: string;
  status?: RecordStatus | 'all';
  search?: string;
  pagination?: PaginationOptions;
  geometry?: GeometryOptions;
  units?: UnitOptions;
}
```

### GetFieldParams

```typescript
interface GetFieldParams {
  context: ProviderContext;
  organizationId: string;
  fieldId: string;
  geometry?: GeometryOptions;
  units?: UnitOptions;
}
```

### ListBoundariesParams

```typescript
interface ListBoundariesParams {
  context: ProviderContext;
  organizationId: string;
  fieldId?: string;
  status?: RecordStatus | 'all';
  onlyActive?: boolean;
  pagination?: PaginationOptions;
  geometry?: GeometryOptions;
  units?: UnitOptions;
}
```

### GetBoundaryParams

```typescript
interface GetBoundaryParams {
  context: ProviderContext;
  organizationId: string;
  boundaryId: string;
  geometry?: GeometryOptions;
  units?: UnitOptions;
}
```

### PaginationOptions

```typescript
interface PaginationOptions {
  /** Page number (1-indexed, default: 1) */
  page?: number;
  
  /** Items per page (default: 50, max: 100) */
  pageSize?: number;
  
  /** Cursor for cursor-based pagination */
  cursor?: string;
}
```

### GeometryOptions

```typescript
interface GeometryOptions {
  /** Include geometry in response */
  includeGeometry?: boolean;
  
  /** Output format */
  geometryFormat?: GeometryFormat;
  
  /** Simplify geometry (tolerance in meters) */
  simplifyTolerance?: number;
}
```

### UnitOptions

```typescript
interface UnitOptions {
  /** Unit for area values */
  areaUnit?: AreaUnit;
}
```

### MapperOptions

```typescript
interface MapperOptions {
  geometry?: GeometryOptions;
  units?: UnitOptions;
  context?: {
    organizationName?: string;
    farmName?: string;
    fieldName?: string;
  };
}
```

---

## Provider Adapter Types

See [Provider Registry API](./provider-registry.md) for full details.

### FieldAdapter

```typescript
interface FieldAdapter<TClient = ProviderClient> {
  readonly providerType: ProviderType;
  listFields(client: TClient, options: ListFieldsAdapterOptions): Promise<PaginatedResult<UnifiedField>>;
  getField(client: TClient, options: GetFieldAdapterOptions): Promise<UnifiedField>;
}
```

### BoundaryAdapter

```typescript
interface BoundaryAdapter<TClient = ProviderClient> {
  readonly providerType: ProviderType;
  listBoundaries(client: TClient, options: ListBoundariesAdapterOptions): Promise<PaginatedResult<UnifiedBoundary>>;
  getBoundary(client: TClient, options: GetBoundaryAdapterOptions): Promise<UnifiedBoundary>;
}
```

---

---

## OAuth Types

### JohnDeereOAuthConfig

Configuration for the OAuth helper class.

```typescript
interface JohnDeereOAuthConfig {
  /** Application Client ID from developer.deere.com */
  clientId: string;
  
  /** Application Client Secret */
  clientSecret: string;
  
  /** Registered redirect URI */
  redirectUri: string;
  
  /** Override authorization endpoint (optional) */
  authorizationUrl?: string;
  
  /** Override token endpoint (optional) */
  tokenUrl?: string;
  
  /** Override revoke endpoint (optional) */
  revokeUrl?: string;
  
  /** Override API base URL for sandbox testing (optional) */
  apiBaseUrl?: string;
}
```

### JohnDeereScope

Valid OAuth scope values.

```typescript
type JohnDeereScope =
  | 'openid'
  | 'profile'
  | 'offline_access'
  | 'ag1'
  | 'ag2'
  | 'ag3'
  | 'eq1'
  | 'eq2'
  | 'org1'
  | 'org2'
  | 'files'
  | 'work1'
  | 'work2';
```

### AuthorizationUrlOptions

Options for generating the authorization URL.

```typescript
interface AuthorizationUrlOptions {
  /** OAuth scopes to request */
  scopes: JohnDeereScope[];
  
  /** Custom state parameter (auto-generated if not provided) */
  state?: string;
}
```

### AuthorizationUrlResult

Result of generating an authorization URL.

```typescript
interface AuthorizationUrlResult {
  /** Full authorization URL to redirect to */
  url: string;
  
  /** State parameter for CSRF verification */
  state: string;
}
```

### TokenExchangeResult

Result of exchanging an authorization code for tokens.

```typescript
interface TokenExchangeResult {
  /** Access token for API calls */
  accessToken: string;
  
  /** Refresh token for getting new access tokens */
  refreshToken: string;
  
  /** Token type (usually "Bearer") */
  tokenType: string;
  
  /** Seconds until access token expires */
  expiresIn: number;
  
  /** Granted scopes (space-separated) */
  scope?: string;
  
  /** User's organizations with connection status */
  organizations: OrganizationConnectionInfo[];
  
  /** URL to complete org setup (null if not needed) */
  connectionsUrl: string | null;
}
```

### OrganizationConnectionInfo

Organization information from token exchange.

```typescript
interface OrganizationConnectionInfo {
  /** Organization ID */
  id: string;
  
  /** Organization name */
  name: string;
  
  /** Organization type (e.g., "customer") */
  type?: string;
  
  /** Whether user needs to complete connection setup */
  needsConnection: boolean;
  
  /** URL to complete setup (if needsConnection is true) */
  connectionsUrl?: string;
}
```

---

## Client Types

### JohnDeereClientConfig

Configuration for creating an API client.

```typescript
interface JohnDeereClientConfig {
  /** Application Client ID */
  clientId: string;
  
  /** Application Client Secret */
  clientSecret: string;
  
  /** User's saved refresh token */
  refreshToken: string;
  
  /** Override API base URL (optional) */
  baseUrl?: string;
  
  /** Callback when a new refresh token is issued */
  onTokenRefresh?: (newRefreshToken: string) => void | Promise<void>;
}
```

### JohnDeereClient

The API client interface.

```typescript
interface JohnDeereClient {
  organizations: {
    list(): Promise<Organization[]>;
    get(orgId: string): Promise<Organization>;
  };
  
  fields: {
    list(orgId: string, options?: ListFieldsOptions): Promise<Field[]>;
    get(orgId: string, fieldId: string): Promise<Field>;
  };
  
  boundaries: {
    listForOrg(orgId: string, options?: ListBoundariesOptions): Promise<Boundary[]>;
    listForField(orgId: string, fieldId: string, options?: ListBoundariesOptions): Promise<Boundary[]>;
    get(orgId: string, boundaryId: string): Promise<Boundary>;
  };
  
  operations: {
    list(orgId: string, fieldId: string): Promise<Operation[]>;
  };
}
```

---

## API Response Types

### Organization

```typescript
interface Organization {
  '@type'?: string;
  id: string;
  name: string;
  type?: string;      // "customer", "dealer", etc.
  member?: boolean;
  internal?: boolean;
  links?: ApiLink[];
}
```

### Field

```typescript
interface Field {
  '@type'?: string;
  id: string;
  name: string;
  area?: {
    value: number;
    unit: string;     // "ac", "ha", etc.
  };
  archived?: boolean;
  links?: ApiLink[];
}
```

### Boundary

```typescript
interface Boundary {
  '@type'?: string;
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
```

### GeoJSONMultiPolygon

```typescript
interface GeoJSONMultiPolygon {
  '@type'?: string;
  type: 'MultiPolygon';
  coordinates: number[][][][];  // [polygon][ring][point][lng, lat]
}
```

### Operation

```typescript
interface Operation {
  '@type'?: string;
  id: string;
  type?: string;      // "planting", "harvest", "application"
  startTime?: string; // ISO 8601 date string
  endTime?: string;
  area?: {
    value: number;
    unit: string;
  };
  links?: ApiLink[];
}
```

---

## Options Types

### ListBoundariesOptions

```typescript
interface ListBoundariesOptions {
  /** Include geometry data */
  embed?: 'multipolygons';
  
  /** Filter by status */
  recordFilter?: 'active' | 'archived' | 'all';
}
```

### ListFieldsOptions

```typescript
interface ListFieldsOptions {
  /** Filter by status */
  recordFilter?: 'active' | 'archived' | 'all';
}
```

---

## Common Types

### ApiLink

HATEOAS link in API responses.

```typescript
interface ApiLink {
  '@type'?: string;
  rel: string;     // Relationship type
  uri: string;     // Target URL
}
```

### PaginatedResponse

Generic paginated response structure.

```typescript
interface PaginatedResponse<T> {
  values: T[];
  total?: number;
  links?: ApiLink[];
}
```

---

## Error Types

### JohnDeereError

Custom error class for API errors.

```typescript
class JohnDeereError extends Error {
  /** Error code (e.g., "TOKEN_EXCHANGE_FAILED", "HTTP_403") */
  readonly code: string;
  
  /** HTTP status code (if applicable) */
  readonly status?: number;
  
  /** Raw error details from API */
  readonly details?: JohnDeereApiError;
  
  constructor(
    message: string,
    code: string,
    status?: number,
    details?: JohnDeereApiError
  );
}
```

### JohnDeereApiError

Raw API error response structure.

```typescript
interface JohnDeereApiError {
  code?: string;
  message?: string;
  errors?: Array<{
    code?: string;
    message?: string;
  }>;
}
```

---

## Constants

### JD_OAUTH_ENDPOINTS

Default OAuth endpoint URLs.

```typescript
const JD_OAUTH_ENDPOINTS = {
  AUTHORIZATION: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
  TOKEN: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  REVOKE: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/revoke',
} as const;
```

### JD_API_BASE_URLS

API base URLs.

```typescript
const JD_API_BASE_URLS = {
  PRODUCTION: 'https://api.deere.com/platform',
  SANDBOX: 'https://sandboxapi.deere.com/platform',
} as const;
```

