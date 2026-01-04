/**
 * Drizzle ORM Schema for Platform Integrations
 * 
 * Provider-agnostic schema supporting multiple ag data providers.

 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  doublePrecision,
  integer,
  index,
  uniqueIndex,
  pgEnum,
  customType,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// POSTGIS CUSTOM TYPE
// ============================================================================

/**
 * PostGIS geometry type for storing spatial data.
 * Stores as native PostGIS geometry, accepts/returns GeoJSON.
 * 
 * Requires PostGIS extension: CREATE EXTENSION IF NOT EXISTS postgis;
 */
export const geometry = customType<{
  data: GeoJSON.Geometry;
  driverData: string;
}>({
  dataType() {
    return 'geometry(Geometry, 4326)';
  },
  toDriver(value: GeoJSON.Geometry): string {
    return `ST_GeomFromGeoJSON('${JSON.stringify(value)}')`;
  },
  fromDriver(value: string): GeoJSON.Geometry {
    // PostGIS returns geometry as WKB hex by default
    // When selecting, use ST_AsGeoJSON to get GeoJSON
    return JSON.parse(value) as GeoJSON.Geometry;
  },
});

/**
 * GeoJSON type definitions for TypeScript
 */
export namespace GeoJSON {
  export interface Point {
    type: 'Point';
    coordinates: [number, number];
  }
  
  export interface MultiPoint {
    type: 'MultiPoint';
    coordinates: [number, number][];
  }
  
  export interface LineString {
    type: 'LineString';
    coordinates: [number, number][];
  }
  
  export interface MultiLineString {
    type: 'MultiLineString';
    coordinates: [number, number][][];
  }
  
  export interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][];
  }
  
  export interface MultiPolygon {
    type: 'MultiPolygon';
    coordinates: [number, number][][][];
  }
  
  export type Geometry = 
    | Point 
    | MultiPoint 
    | LineString 
    | MultiLineString 
    | Polygon 
    | MultiPolygon;
}

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Supported data providers
 */
export const providerEnum = pgEnum('provider', [
  'john_deere',
  'climate_fieldview',
  'cnhi',
  'trimble',
  'raven',
  'ag_leader',
  'other',
]);

/**
 * Sync status between our DB and the provider

 */
export const syncStatusEnum = pgEnum('sync_status', [
  'synced',              // Matches provider exactly
  'outdated',            // Provider has newer data
  'deleted_on_provider', // Deleted at provider, kept locally
  'local_only',          // Created locally, not synced to provider
  'pending_sync',        // Waiting to be pushed to provider
]);

/**
 * Boundary validity status

 */
export const geometryValidityEnum = pgEnum('geometry_validity', [
  'valid',
  'self_intersection',
  'ring_self_intersection',
  'hole_outside_shell',
  'nested_holes',
  'nested_shells',
  'disconnected_interior',
  'duplicate_rings',
  'too_few_points',
  'invalid_coordinate',
  'ring_not_closed',
  'repeated_point',
  'unknown_invalid',
]);

/**
 * Record status (active/archived)
 */
export const recordStatusEnum = pgEnum('record_status', [
  'active',
  'archived',
]);

// ============================================================================
// OAUTH / PROVIDER CONNECTIONS
// ============================================================================

/**
 * Provider connections store OAuth tokens and connection state per user.
 * One user can have connections to multiple providers.
 */
export const providerConnections = pgTable(
  'provider_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    /** Reference to your app's user (external user ID) */
    userId: text('user_id').notNull(),
    
    /** Which provider this connection is for */
    provider: providerEnum('provider').notNull(),
    
    /** OAuth refresh token (encrypted at rest recommended) */
    refreshToken: text('refresh_token').notNull(),
    
    /** OAuth access token (optional - can regenerate from refresh) */
    accessToken: text('access_token'),
    
    /** Access token expiry timestamp */
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    
    /** Scopes granted for this connection */
    scopes: text('scopes').array(),
    
    /** Provider's user ID (if available) */
    providerUserId: text('provider_user_id'),
    
    /** Connection is active and usable */
    isActive: boolean('is_active').default(true).notNull(),
    
    /** Last successful token refresh */
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }),
    
    /** Last sync attempt */
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    
    /** Error from last failed operation */
    lastError: text('last_error'),
    
    /** Additional provider-specific metadata */
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('provider_connections_user_provider_idx').on(table.userId, table.provider),
    index('provider_connections_user_idx').on(table.userId),
  ]
);

