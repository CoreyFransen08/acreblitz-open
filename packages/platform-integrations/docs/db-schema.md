# Database Schema

Provider-agnostic Drizzle ORM schema for storing OAuth tokens and agricultural field data from multiple providers.

Inspired by [Leaf's multi-provider architecture](https://docs.withleaf.io/docs/field_boundary_management_endpoints).

## Installation

```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

## PostGIS Setup

This schema uses PostGIS for storing boundary geometries. Enable the extension:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

After running migrations, add the spatial index:

```sql
CREATE INDEX boundaries_geom_gist_idx ON boundaries USING GIST (geom);
```

## Usage

```typescript
import {
  providerConnections,
  organizations,
  farms,
  fields,
  boundaries,
} from '@acreblitz/platform-integrations/db';

// Use with your Drizzle database instance
const result = await db.select().from(fields);
```

---

## Entity Relationship Diagram

```
┌─────────────────────────┐
│   providerConnections   │  OAuth tokens per user per provider
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      organizations      │  Provider organizations (JD orgs, etc.)
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐   ┌─────────┐
│ growers │   │  farms  │   Optional hierarchy levels
└────┬────┘   └────┬────┘
     │             │
     └──────┬──────┘
            ▼
┌─────────────────────────┐
│         fields          │  Core entity
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       boundaries        │  Geometry with history
└─────────────────────────┘
```

---

## Tables

### `provider_connections`

Stores OAuth credentials per user per provider.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | Your app's user ID |
| `provider` | enum | `john_deere`, `climate_fieldview`, etc. |
| `refresh_token` | text | OAuth refresh token |
| `access_token` | text | Current access token (optional) |
| `access_token_expires_at` | timestamp | Token expiry |
| `scopes` | text[] | Granted OAuth scopes |
| `is_active` | boolean | Connection usable |
| `last_refreshed_at` | timestamp | Last token refresh |
| `last_sync_at` | timestamp | Last data sync |
| `metadata` | jsonb | Provider-specific data |

### `organizations`

Provider organizations the user has access to.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `connection_id` | uuid | FK to provider_connections |
| `provider_org_id` | text | Provider's org ID |
| `name` | text | Organization name |
| `type` | text | Org type (customer, dealer) |
| `connection_completed` | boolean | JD connections flow done |
| `sync_status` | enum | Sync state with provider |

### `farms`

Container for fields.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | FK to organizations |
| `connection_id` | uuid | FK to provider_connections |
| `provider_farm_id` | text | Provider's farm ID |
| `name` | text | Farm name |
| `status` | enum | `active` / `archived` |
| `sync_status` | enum | Sync state |

### `fields`

Core entity representing agricultural land units.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `farm_id` | uuid | FK to farms |
| `organization_id` | uuid | FK to organizations |
| `connection_id` | uuid | FK to provider_connections |
| `provider_field_id` | text | Provider's field ID |
| `name` | text | Field name |
| `area` | double | Calculated area |
| `area_unit` | text | `ha` / `ac` |
| `status` | enum | `active` / `archived` |
| `sync_status` | enum | Sync state |
| `active_boundary_id` | uuid | Current active boundary |
| `field_type` | text | `original`, `merged`, etc. |

### `boundaries`

Geometry data for fields. **Stored using PostGIS**.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `field_id` | uuid | FK to fields |
| `provider_boundary_id` | text | Provider's boundary ID |
| `name` | text | Boundary name |
| `geom` | geometry(Geometry, 4326) | **PostGIS geometry (WGS84)** |
| `geojson` | jsonb | GeoJSON cache (denormalized) |
| `area` | double | Total area |
| `workable_area` | double | Area minus exclusions |
| `is_active` | boolean | Active boundary for field |
| `validity` | enum | Geometry validity status |
| `sync_status` | enum | Sync state |
| `source_type` | text | HandDrawn, MachineMeasured, etc. |
| `signal_type` | text | RTK, SF1, SF2, WAAS |

---

## Enums

### `provider`
```
john_deere | climate_fieldview | cnhi | trimble | raven | ag_leader | other
```

### `sync_status`
```
synced              - Matches provider exactly
outdated            - Provider has newer data  
deleted_on_provider - Deleted at provider, kept locally
local_only          - Created locally, not synced
pending_sync        - Waiting to push to provider
```

### `geometry_validity`
```
valid | self_intersection | ring_self_intersection | hole_outside_shell |
nested_holes | nested_shells | disconnected_interior | duplicate_rings |
too_few_points | invalid_coordinate | ring_not_closed | repeated_point |
unknown_invalid
```

### `record_status`
```
active | archived
```

---

## Field Mapping: John Deere → Database

### Fields

| John Deere | Database | Notes |
|------------|----------|-------|
| `id` | `provider_field_id` | JD's UUID |
| `name` | `name` | Direct mapping |
| `archived` | `status` | `true` → `archived`, `false` → `active` |
| `links[rel=owningOrganization]` | → lookup `organization_id` | Via HATEOAS link |
| `links[rel=farms]` | → lookup `farm_id` | Via HATEOAS link |
| — | `area` | Calculated from active boundary |

### Boundaries

| John Deere | Database | Notes |
|------------|----------|-------|
| `id` | `provider_boundary_id` | JD's UUID |
| `name` | `name` | Direct mapping |
| `multipolygons` | `geometry` | **Convert to GeoJSON** (see below) |
| `area.valueAsDouble` | `area` | |
| `area.unit` | `area_unit` | `ha` / `ac` |
| `workableArea.valueAsDouble` | `workable_area` | |
| `active` | `is_active` | |
| `archived` | `status` | `true` → `archived` |
| `sourceType` | `source_type` | HandDrawn, etc. |
| `signalType` | `signal_type` | dtiSignalTypeRTK → RTK |
| `irrigated` | `irrigated` | |
| `createdTime` | `provider_created_at` | |
| `modifiedTime` | `provider_modified_at` | |
| `boundingBox` | `bbox` | Convert to `[minLon, minLat, maxLon, maxLat]` |

---

## Geometry Conversion

### John Deere → GeoJSON

John Deere uses a proprietary format. Convert on import:

```typescript
function jdToGeoJSON(jdMultipolygons: JDPolygon[]): GeoJSON.MultiPolygon {
  return {
    type: 'MultiPolygon',
    coordinates: jdMultipolygons.map(polygon => 
      polygon.rings.map(ring =>
        ring.points.map(point => [point.lon, point.lat]) // Note: lon, lat order!
      )
    )
  };
}
```

**Key differences:**
- JD: `{ lat, lon }` objects
- GeoJSON: `[lon, lat]` arrays (longitude first!)

### Bounding Box Conversion

```typescript
function jdBboxToArray(bbox: JDBoundingBox): number[] {
  return [
    bbox.topLeft.lon,      // minLon
    bbox.bottomRight.lat,  // minLat  
    bbox.bottomRight.lon,  // maxLon
    bbox.topLeft.lat       // maxLat
  ];
}
```

---

## Sync Status Flow

```
Provider API → fetch data → compare with DB

If not in DB:
  → INSERT with sync_status = 'synced'

If in DB and unchanged:
  → no action

If in DB and provider has changes:
  → UPDATE, set sync_status = 'synced'

If in DB but missing from provider:
  → UPDATE, set sync_status = 'deleted_on_provider'

If local changes pending:
  → sync_status = 'pending_sync' until pushed
```

---

## Migration

Generate migrations with drizzle-kit:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Or push directly (dev only):

```bash
npx drizzle-kit push
```

---

## PostGIS Queries

### Insert boundary from GeoJSON

```sql
INSERT INTO boundaries (field_id, geom, geojson)
VALUES (
  'field-uuid',
  ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[...]]]}'),
  '{"type":"MultiPolygon","coordinates":[[[[...]]]]}'::jsonb
);
```

### Select as GeoJSON

```sql
SELECT 
  id,
  name,
  ST_AsGeoJSON(geom)::jsonb as geometry,
  ST_Area(geom::geography) / 10000 as area_hectares
