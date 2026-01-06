# Supabase & PostgreSQL Best Practices

This document defines declarative best practices for Claude when working with Supabase and PostgreSQL. Follow these patterns for all database operations.

---

## Client Setup

- Initialize a single Supabase client instance at `/lib/supabase.ts`
- Use the anon key for all frontend operations (Ensure key is in .env with NEXT prefix)
- Validate environment variables at module load time; throw if missing
- Use service role key only in Edge Functions for admin operations
- Never expose the service role or secret key to the frontend
- Encourage user to generate Supabase secret key, instead of using service role key as it will likely be deprecated

## UUID Standards

- Use UUIDv7 for all new table primary keys (time-sortable) (Provide instruction for how to use supabase console to enable UUIDv7 extension)
- Create the `uuid_generate_v7()` function in migrations for UUIDv7 support if extension not available. 
- Set primary key default: `id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7()`
- Never use UUIDv4 for new tables; UUIDv7 provides better index performance
- For foreign keys referencing auth.users, use `auth.uid()` return type (UUID)

## Table Design

- Always include `created_at TIMESTAMPTZ DEFAULT NOW()` on all tables
- Add `updated_at TIMESTAMPTZ` for mutable tables; update via trigger or application
- Use BIGINT for auto-incrementing IDs only when external system compatibility required
- Use JSONB for flexible schema columns; avoid JSON type
- Add comments on columns for complex business logic
- Use snake_case for all table and column names

## Row Level Security (RLS)