// ============================================================================
// ORGANIZATIONS
// ============================================================================

/**
 * Organizations from providers (e.g., John Deere orgs).
 * Users may have access to multiple orgs per provider.
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    /** Reference to the provider connection */
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    
    /** Provider's organization ID */
    providerOrgId: text('provider_org_id').notNull(),
    
    /** Organization name */
    name: text('name').notNull(),
    
    /** Organization type (e.g., "customer", "dealer") */
    type: text('type'),
    
    /** User is a member of this org */
    isMember: boolean('is_member').default(true),
    
    /** Org connection completed (JD-specific: connections flow) */
    connectionCompleted: boolean('connection_completed').default(false),
    
    /** Sync status */
    syncStatus: syncStatusEnum('sync_status').default('synced'),
    
    /** Additional metadata */
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organizations_connection_provider_org_idx').on(
      table.connectionId,
      table.providerOrgId
    ),
    index('organizations_connection_idx').on(table.connectionId),
  ]
);

// ============================================================================
// GROWERS (Optional hierarchy level)
// ============================================================================

/**
 * Growers represent the top-level entity in some provider hierarchies.
 * Not all providers use this (John Deere uses Organizations → Farms → Fields).
 */
export const growers = pgTable(
  'growers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    /** Reference to organization (if applicable) */
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' }),
    
    /** Reference to provider connection */
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    
    /** Provider's grower ID */
    providerGrowerId: text('provider_grower_id'),
    
    /** Grower name */
    name: text('name').notNull(),
    
    /** Sync status */
    syncStatus: syncStatusEnum('sync_status').default('synced'),
    
    /** Additional metadata */
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('growers_organization_idx').on(table.organizationId),
    index('growers_connection_idx').on(table.connectionId),
  ]
);

// ============================================================================
// FARMS
// ============================================================================

/**
 * Farms are containers for fields.
 * In John Deere: Organization → Farm → Field
 */
export const farms = pgTable(
  'farms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    /** Reference to organization */
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' }),
    
    /** Reference to grower (if using grower hierarchy) */
    growerId: uuid('grower_id')
      .references(() => growers.id, { onDelete: 'set null' }),
    
    /** Reference to provider connection */
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    
    /** Provider's farm ID */
    providerFarmId: text('provider_farm_id'),
    
    /** Farm name */
    name: text('name').notNull(),
    
    /** Record status */
    status: recordStatusEnum('status').default('active'),
    
    /** Sync status */
    syncStatus: syncStatusEnum('sync_status').default('synced'),
    
    /** Additional metadata */
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('farms_organization_idx').on(table.organizationId),
    index('farms_grower_idx').on(table.growerId),
    index('farms_connection_idx').on(table.connectionId),
    uniqueIndex('farms_connection_provider_farm_idx').on(
      table.connectionId,
      table.providerFarmId
    ),
  ]
);

// ============================================================================
// FIELDS
// ============================================================================

/**
 * Fields represent agricultural land units.
 * This is the core entity that boundaries are attached to.
 */