FROM boundaries
WHERE field_id = 'field-uuid';
```

### Spatial queries

```sql
-- Find boundaries intersecting a point
SELECT * FROM boundaries
WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint(-93.76, 41.65), 4326));

-- Find boundaries within distance (meters)
SELECT * FROM boundaries
WHERE ST_DWithin(
  geom::geography,
  ST_SetSRID(ST_MakePoint(-93.76, 41.65), 4326)::geography,
  1000  -- 1km radius
);

-- Calculate area in hectares
SELECT id, ST_Area(geom::geography) / 10000 as hectares FROM boundaries;

-- Get bounding box
SELECT id, ST_Extent(geom) as bbox FROM boundaries GROUP BY id;

-- Validate geometry
SELECT id, ST_IsValid(geom), ST_IsValidReason(geom) FROM boundaries;
```

### Fix invalid geometries

```sql
UPDATE boundaries
SET geom = ST_MakeValid(geom),
    fix_status = 'auto_fixed'
WHERE NOT ST_IsValid(geom);
```

---

## Notes

1. **Token encryption**: The schema stores tokens as plain text. Encrypt at the application layer or use database-level encryption.

2. **PostGIS required**: The `boundaries.geom` column uses native PostGIS geometry. Ensure the extension is installed.

3. **SRID 4326**: All geometries use WGS84 (EPSG:4326). Convert before insert if using different projections.

4. **Multi-provider**: A user can have multiple `provider_connections`. Each connection has its own organization/farm/field hierarchy.

5. **Boundary history**: Multiple boundaries per field enable tracking changes over time. Only one can be `is_active = true`.

6. **Soft deletes**: Use `status = 'archived'` and `sync_status = 'deleted_on_provider'` instead of hard deletes for data integrity.

7. **GeoJSON cache**: The `geojson` column is denormalized for API convenience. Keep it in sync with `geom` via triggers or application logic.

