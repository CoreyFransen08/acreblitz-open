# Geospatial Best Practices

This document defines declarative best practices for Claude when working with geospatial features, maps, and spatial data.

---

## Mapping Libraries

- Use Leaflet 1.9+ as the primary mapping library
- Use React Leaflet for React component bindings only if user is willing to run StrictMode = false
- Use Leaflet Draw for user drawing/editing tools
- Use Leaflet VectorGrid for vector tile rendering

## Coordinate Systems

- Use WGS84 (EPSG:4326) as the standard coordinate reference system
- Store all coordinates in WGS84 format in the database
- GeoJSON format uses `[longitude, latitude]` order (X, Y)
- Leaflet uses `[latitude, longitude]` order (Y, X)
- Always convert between formats explicitly using utility functions
- Never assume coordinate order; verify at integration boundaries

## Coordinate Transformations

- Use proj4 for coordinate system transformations
- Default to WGS84 if no projection file (.prj) is available
- Parse .prj files to detect source coordinate systems
- Transform coordinates during import, never during display
- Cache proj4 definitions for repeated transformations

## GeoJSON Handling

- Use the `geojson` npm package for TypeScript types
- Validate GeoJSON structure before processing
- Support both Polygon and MultiPolygon geometry types
- Normalize MultiPolygon to array of Polygons when needed
- Store geometry as JSONB in non-PostGIS columns
- Use PostGIS geometry type for spatial query columns

## Geometry Operations

- Use Turf.js for all client-side geometry operations
- Import specific Turf modules, not the entire library: `import area from '@turf/area'`
- Common operations:
  - `@turf/area` - Calculate polygon area
  - `@turf/buffer` - Create buffer zones
  - `@turf/helpers` - Create geometry objects (polygon, lineString)
  - `@turf/bbox` - Calculate bounding boxes
  - `@turf/boolean-point-in-polygon` - Point containment checks
- Use custom implementations for specialized operations (directional buffers)

## PostGIS Usage

- Enable PostGIS extension: `CREATE EXTENSION IF NOT EXISTS postgis`
- Use `geometry(MultiPolygon, 4326)` for spatial columns
- Always specify SRID 4326 for WGS84 coordinates
- Create GIST indexes on geometry columns
- Use spatial functions for server-side queries:
  - `ST_Intersects()` - Check if geometries intersect
  - `ST_Contains()` - Check if one geometry contains another
  - `ST_Within()` - Check if geometry is within another
  - `ST_Distance()` - Calculate distance between geometries
- Wrap spatial queries in RPC functions for type safety

## Spatial Data Storage

- Use normalized table structure for complex field boundaries:
  - `fields` - Field metadata (no geometry)
  - `boundaries` - Field boundary records with area
  - `rings` - Individual polygon rings with geometry
- Store ring type as 'exterior' or 'interior' (holes)
- Link rings to boundaries via foreign key
- Support multiple boundaries per field
- Support multiple rings per boundary (holes, exclusions)

## Shapefile Import

- Accept ZIP files containing .shp, .shx, .dbf, .prj files
- Use the `shapefile` npm package for parsing
- Detect coordinate system from .prj file
- Reproject coordinates to WGS84 during import
- Split MultiPolygon features into normalized ring records
- Preserve original attribute data as JSONB metadata

## Map Component Patterns

- Create reusable map components in `/components/map/`
- Separate map logic from UI state management
- Use custom hooks for complex map interactions
- Memoize geometry transformations with useMemo
- Cache vector tiles in localStorage for performance
- Handle map resize events for responsive layouts

## Bounding Box Calculations

- Calculate bounds from all field geometries for auto-zoom
- Use Turf bbox or Leaflet LatLngBounds
- Add padding to bounds for visual comfort
- Cache bounds calculations; recalculate on geometry changes

## Elevation and Terrain

- Use elevation APIs (Google Elevation) for slope analysis
- Sample elevation at boundary points for downslope detection
- Calculate outward normal vectors per boundary segment
- Use elevation gradients to determine water flow direction



## Performance Optimization

- Use vector tiles instead of GeoJSON for large datasets
- Implement tile caching in localStorage (where legal and not in violation of ToS)
- Limit features rendered at low zoom levels
- Use clustering for point features over 100 items
- Debounce map movement events
- Lazy load geometry data for detail views



## Z-Index for Map Elements

- Base map tiles: default
- Vector overlays: 400
- Markers and features: 500-600
- Drawing controls: 700
- Popups and tooltips: 800

## Error Handling

- Validate coordinate bounds (lat: -90 to 90, lng: -180 to 180)
- Handle empty geometry gracefully
- Never use fallback coordinates for missing data
- Log geometry parsing errors with context
- Display user-friendly messages for import failures

## Type Safety

- Define interfaces for all geometry types
- Use discriminated unions for geometry type switching
- Type coordinates as `[number, number]` (lng, lat) or `LatLngTuple`
- Avoid `any` for geometry data; use proper GeoJSON types
- Create utility types for common patterns (Ring, Boundary, FieldWithPoints)