export const fields = pgTable(
  'fields',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    /** Reference to farm */
    farmId: uuid('farm_id')
      .references(() => farms.id, { onDelete: 'set null' }),
    
    /** Reference to organization */
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' }),
    
    /** Reference to provider connection */
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    
    /** Provider's field ID */
    providerFieldId: text('provider_field_id'),
    
    /** Field name */
    name: text('name').notNull(),
    
    /** Calculated area (from active boundary) */
    area: doublePrecision('area'),
    
    /** Area unit (ha, ac) */
    areaUnit: text('area_unit').default('ha'),
    
    /** Record status */
    status: recordStatusEnum('status').default('active'),
    
    /** Sync status with provider */
    syncStatus: syncStatusEnum('sync_status').default('synced'),
    
    /** Reference to the currently active boundary */
    activeBoundaryId: uuid('active_boundary_id'),
    
    /** Field type (ORIGINAL, MERGED, etc. - Leaf concept) */
    fieldType: text('field_type').default('original'),
    
    /** Additional metadata */
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('fields_farm_idx').on(table.farmId),
    index('fields_organization_idx').on(table.organizationId),
    index('fields_connection_idx').on(table.connectionId),
    index('fields_status_idx').on(table.status),
    uniqueIndex('fields_connection_provider_field_idx').on(
      table.connectionId,
      table.providerFieldId
    ),
  ]
);

// ============================================================================
// BOUNDARIES
// ============================================================================

/**
 * Boundaries store the geometry of fields using PostGIS.
 * A field can have multiple boundaries (history), but only one active.
 * 
 * Geometry is stored as native PostGIS geometry (SRID 4326 / WGS84).
 * Provider-specific formats are converted to GeoJSON on import.
 * 
 * Requires: CREATE EXTENSION IF NOT EXISTS postgis;
 */
export const boundaries = pgTable(
  'boundaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    /** Reference to field */
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),
    
    /** Provider's boundary ID */
    providerBoundaryId: text('provider_boundary_id'),
    
    /** Boundary name (optional) */
    name: text('name'),
    
    /**
     * PostGIS geometry column (SRID 4326 / WGS84)
     * 
     * Stored as native PostGIS geometry for spatial queries.
     * Use ST_AsGeoJSON(geom) to export as GeoJSON.
     * Use ST_GeomFromGeoJSON(json) to import from GeoJSON.
     * 
     * Example GeoJSON input:
     * {
     *   "type": "MultiPolygon",
     *   "coordinates": [[[[lon, lat], [lon, lat], ...]]]
     * }
     */
    geom: geometry('geom').notNull(),
    
    /**
     * GeoJSON representation (denormalized for API convenience)
     * Automatically kept in sync with geom column via trigger or application logic.
     */
    geojson: jsonb('geojson'),
    
    /** Total area in specified unit (computed from geometry) */
    area: doublePrecision('area'),
    
    /** Workable area (total minus exclusions/interior rings) */
    workableArea: doublePrecision('workable_area'),
    
    /** Area unit */
    areaUnit: text('area_unit').default('ha'),
    
    /** Is this the active boundary for the field */
    isActive: boolean('is_active').default(false).notNull(),
    
    /** Record status */
    status: recordStatusEnum('status').default('active'),
    
    /** Geometry validity status (from ST_IsValidReason) */
    validity: geometryValidityEnum('validity').default('valid'),
    
    /** If geometry was auto-fixed, store the fix status */
    fixStatus: text('fix_status'),
    
    /**
     * Sync status with provider
     * - synced: Matches provider exactly
     * - outdated: Provider has updated this boundary
     * - deleted_on_provider: Boundary deleted at provider
     */
    syncStatus: syncStatusEnum('sync_status').default('synced'),
    
    /** Provider's active/inactive status (mirrors provider state) */
    providerStatus: text('provider_status'),
    
    /** Source type (HandDrawn, MachineMeasured, Imported, etc.) */
    sourceType: text('source_type'),
    
    /** Signal type used (RTK, SF1, SF2, WAAS, etc.) */
    signalType: text('signal_type'),
    
    /** Is the field irrigated */
    irrigated: boolean('irrigated'),
    
    /** Provider timestamps */
    providerCreatedAt: timestamp('provider_created_at', { withTimezone: true }),
    providerModifiedAt: timestamp('provider_modified_at', { withTimezone: true }),
    
    /** Additional metadata */
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('boundaries_field_idx').on(table.fieldId),
    index('boundaries_active_idx').on(table.fieldId, table.isActive),
    index('boundaries_status_idx').on(table.status),
    index('boundaries_sync_status_idx').on(table.syncStatus),
    uniqueIndex('boundaries_field_provider_boundary_idx').on(
      table.fieldId,
      table.providerBoundaryId
    ),
    // PostGIS spatial index using GiST
    // Note: Drizzle doesn't have native GiST support, add via raw SQL migration:
    // CREATE INDEX boundaries_geom_gist_idx ON boundaries USING GIST (geom);
  ]
);

