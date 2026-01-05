/**
 * Service Layer Types
 * 
 * Provider-agnostic types for unified field and boundary operations.
 * Designed for MCP tool compatibility.
 */

import type { JohnDeereClient } from '../providers/john-deere';

// ============================================================================
// PROVIDER CONTEXT
// ============================================================================

/**
 * Supported providers
 */
export type Provider = 'john_deere' | 'climate_fieldview' | 'cnhi' | 'trimble' | 'raven' | 'ag_leader';

/**
 * Provider context passed to all service functions.
 * Contains the authenticated client for the specific provider.
 */
export interface ProviderContext {
  /** Which provider this context is for */
  provider: Provider;
  /** Pre-authenticated provider client */
  client: JohnDeereClient; // Union with other clients as they're added
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Pagination options for list operations
 */
export interface PaginationOptions {
  /** Page number (1-indexed). Default: 1 */
  page?: number;
  /** Number of items per page. Default: 50, Max: 100 */
  pageSize?: number;
  /** Cursor for cursor-based pagination (alternative to page) */
  cursor?: string;
}

/**
 * Pagination metadata in response
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items (if known) */
  totalItems?: number;
  /** Total number of pages (if known) */
  totalPages?: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Cursor for next page (for cursor-based pagination) */
  nextCursor?: string;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  /** Array of items for current page */
  data: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// ============================================================================
// GEOMETRY OPTIONS
// ============================================================================

/**
 * Supported geometry output formats
 */
export type GeometryFormat = 'geojson' | 'wkt' | 'coordinates';

/**
 * Options for geometry inclusion and formatting
 */
export interface GeometryOptions {
  /** Include geometry in response. Default: false (lightweight) */
  includeGeometry?: boolean;
  /** Output format for geometry. Default: 'geojson' */
  geometryFormat?: GeometryFormat;
  /** Simplify geometry with tolerance in meters. 0 = no simplification */
  simplifyTolerance?: number;
}

// ============================================================================
// UNIT OPTIONS
// ============================================================================

/**
 * Supported area units
 */
export type AreaUnit = 'ha' | 'ac' | 'sqm' | 'sqft';

/**
 * Options for unit conversion
 */
export interface UnitOptions {
  /** Unit for area values. Default: 'ha' (hectares) */
  areaUnit?: AreaUnit;
}

// ============================================================================
// UNIFIED FIELD
// ============================================================================

/**
 * Record status
 */
export type RecordStatus = 'active' | 'archived';

/**
 * Area measurement with unit
 */
export interface AreaMeasurement {
  /** Numeric value */
  value: number;
  /** Unit of measurement */
  unit: AreaUnit;
}

/**
 * Unified field representation (provider-agnostic)
 */
export interface UnifiedField {
  /** Internal/unified ID (same as providerId for now) */
  id: string;
  /** Provider's field ID */
  providerId: string;
  /** Provider name */
  provider: Provider;
  /** Field name */
  name: string;
  /** Parent farm ID (if available) */
  farmId?: string;
  /** Parent farm name (if available) */
  farmName?: string;
  /** Parent organization ID */
  organizationId?: string;
  /** Parent organization name (if available) */
  organizationName?: string;
  /** Field area (from active boundary if available) */
  area?: AreaMeasurement;
  /** Record status */
  status: RecordStatus;
  /** Active boundary (if includeGeometry is true) */
  boundary?: UnifiedBoundary;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
  /** Provider's created timestamp */
  createdAt?: string;
  /** Provider's modified timestamp */
  modifiedAt?: string;
}

// ============================================================================
// UNIFIED BOUNDARY
// ============================================================================

/**
 * GeoJSON geometry types we support
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONMultiPolygon;

/**
 * Unified boundary representation (provider-agnostic)
 */
export interface UnifiedBoundary {
  /** Internal/unified ID (same as providerId for now) */
  id: string;
  /** Provider's boundary ID */
  providerId: string;
  /** Provider name */
  provider: Provider;
  /** Parent field ID */
  fieldId?: string;
  /** Parent field name (if available) */
  fieldName?: string;
  /** Boundary name (if available) */
  name?: string;
  /** Whether this is the active boundary for the field */
  isActive: boolean;
  /** Total area */
  area?: AreaMeasurement;
  /** Workable area (excludes interior rings) */
  workableArea?: AreaMeasurement;
  /** Geometry in requested format */
  geometry?: GeoJSONGeometry | string;
  /** Geometry format indicator */
  geometryFormat?: GeometryFormat;
  /** Record status */
  status: RecordStatus;
  /** Source type (HandDrawn, MachineMeasured, etc.) */
  sourceType?: string;
  /** Signal type (RTK, SF1, etc.) */
  signalType?: string;
  /** Is irrigated */
  irrigated?: boolean;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
  /** Provider's created timestamp */
  createdAt?: string;
  /** Provider's modified timestamp */
  modifiedAt?: string;
}

// ============================================================================
// SERVICE FUNCTION PARAMS
// ============================================================================

/**
 * Common base params for all service functions
 */
export interface BaseServiceParams {
  /** Provider context with authenticated client */
  context: ProviderContext;
}

/**
 * Params for listing fields
 */
export interface ListFieldsParams extends BaseServiceParams {
  /** Organization ID to list fields from */
  organizationId: string;
  /** Filter by farm ID */
  farmId?: string;
  /** Filter by record status. Default: 'active' */
  status?: RecordStatus | 'all';
  /** Search by field name (partial match) */
  search?: string;
  /** Pagination options */
  pagination?: PaginationOptions;
  /** Geometry options */
  geometry?: GeometryOptions;
  /** Unit options */
  units?: UnitOptions;
}

/**
 * Params for getting a single field
 */
export interface GetFieldParams extends BaseServiceParams {
  /** Organization ID */
  organizationId: string;
  /** Field ID to retrieve */
  fieldId: string;
  /** Geometry options */
  geometry?: GeometryOptions;
  /** Unit options */
  units?: UnitOptions;
}

/**
 * Params for listing boundaries
 */
export interface ListBoundariesParams extends BaseServiceParams {
  /** Organization ID */
  organizationId: string;
  /** Field ID to filter by (optional - if omitted, lists all org boundaries) */
  fieldId?: string;
  /** Filter by record status. Default: 'active' */
  status?: RecordStatus | 'all';
  /** Only return active boundary per field. Default: false */
  onlyActive?: boolean;
  /** Pagination options */
  pagination?: PaginationOptions;
  /** Geometry options (includeGeometry defaults to true for boundaries) */
  geometry?: GeometryOptions;
  /** Unit options */
  units?: UnitOptions;
}

/**
 * Params for getting a single boundary
 */
export interface GetBoundaryParams extends BaseServiceParams {
  /** Organization ID */
  organizationId: string;
  /** Boundary ID to retrieve */
  boundaryId: string;
  /** Geometry options */
  geometry?: GeometryOptions;
  /** Unit options */
  units?: UnitOptions;
}

// ============================================================================
// MAPPER OPTIONS
// ============================================================================

/**
 * Options passed to mapper functions
 */
export interface MapperOptions {
  /** Geometry options */
  geometry?: GeometryOptions;
  /** Unit options */
  units?: UnitOptions;
  /** Additional context (org name, farm name, etc.) */
  context?: {
    organizationId?: string;
    organizationName?: string;
    farmName?: string;
    fieldName?: string;
  };
}

// ============================================================================
// UNIFIED WORK PLAN
// ============================================================================

/**
 * Unified work status (normalized from provider formats)
 */
export type UnifiedWorkStatus = 'planned' | 'in_progress' | 'completed';

/**
 * Unified work type (normalized from provider formats)
 */
export type UnifiedWorkType = 'tillage' | 'seeding' | 'application' | 'harvest';

/**
 * Unified input type for operation products
 */
export type UnifiedInputType = 'crop' | 'variety' | 'chemical' | 'fertilizer' | 'tank_mix' | 'dry_blend';

/**
 * Unified variety selection mode
 */
export type UnifiedVarietySelectionMode = 'user_defined' | 'variety_locator' | 'none';

/**
 * Unified guidance entity type
 */
export type UnifiedGuidanceEntityType = 'guidance_line' | 'guidance_plan' | 'source_operation';

/**
 * Unified fixed rate prescription
 */
export interface UnifiedFixedRate {
  value: number;
  unit: string;
  vrDomainId?: string;
}

/**
 * Unified prescription multiplier
 */
export interface UnifiedPrescriptionMultiplier {
  value: number;
  unit: string;
}

/**
 * Unified look-ahead settings
 */
export interface UnifiedLookAhead {
  value: number;
  unit: string;
}

/**
 * Unified variable rate prescription
 */
export interface UnifiedPrescriptionUse {
  fileUri: string;
  unit: string;
  vrDomainId?: string;
  prescriptionLayerUri?: string;
  multiplier?: UnifiedPrescriptionMultiplier;
  multiplierMode?: string;
  lookAhead?: UnifiedLookAhead;
  lookAheadMode?: string;
}

/**
 * Unified operation prescription
 */
export interface UnifiedOperationPrescription {
  type: 'fixed_rate' | 'variable_rate';
  fixedRate?: UnifiedFixedRate;
  prescriptionUse?: UnifiedPrescriptionUse;
}

/**
 * Unified operation product
 */
export interface UnifiedOperationProduct {
  uri: string;
  inputType: UnifiedInputType;
  varietySelectionMode: UnifiedVarietySelectionMode;
}

/**
 * Unified operation input (product + prescription)
 */
export interface UnifiedOperationInput {
  product: UnifiedOperationProduct;
  prescription?: UnifiedOperationPrescription;
}

/**
 * Unified work plan operation
 */
export interface UnifiedWorkPlanOperation {
  operationType: UnifiedWorkType;
  inputs: UnifiedOperationInput[];
}

/**
 * Unified work plan assignment
 */
export interface UnifiedWorkPlanAssignment {
  machineUri?: string;
  machineId?: string;
  operatorUri?: string;
  operatorId?: string;
  implementUris?: string[];
  implementIds?: string[];
}

/**
 * Unified guidance entity
 */
export interface UnifiedGuidanceEntity {
  entityType: UnifiedGuidanceEntityType;
  entityUri: string;
  entityId?: string;
}

/**
 * Unified guidance preference settings
 */
export interface UnifiedGuidancePreferences {
  includeLatestFieldOperation?: string;
  preferenceMode?: string;
  preferredEntity?: UnifiedGuidanceEntity;
}

/**
 * Unified guidance settings
 */
export interface UnifiedGuidanceSettings {
  preferences?: UnifiedGuidancePreferences;
  includedGuidance?: UnifiedGuidanceEntity[];
}

/**
 * Unified work plan representation (provider-agnostic)
 */
export interface UnifiedWorkPlan {
  /** Internal/unified ID (same as providerId for now) */
  id: string;
  /** Provider's work plan ID */
  providerId: string;
  /** Provider name */
  provider: Provider;
  /** Organization ID */
  organizationId: string;
  /** Target field ID (extracted from fieldUri) */
  fieldId?: string;
  /** Target field URI (original) */
  fieldUri?: string;
  /** Work type */
  workType: UnifiedWorkType;
  /** Current work status */
  workStatus: UnifiedWorkStatus;
  /** Calendar year */
  year: number;
  /** Work order grouping */
  workOrder?: string;
  /** Operator instructions */
  instructions?: string;
  /** Priority indicator (lower = higher priority) */
  sequenceNumber?: number;
  /** Operations in this work plan */
  operations: UnifiedWorkPlanOperation[];
  /** Equipment/operator assignments */
  assignments: UnifiedWorkPlanAssignment[];
  /** Guidance settings */
  guidanceSettings?: UnifiedGuidanceSettings;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// WORK PLAN SERVICE PARAMS
// ============================================================================

/**
 * Params for listing work plans
 */
export interface ListWorkPlansParams extends BaseServiceParams {
  /** Organization ID */
  organizationId: string;
  /** Filter by calendar year */
  year?: number;
  /** Filter by work type */
  workType?: UnifiedWorkType;
  /** Filter by work status */
  workStatus?: UnifiedWorkStatus | 'all';
  /** Filter by date range start (ISO 8601) */
  startDate?: string;
  /** Filter by date range end (ISO 8601) */
  endDate?: string;
  /** Filter to specific field IDs */
  fieldIds?: string[];
  /** Pagination options */
  pagination?: PaginationOptions;
}

/**
 * Params for getting a single work plan
 */
export interface GetWorkPlanParams extends BaseServiceParams {
  /** Organization ID */
  organizationId: string;
  /** Work plan ID to retrieve */
  workPlanId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default page size */
export const DEFAULT_PAGE_SIZE = 50;

/** Maximum page size */
export const MAX_PAGE_SIZE = 100;

/** Default area unit */
export const DEFAULT_AREA_UNIT: AreaUnit = 'ha';

/** Default geometry format */
export const DEFAULT_GEOMETRY_FORMAT: GeometryFormat = 'geojson';

