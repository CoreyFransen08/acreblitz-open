/**
 * Service Layer Exports
 * 
 * Provider-agnostic service functions for field and boundary operations.
 */

// Types
export type {
  // Provider
  Provider,
  ProviderContext,
  
  // Pagination
  PaginationOptions,
  PaginationMeta,
  PaginatedResult,
  
  // Geometry
  GeometryFormat,
  GeometryOptions,
  
  // Units
  AreaUnit,
  UnitOptions,
  AreaMeasurement,
  
  // Records
  RecordStatus,
  
  // Unified types
  UnifiedField,
  UnifiedBoundary,
  GeoJSONGeometry,
  GeoJSONPoint,
  GeoJSONPolygon,
  GeoJSONMultiPolygon,
  
  // Service params
  BaseServiceParams,
  ListFieldsParams,
  GetFieldParams,
  ListBoundariesParams,
  GetBoundaryParams,
  
  // Mapper options
  MapperOptions,
} from './types';

// Constants
export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_AREA_UNIT,
  DEFAULT_GEOMETRY_FORMAT,
} from './types';

// Field Service
export { listFields, getField } from './field-service';

// Boundary Service
export { listBoundaries, getBoundary } from './boundary-service';

