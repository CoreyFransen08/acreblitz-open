/**
 * John Deere Operations Center API Types
 */

import type { ApiLink, BaseOAuthConfig, BaseClientConfig } from './common';
import type { JDPolygon } from '../mappers/geometry';

// ============================================================================
// OAuth Configuration
// ============================================================================

/**
 * John Deere OAuth well-known endpoints
 */
export const JD_OAUTH_ENDPOINTS = {
  AUTHORIZATION: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize',
  TOKEN: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
  REVOKE: 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/revoke',
} as const;

/**
 * John Deere API base URLs
 */
export const JD_API_BASE_URLS = {
  PRODUCTION: 'https://api.deere.com/platform',
  SANDBOX: 'https://sandboxapi.deere.com/platform',
} as const;

/**
 * Available OAuth scopes for John Deere API
 */
export type JohnDeereScope =
  | 'openid'
  | 'profile'
  | 'offline_access'
  | 'ag1'   // View Locations
  | 'ag2'   // Analyze Production Data
  | 'ag3'   // Manage Locations & Production Data
  | 'eq1'   // View Equipment
  | 'eq2'   // Edit/Manage Equipment
  | 'org1'  // View Staff, Operators, Partners
  | 'org2'  // Modify Staff, Operators, Partners
  | 'files' // Files API Access
  | 'work1' // View Work and Crop Plans
  | 'work2'; // Manage Work and Crop Plans

/**
 * Configuration for John Deere OAuth
 */
export interface JohnDeereOAuthConfig extends BaseOAuthConfig {
  /** Override the authorization endpoint URL */
  authorizationUrl?: string;
  /** Override the token endpoint URL */
  tokenUrl?: string;
  /** Override the revoke endpoint URL */
  revokeUrl?: string;
  /** Override the API base URL for organization checks */
  apiBaseUrl?: string;
  /**
   * Your application's unique identifier (UUID) from developer.deere.com.
   * Used to construct the connections URL when users need to grant org access.
   * Found in your app settings or in the 'connections' link returned by the API.
   */
  applicationId?: string;
}

/**
 * Options for generating the authorization URL
 */
export interface AuthorizationUrlOptions {
  /** OAuth scopes to request */
  scopes: JohnDeereScope[];
  /** Optional state parameter for CSRF protection (auto-generated if not provided) */
  state?: string;
}

/**
 * Result of generating an authorization URL
 */
export interface AuthorizationUrlResult {
  /** The full authorization URL to redirect the user to */
  url: string;
  /** The state parameter (either provided or auto-generated) */
  state: string;
}

/**
 * Organization info returned after token exchange
 */
export interface OrganizationConnectionInfo {
  /** Organization ID */
  id: string;
  /** Organization name */
  name: string;
  /** Organization type (e.g., "customer") */
  type?: string;
  /** Whether this organization needs the user to complete connection setup */
  needsConnection: boolean;
  /** The connections URL if needsConnection is true */
  connectionsUrl?: string;
}

/**
 * Result of exchanging an authorization code for tokens
 */
export interface TokenExchangeResult {
  /** The access token for API calls */
  accessToken: string;
  /** The refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Time in seconds until the access token expires */
  expiresIn: number;
  /** Granted scopes */
  scope?: string;
  /** List of organizations the user has access to */
  organizations: OrganizationConnectionInfo[];
  /**
   * If any organization needs connection setup, this URL is provided.
   * Redirect the user to this URL to complete org selection.
   */
  connectionsUrl: string | null;
}

/**
 * Result of checking connected organizations after org connection flow
 */
export interface ConnectedOrganizationsResult {
  /** Organizations that are fully connected (have manage_connections link) */
  connectedOrganizations: OrganizationConnectionInfo[];
  /** Organizations that still need connection (have connections link) */
  pendingOrganizations: OrganizationConnectionInfo[];
  /**
   * If there are still pending organizations, this URL is provided.
   * Redirect the user to complete remaining org connections.
   */
  connectionsUrl: string | null;
  /** The refresh token (may be updated if JD issued a new one) */
  refreshToken: string;
}

// ============================================================================
// Client Configuration
// ============================================================================

/**
 * Configuration for creating a John Deere API client
 */
