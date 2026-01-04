/**
 * @acreblitz/platform-integrations
 *
 * Platform integrations for agricultural data providers.
 * Currently supports John Deere Operations Center.
 *
 * @packageDocumentation
 */

// =============================================================================
// Unified Services (Provider-agnostic)
// =============================================================================

// Field operations
export { listFields, getField } from './services';

// Boundary operations
export { listBoundaries, getBoundary } from './services';

// Service types
export type {
  // Provider context
  Provider,
  ProviderContext,
  
  // Pagination
  PaginationOptions,
  PaginationMeta,
  PaginatedResult,
  
  // Geometry options
  GeometryFormat,
  GeometryOptions,
  
  // Unit options
  AreaUnit,
  UnitOptions,
  AreaMeasurement,
  
  // Record status
  RecordStatus,
  
  // Unified response types
  UnifiedField,
  UnifiedBoundary,
  GeoJSONGeometry,
  GeoJSONPoint,
  GeoJSONPolygon,
  GeoJSONMultiPolygon as UnifiedGeoJSONMultiPolygon,
  
  // Service params
  ListFieldsParams,
  GetFieldParams,
  ListBoundariesParams,
  GetBoundaryParams,
  MapperOptions,
} from './services';

// Service constants
export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_AREA_UNIT,
  DEFAULT_GEOMETRY_FORMAT,
} from './services';

// =============================================================================
// Mappers (for custom transformations)
// =============================================================================

export {
  // Geometry utilities
  jdToGeoJSON,
  geoJSONToWKT,
  convertGeometryFormat,
  convertArea,
  simplifyGeometry,
  calculateBBox,
  
  // John Deere mappers
  mapJohnDeereField,
  mapJohnDeereFields,
  mapJohnDeereBoundary,
  mapJohnDeereBoundaries,
} from './mappers';

// =============================================================================
// Provider Adapters & Registry
// =============================================================================

// Registry for getting/registering provider adapters
export {
  getFieldAdapter,
  getBoundaryAdapter,
  registerFieldAdapter,
  registerBoundaryAdapter,
  getRegisteredProviders,
  isProviderFullySupported,
} from './providers';

// Provider adapter types
export type {
  ProviderType,
  FieldAdapter,
  BoundaryAdapter,
  ListFieldsAdapterOptions,
  GetFieldAdapterOptions,
  ListBoundariesAdapterOptions,
  GetBoundaryAdapterOptions,
} from './providers';

// =============================================================================
// John Deere Operations Center (Provider-specific)
// =============================================================================

export { JohnDeereOAuth, createJohnDeereClient } from './providers/john-deere';
export type { JohnDeereClient } from './providers/john-deere';

// John Deere adapters (for direct use or testing)
export {
  JohnDeereFieldAdapter,
  johnDeereFieldAdapter,
  JohnDeereBoundaryAdapter,
  johnDeereBoundaryAdapter,
} from './providers';

// =============================================================================
// Common Types
// =============================================================================

export type {
  ApiLink,
  PaginatedResponse,
  ApiError,
  OAuthTokenResponse,
  BaseOAuthConfig,
  BaseClientConfig,
} from './types/common';

// =============================================================================
// John Deere Types (Provider-specific)
// =============================================================================

export type {
  JohnDeereOAuthConfig,
  JohnDeereClientConfig,
  JohnDeereScope,
  AuthorizationUrlOptions,
  AuthorizationUrlResult,
  TokenExchangeResult,
  ConnectedOrganizationsResult,
  OrganizationConnectionInfo,
  Organization,
  Field,
  Boundary,
  GeoJSONMultiPolygon,
  Operation,
  ListBoundariesOptions,
  ListFieldsOptions,
  JohnDeereApiError,
} from './types/john-deere';

// John Deere constants and error class
export {
  JD_OAUTH_ENDPOINTS,
  JD_API_BASE_URLS,
  JohnDeereError,
} from './types/john-deere';