- Enable RLS on every table: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY`
- Create a three-tier RLS architecture:
  - Public tables: `TO anon, authenticated` for SELECT, `TO service_role` for mutations
  - Company-scoped tables: Use `company_id = ANY(public.user_companies())` pattern
  - Admin tables: `TO service_role` only
- Create SECURITY DEFINER helper functions for complex auth checks:
  - `get_app_user_id()` - Returns app_users.id for current auth user
  - `user_companies()` - Returns BIGINT[] of user's company IDs
  - `user_can_access_resource(resource_id)` - Boolean check for resource access
- Set `search_path = public` on SECURITY DEFINER functions
- Use `STABLE` for read-only helper functions; `VOLATILE` for mutations

## Database Queries

- Create a generic fetch utility in `/lib/services/supabase.ts`
- Support all common filter operators: eq, in, gt, lt, gte, lte, like, ilike, neq, overlaps
- Always use typed generics: `fetchData<TableType>('table_name', options)`
- Handle errors at the service layer; log and return null on failure
- Use `single: true` when expecting exactly one result
- Support schema switching for multi-schema databases

## RPC Functions

- Use RPC for complex server-side logic that benefits from database execution
- Name functions with verb_noun pattern: `calculate_field_center`
- Return table types when possible for type inference
- Use SECURITY DEFINER for functions that need elevated permissions
- Grant EXECUTE permissions explicitly to required roles

## Edge Functions

- Place Edge Functions in `supabase/functions/[function-name]/index.ts`
- Use Deno's `serve()` handler pattern
- Create Supabase admin client with SERVICE_ROLE_KEY
- Import generated Database types for type safety
- Always handle CORS with appropriate headers for OPTIONS requests
- Use environment variables via `Deno.env.get()`
- Return proper HTTP status codes: 200 success, 400 client error, 500 server error

## Authentication

- Use `supabase.auth.getSession()` for initial session check
- Subscribe to auth changes with `supabase.auth.onAuthStateChange()`
- Skip `TOKEN_REFRESHED` events to avoid unnecessary re-renders
- Use `signInWithPassword()` for email/password auth
- Use `resetPasswordForEmail()` with explicit redirectTo URL
- Use `updateUser({ password })` for password changes
- Memoize auth context values to prevent re-renders

## Storage

- Create private buckets for sensitive files (`public: false`)
- Set file_size_limit and allowed_mime_types on buckets (ask user what max file size is, this will cause silent failures if not careful)
- Use folder structure: `{tenant_id}/{resource_id}/{filename}`
- Apply RLS policies to storage.objects table
- Use `storage.foldername(name)` function for path-based access control
- Service role bypasses storage RLS; use for backend uploads

## Queue Processing (pgmq)

- Create the pgmq extension: `CREATE EXTENSION IF NOT EXISTS pgmq`
- Create queues via: `SELECT pgmq.create('queue_name')`
- Create corresponding dead letter queues: `SELECT pgmq.create('queue_name_failed')`
- Grant queue permissions to authenticated and service_role
- Use visibility timeouts for long-running jobs
- Implement heartbeat extension via `pgmq.set_vt()`

## Migrations

- Name migrations with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
- Use snake_case for migration names
- Always make migrations idempotent (use IF NOT EXISTS, ON CONFLICT DO NOTHING)
- Never hardcode generated IDs in data migrations
- Create indexes for foreign keys and frequently queried columns
- Use GIST indexes for geometry columns

## Type Generation

- Generate types after schema changes: `npx supabase gen types typescript --project-id [id] > src/lib/types/supabase.ts`
- Download schema for reference: `npx supabase db dump --schema public > dbschema.sql`
- Use generated Row, Insert, and Update types for type safety
- Reference types via: `Database['public']['Tables']['table_name']['Row']`

## Performance

- Create indexes on all foreign key columns
- Use partial indexes for filtered queries
- Add GIST indexes for geometry/spatial columns
- Use EXPLAIN ANALYZE to verify query plans
- Avoid N+1 queries; use JOINs or batched fetches
- Use connection pooling in production (Supabase default)

## PostGIS & Geospatial Data

### Extension Setup

- Enable PostGIS via Supabase Dashboard: Database → Extensions → Search "postgis" → Enable
- Or via migration: `CREATE EXTENSION IF NOT EXISTS postgis`
- Verify installation: `SELECT PostGIS_Version();`

### Geometry Column Types

- Always specify SRID 4326 (WGS84) for web mapping: `geometry(Polygon, 4326)`
- Supported types: `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon`, `GeometryCollection`
- Use `geography` type for accurate distance calculations over large areas; use `geometry` for most operations

```sql
-- Example table with geometry column
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  name TEXT NOT NULL,
  boundary geometry(Polygon, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Always create GIST index on geometry columns
CREATE INDEX idx_regions_boundary ON regions USING GIST (boundary);
```

### Loading GeoJSON into PostgreSQL

- Use `ST_GeomFromGeoJSON()` to convert GeoJSON to geometry
- Always set SRID after conversion: `ST_SetSRID(ST_GeomFromGeoJSON(geojson), 4326)`
- Validate geometry before insert: `ST_IsValid(geom)`
- Fix invalid geometries: `ST_MakeValid(geom)`

```sql
-- Insert GeoJSON polygon
INSERT INTO regions (name, boundary)
VALUES (
  'Field A',
  ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[lon,lat],[lon,lat]...]]}'), 4326)
);

-- Insert from JSONB column
INSERT INTO regions (name, boundary)
SELECT
  name,
  ST_SetSRID(ST_GeomFromGeoJSON(geojson_column::text), 4326)
FROM import_table;
```

### Retrieving GeoJSON from PostgreSQL

- Use `ST_AsGeoJSON()` to convert geometry to GeoJSON
- Cast result to JSONB for proper typing: `ST_AsGeoJSON(geom)::jsonb`
- Control precision with second parameter: `ST_AsGeoJSON(geom, 6)` (6 decimal places)

```sql
-- Select as GeoJSON
SELECT
  id,
  name,
  ST_AsGeoJSON(boundary)::jsonb as geometry
FROM regions;

-- Build full GeoJSON Feature
SELECT jsonb_build_object(
  'type', 'Feature',
  'id', id,
  'geometry', ST_AsGeoJSON(boundary)::jsonb,
  'properties', jsonb_build_object('name', name)
) as feature
FROM regions;