// ============================================================================
// SYNC LOG
// ============================================================================

/**
 * Sync log tracks data synchronization events for debugging and auditing.
 */
export const syncLogs = pgTable(
  'sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    /** Reference to provider connection */
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => providerConnections.id, { onDelete: 'cascade' }),
    
    /** Entity type being synced */
    entityType: text('entity_type').notNull(), // 'organization', 'farm', 'field', 'boundary'
    
    /** Entity ID */
    entityId: uuid('entity_id'),
    
    /** Sync direction */
    direction: text('direction').notNull(), // 'pull', 'push'
    
    /** Sync result */
    status: text('status').notNull(), // 'success', 'failed', 'partial'
    
    /** Number of records processed */
    recordsProcessed: integer('records_processed').default(0),
    
    /** Number of records created */
    recordsCreated: integer('records_created').default(0),
    
    /** Number of records updated */
    recordsUpdated: integer('records_updated').default(0),
    
    /** Number of records failed */
    recordsFailed: integer('records_failed').default(0),
    
    /** Error message if failed */
    errorMessage: text('error_message'),
    
    /** Detailed error info */
    errorDetails: jsonb('error_details'),
    
    /** Duration in milliseconds */
    durationMs: integer('duration_ms'),
    
    /** Sync metadata */
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sync_logs_connection_idx').on(table.connectionId),
    index('sync_logs_entity_idx').on(table.entityType, table.entityId),
    index('sync_logs_created_at_idx').on(table.createdAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const providerConnectionsRelations = relations(providerConnections, ({ many }) => ({
  organizations: many(organizations),
  growers: many(growers),
  farms: many(farms),
  fields: many(fields),
  syncLogs: many(syncLogs),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  connection: one(providerConnections, {
    fields: [organizations.connectionId],
    references: [providerConnections.id],
  }),
  growers: many(growers),
  farms: many(farms),
  fields: many(fields),
}));

export const growersRelations = relations(growers, ({ one, many }) => ({
  connection: one(providerConnections, {
    fields: [growers.connectionId],
    references: [providerConnections.id],
  }),
  organization: one(organizations, {
    fields: [growers.organizationId],
    references: [organizations.id],
  }),
  farms: many(farms),
}));

export const farmsRelations = relations(farms, ({ one, many }) => ({
  connection: one(providerConnections, {
    fields: [farms.connectionId],
    references: [providerConnections.id],
  }),
  organization: one(organizations, {
    fields: [farms.organizationId],
    references: [organizations.id],
  }),
  grower: one(growers, {
    fields: [farms.growerId],
    references: [growers.id],
  }),
  fields: many(fields),
}));

export const fieldsRelations = relations(fields, ({ one, many }) => ({
  connection: one(providerConnections, {
    fields: [fields.connectionId],
    references: [providerConnections.id],
  }),
  organization: one(organizations, {
    fields: [fields.organizationId],
    references: [organizations.id],
  }),
  farm: one(farms, {
    fields: [fields.farmId],
    references: [farms.id],
  }),
  boundaries: many(boundaries),
  activeBoundary: one(boundaries, {
    fields: [fields.activeBoundaryId],
    references: [boundaries.id],
  }),
}));

export const boundariesRelations = relations(boundaries, ({ one }) => ({
  field: one(fields, {
    fields: [boundaries.fieldId],
    references: [fields.id],
  }),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  connection: one(providerConnections, {
    fields: [syncLogs.connectionId],
    references: [providerConnections.id],
  }),
}));

