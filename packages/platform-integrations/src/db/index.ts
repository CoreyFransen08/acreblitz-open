/**
 * Database Schema Exports
 * 
 * Drizzle ORM schema for platform integrations.
 * Provider-agnostic design supporting multiple ag data providers.
 * 
 * Requires PostGIS extension for spatial queries:
 * CREATE EXTENSION IF NOT EXISTS postgis;
 */

export {
  // PostGIS custom type
  geometry,
  
  // Enums
  providerEnum,
  syncStatusEnum,
  geometryValidityEnum,
  recordStatusEnum,
  
  // Tables
  providerConnections,
  organizations,
  growers,
  farms,
  fields,
  boundaries,
  syncLogs,
  
  // Relations
  providerConnectionsRelations,
  organizationsRelations,
  growersRelations,
  farmsRelations,
  fieldsRelations,
  boundariesRelations,
  syncLogsRelations,
} from './schema';

// Re-export types for convenience
export type { GeoJSON } from './schema';

// Inferred table types can be generated with:
// export type Field = typeof fields.$inferSelect;
// export type NewField = typeof fields.$inferInsert;