export interface JohnDeereClientConfig extends BaseClientConfig {
  /** Override the API base URL */
  baseUrl?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Organization resource from John Deere API
 */
export interface Organization {
  '@type'?: string;
  /** Organization ID */
  id: string;
  /** Organization name */
  name: string;
  /** Organization type (e.g., "customer", "dealer") */
  type?: string;
  /** Whether the authenticated user is a member */
  member?: boolean;
  /** Whether this is an internal organization */
  internal?: boolean;
  /** HATEOAS links */
  links?: ApiLink[];
}

/**
 * Field resource from John Deere API
 */
export interface Field {
  '@type'?: string;
  /** Field ID */
  id: string;
  /** Field name */
  name: string;
  /** Area of the field (JD uses MeasurementAsDouble format) */
  area?: {
    '@type'?: string;
    valueAsDouble: number;
    unit: string;
  };
  /** Archived status */
  archived?: boolean;
  /** HATEOAS links */
  links?: ApiLink[];
}

// Re-export JDPolygon for convenience
export type { JDPolygon };

/**
 * Boundary resource from John Deere API
 */
export interface Boundary {
  '@type'?: string;
  /** Boundary ID */
  id: string;
  /** Boundary name */
  name?: string;
  /** Area of the boundary */
  area?: {
    '@type'?: string;
    valueAsDouble: number;
    unit: string;
  };
  /** Workable area of the boundary */
  workableArea?: {
    '@type'?: string;
    valueAsDouble: number;
    unit: string;
  };
  /** Whether this is the active boundary */
  active?: boolean;
  /** Archived status */
  archived?: boolean;
  /** Source of the boundary */
  source?: string;
  /** Boundary type */
  sourceType?: string;
  /** Signal type used for boundary creation */
  signalType?: string;
  /** Whether the field is irrigated */
  irrigated?: boolean;
  /** Creation date */
  dateCreated?: string;
  /** Last modified date */
  dateModified?: string;
  /** Creation time (ISO format) */
  createdTime?: string;
  /** Modified time (ISO format) */
  modifiedTime?: string;
  /** 
   * Multipolygon geometry in John Deere native format.
   * Only included when requesting with embed=multipolygons
   */
  multipolygons?: JDPolygon[];
  /** HATEOAS links */
  links?: ApiLink[];
}

/**
 * GeoJSON MultiPolygon geometry
 */
export interface GeoJSONMultiPolygon {
  '@type'?: string;
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

/**
 * Operation resource from John Deere API (planting, harvest, application, etc.)
 */
export interface Operation {
  '@type'?: string;
  /** Operation ID */
  id: string;
  /** Operation type */
  type?: string;
  /** Start time */
  startTime?: string;
  /** End time */
  endTime?: string;
  /** Area covered */
  area?: {
    value: number;
    unit: string;
  };
  /** HATEOAS links */
  links?: ApiLink[];
}

// ============================================================================
// Work Plan Types
// ============================================================================

/**
 * Work type identifiers (John Deere domain IDs)
 */
export type WorkType = 'dtiTillage' | 'dtiSeeding' | 'dtiApplication' | 'dtiHarvest';

/**
 * Work plan status values
 */
export type WorkStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Input type for operation products
 */
export type InputType = 'CROP' | 'VARIETY' | 'CHEMICAL' | 'FERTILIZER' | 'TANK_MIX' | 'DRY_BLEND';

/**
 * Variety selection mode for products
 */
export type VarietySelectionMode = 'USER_DEFINED' | 'USE_VARIETY_LOCATOR' | 'NONE';

/**
 * Guidance entity types
 */
export type GuidanceEntityType = 'GUIDANCE_LINE' | 'GUIDANCE_PLAN' | 'SOURCE_OPERATION';

/**
 * Work type object structure
 */
export interface WorkTypeObject {
  representationDomainId: string;
  instanceDomainId: string;
}

/**
 * Fixed rate prescription
 */
export interface FixedRate {
  valueAsDouble: number;
  unit: string;
  vrDomainId: string;
}

/**
 * Prescription multiplier settings
 */
export interface PrescriptionMultiplier {
  valueAsDouble: number;
  unit: string;
  vrDomainId: string;
}

/**
 * Prescription look-ahead settings
 */
export interface PrescriptionLookAhead {
  valueAsDouble: number;
  unit: string;
  vrDomainId: string;
}

/**
 * Variable rate prescription use
 */
export interface PrescriptionUse {
  fileUri: string;
  unit: string;
  vrDomainId: string;
  prescriptionLayerUri?: string;
  multiplier?: PrescriptionMultiplier;
  multiplierMode?: string;
  lookAhead?: PrescriptionLookAhead;
  lookAheadMode?: string;
}

/**
 * Operation prescription (either fixed rate or variable rate)
 */
export interface OperationPrescription {
  fixedRate?: FixedRate;
  prescriptionUse?: PrescriptionUse;
}

/**
 * Operation product definition
 */
export interface OperationProduct {
  inputUri: string;
  inputType: InputType;
  varietySelectionMode: VarietySelectionMode;
}

/**
 * Operation input (product + prescription)
 */
export interface OperationInput {
  operationProduct: OperationProduct;
  operationPrescription?: OperationPrescription;
}

/**
 * Work plan operation
 */
export interface WorkPlanOperation {
  operationType: WorkTypeObject;
  operationInputs: OperationInput[];
}

/**
 * Work plan equipment assignment
 */
export interface WorkPlanAssignment {
  equipmentMachineUri?: string;
  operatorUri?: string;
  equipmentImplementUris?: string[];
}

/**
 * Guidance entity reference
 */
export interface GuidanceEntity {
  entityType: GuidanceEntityType;
  entityUri: string;
}

/**
 * Guidance preference settings
 */
export interface GuidancePreferenceSettings {
  includeLatestFieldOperation?: string;
  preferenceMode?: string;
  entityType?: GuidanceEntityType;
  entityUri?: string;
}

/**
 * Guidance settings for work plan
 */
export interface GuidanceSettings {
  preferenceSettings?: GuidancePreferenceSettings;
  includeGuidance?: GuidanceEntity[];
}

/**
 * Work plan resource from John Deere API
 */
export interface WorkPlan {
  '@type'?: string;
  /** Work plan ID (ERID - unique within organization) */
  erid: string;
  /** Location where work will be executed */
  location: {
    fieldUri: string;
  };
  /** Work type definition */
  workType: WorkTypeObject;
  /** Calendar year */
  year: number;
  /** Operations in this work plan (1-2 items) */
  operations: WorkPlanOperation[];
  /** Equipment/operator assignments */
  workPlanAssignments: WorkPlanAssignment[];
  /** Guidance configuration */
  guidanceSettings?: GuidanceSettings;
  /** Current work status */
  workStatus: WorkStatus;
  /** Work order grouping */
  workOrder?: string;
  /** Operator instructions */
  instructions?: string;
  /** Priority indicator (lower = higher priority) */
  sequenceNumber?: number;
  /** HATEOAS links */
  links?: ApiLink[];
}

// ============================================================================
// API Request Options
// ============================================================================

/**
 * Options for listing work plans
 */
export interface ListWorkPlansOptions {
  /** Filter by calendar year */
  year?: number;
  /** Filter by work type */
  workType?: WorkType;
  /** Filter by work status */
  workStatus?: WorkStatus | 'ALL';
  /** Filter by date range start (ISO 8601) */
  startDate?: string;
  /** Filter by date range end (ISO 8601) */
  endDate?: string;
  /** Pagination offset */
  pageOffset?: number;
  /** Results per page */
  itemLimit?: number;
  /** Filter to specific work plan ERIDs */
  workPlanErids?: string[];
  /** Filter to specific field IDs */
  fieldIds?: string[];
}

/**
 * Options for listing boundaries
 */
export interface ListBoundariesOptions {
  /** Include additional embedded resources */
  embed?: 'multipolygons';
  /** Filter by record status */
  recordFilter?: 'active' | 'archived' | 'all';
}

/**
 * Options for listing fields
 */
export interface ListFieldsOptions {
  /** Filter by record status */
  recordFilter?: 'active' | 'archived' | 'all';
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * John Deere API error response
 */
export interface JohnDeereApiError {
  /** Error code */
  code?: string;
  /** Error message */
  message?: string;
  /** Additional error details */
  errors?: Array<{
    code?: string;
    message?: string;
  }>;
}

/**
 * Custom error class for John Deere API errors
 */
export class JohnDeereError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: JohnDeereApiError;

  constructor(
    message: string,
    code: string,
    status?: number,
    details?: JohnDeereApiError
  ) {
    super(message);
    this.name = 'JohnDeereError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