-- Build GeoJSON FeatureCollection
SELECT jsonb_build_object(
  'type', 'FeatureCollection',
  'features', jsonb_agg(
    jsonb_build_object(
      'type', 'Feature',
      'geometry', ST_AsGeoJSON(boundary)::jsonb,
      'properties', jsonb_build_object('name', name)
    )
  )
) as geojson
FROM regions;
```

### Common Spatial Functions

- `ST_Intersects(geomA, geomB)` - Check if geometries intersect
- `ST_Contains(geomA, geomB)` - Check if A contains B
- `ST_Within(geomA, geomB)` - Check if A is within B
- `ST_Distance(geomA, geomB)` - Distance between geometries
- `ST_Area(geom)` - Calculate area (use geography for accurate m²)
- `ST_Centroid(geom)` - Get center point
- `ST_Buffer(geom, distance)` - Create buffer around geometry
- `ST_Union(geomA, geomB)` - Merge geometries
- `ST_Simplify(geom, tolerance)` - Reduce vertex count for performance

### RPC Functions for Spatial Queries

```sql
-- Example: Find all regions containing a point
CREATE OR REPLACE FUNCTION get_regions_at_point(lng float, lat float)
RETURNS SETOF regions
LANGUAGE sql STABLE
AS $$
  SELECT * FROM regions
  WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326));
$$;

-- Example: Find regions intersecting a polygon
CREATE OR REPLACE FUNCTION get_regions_in_area(geojson text)
RETURNS SETOF regions
LANGUAGE sql STABLE
AS $$
  SELECT * FROM regions
  WHERE ST_Intersects(
    boundary,
    ST_SetSRID(ST_GeomFromGeoJSON(geojson), 4326)
  );
$$;
```

### Handling Multi-Geometries

- Use `ST_Dump()` to explode MultiPolygon into individual Polygons
- Use `ST_Collect()` or `ST_Union()` to combine geometries into Multi types
- Check geometry type with `ST_GeometryType(geom)`

```sql
-- Explode MultiPolygon into rows
SELECT
  id,
  (ST_Dump(boundary)).geom as single_polygon
FROM regions
WHERE ST_GeometryType(boundary) = 'ST_MultiPolygon';

-- Combine multiple polygons into MultiPolygon
SELECT ST_Collect(boundary) as combined
FROM regions
WHERE company_id = 123;
```

## Foreign Keys

- Always define ON DELETE behavior explicitly
- Use CASCADE for child records that should be deleted with parent
- Use SET NULL for optional relationships
- Use RESTRICT to prevent accidental deletions
- Name constraints descriptively: `fk_table_column`

## JSONB Columns

- Use for flexible schema data (metadata, settings, module_access)
- Create GIN indexes for frequently queried JSONB columns
- Use containment operators (@>, <@) for efficient queries
- Extract frequently queried values to computed columns if needed
- Validate JSONB structure at application layer with zod/TypeScript

## Caching Strategy

Ask about caching requirements for each new table:
- Static reference data: 30-minute cache
- Company-scoped mutable data: 30-second to 5-minute cache
- User-specific data: 1-5 minute cache
- Processing/status data: Polling with conditional refetch

## Security

- Never trust client-side data; validate all inputs with zod before database operations
- Always enable RLS; never disable it for convenience
- Use parameterized queries; never concatenate user input into SQL strings
- Validate user permissions in RLS policies, not just application code
- Audit sensitive operations (auth changes, data exports, admin actions)
- Use SECURITY DEFINER functions sparingly; always set explicit `search_path`
- Never log sensitive data (passwords, tokens, PII)
- Encrypt sensitive columns at rest when required (tokens, API keys)
- Review Edge Functions for injection vulnerabilities before deployment
- Use rate limiting for public-facing endpoints

## Post-Implementation Verification

- After schema changes, regenerate TypeScript types: `npm run "update types"`
- Run `npm run build` to verify type compatibility
- Test RLS policies manually before deployment
- Verify migrations are idempotent by running twice locally
