/**
 * Geometry Utilities
 * 
 * Functions for converting between geometry formats and units.
 */

import type { 
  GeoJSONGeometry, 
  GeoJSONMultiPolygon, 
  GeoJSONPolygon,
  AreaUnit,
  GeometryFormat,
} from '../services/types';

// ============================================================================
// JOHN DEERE GEOMETRY TYPES
// ============================================================================

/**
 * John Deere point format
 */
export interface JDPoint {
  '@type'?: string;
  lat: number;
  lon: number;
}

/**
 * John Deere ring format
 */
export interface JDRing {
  '@type'?: string;
  points: JDPoint[];
  type?: 'exterior' | 'interior';
  passable?: boolean;
}

/**
 * John Deere polygon format
 */
export interface JDPolygon {
  '@type'?: string;
  rings: JDRing[];
}

/**
 * John Deere bounding box format
 */
export interface JDBoundingBox {
  topLeft: JDPoint;
  bottomRight: JDPoint;
}

// ============================================================================
// COORDINATE CONVERSION
// ============================================================================

/**
 * Convert John Deere point {lat, lon} to GeoJSON [lon, lat]
 */
export function jdPointToGeoJSON(point: JDPoint): [number, number] {
  return [point.lon, point.lat];
}

/**
 * Convert GeoJSON [lon, lat] to John Deere point {lat, lon}
 */
export function geoJSONPointToJD(coords: [number, number]): JDPoint {
  return { lat: coords[1], lon: coords[0] };
}

// ============================================================================
// GEOMETRY CONVERSION: JD → GEOJSON
// ============================================================================

/**
 * Convert John Deere ring to GeoJSON ring (array of coordinates)
 */
export function jdRingToGeoJSON(ring: JDRing): number[][] {
  const coords = ring.points.map(jdPointToGeoJSON);
  
  // Ensure ring is closed (first point === last point)
  if (coords.length > 0) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }
  }
  
  return coords;
}

/**
 * Convert John Deere polygon to GeoJSON polygon coordinates
 */
export function jdPolygonToGeoJSON(polygon: JDPolygon): number[][][] {
  return polygon.rings.map(jdRingToGeoJSON);
}

/**
 * Convert John Deere multipolygons array to GeoJSON MultiPolygon
 */
export function jdMultiPolygonsToGeoJSON(multipolygons: JDPolygon[]): GeoJSONMultiPolygon {
  return {
    type: 'MultiPolygon',
    coordinates: multipolygons.map(jdPolygonToGeoJSON),
  };
}

/**
 * Convert John Deere multipolygons to GeoJSON (auto-detect type)
 * Returns Polygon if single polygon, MultiPolygon otherwise
 */
export function jdToGeoJSON(multipolygons: JDPolygon[]): GeoJSONGeometry {
  if (multipolygons.length === 1) {
    // Single polygon - return as Polygon type
    return {
      type: 'Polygon',
      coordinates: jdPolygonToGeoJSON(multipolygons[0]),
    } as GeoJSONPolygon;
  }
  
  // Multiple polygons - return as MultiPolygon
  return jdMultiPolygonsToGeoJSON(multipolygons);
}

// ============================================================================
// GEOMETRY CONVERSION: GEOJSON → WKT
// ============================================================================

/**
 * Convert coordinate pair to WKT format
 */
function coordToWKT(coord: number[]): string {
  return `${coord[0]} ${coord[1]}`;
}

/**
 * Convert ring (array of coordinates) to WKT format
 */
function ringToWKT(ring: number[][]): string {
  return `(${ring.map(coordToWKT).join(', ')})`;
}

/**
 * Convert polygon coordinates to WKT format
 */
function polygonToWKT(coords: number[][][]): string {
  return `(${coords.map(ringToWKT).join(', ')})`;
}

/**
 * Convert GeoJSON geometry to WKT string
 */
export function geoJSONToWKT(geometry: GeoJSONGeometry): string {
  switch (geometry.type) {
    case 'Point':
      return `POINT(${geometry.coordinates[0]} ${geometry.coordinates[1]})`;
    
    case 'Polygon':
      return `POLYGON${polygonToWKT(geometry.coordinates)}`;
    
    case 'MultiPolygon':
      const polygons = geometry.coordinates.map(polygonToWKT).join(', ');
      return `MULTIPOLYGON(${polygons})`;
    
    default:
      throw new Error(`Unsupported geometry type: ${(geometry as GeoJSONGeometry).type}`);
  }
}

// ============================================================================
// GEOMETRY CONVERSION: GEOJSON → COORDINATES
// ============================================================================

/**
 * Extract flat coordinate array from GeoJSON geometry
 * Returns array of [lon, lat] pairs
 */
export function geoJSONToCoordinates(geometry: GeoJSONGeometry): number[][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    
    case 'Polygon':
      // Flatten all rings
      return geometry.coordinates.flat();
    
    case 'MultiPolygon':
      // Flatten all polygons and rings
      return geometry.coordinates.flat(2);
    
    default:
      throw new Error(`Unsupported geometry type: ${(geometry as GeoJSONGeometry).type}`);
  }
}

// ============================================================================
// GEOMETRY FORMAT CONVERSION
// ============================================================================

/**
 * Convert GeoJSON geometry to requested format
 */
export function convertGeometryFormat(
  geometry: GeoJSONGeometry,
  format: GeometryFormat
): GeoJSONGeometry | string {
  switch (format) {
    case 'geojson':
      return geometry;
    
    case 'wkt':
      return geoJSONToWKT(geometry);
    
    case 'coordinates':
      return JSON.stringify(geoJSONToCoordinates(geometry));
    
    default:
      return geometry;
  }
}

// ============================================================================
// BOUNDING BOX
// ============================================================================

/**
 * Calculate bounding box from GeoJSON geometry
 * Returns [minLon, minLat, maxLon, maxLat]
 */
export function calculateBBox(geometry: GeoJSONGeometry): [number, number, number, number] {
  const coords = geoJSONToCoordinates(geometry);
  
  if (coords.length === 0) {
    return [0, 0, 0, 0];
  }
  
  let minLon = coords[0][0];
  let maxLon = coords[0][0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];
  
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  
  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Convert John Deere bounding box to [minLon, minLat, maxLon, maxLat]
 */
export function jdBBoxToArray(bbox: JDBoundingBox): [number, number, number, number] {
  return [
    bbox.topLeft.lon,
    bbox.bottomRight.lat,
    bbox.bottomRight.lon,
    bbox.topLeft.lat,
  ];
}

// ============================================================================
// AREA CONVERSION
// ============================================================================

/**
 * Conversion factors to square meters
 */
const AREA_TO_SQM: Record<AreaUnit, number> = {
  sqm: 1,
  sqft: 0.092903,
  ha: 10000,
  ac: 4046.8564224,
};

/**
 * Convert area between units
 */
export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  if (from === to) return value;
  
  // Convert to square meters first, then to target unit
  const sqm = value * AREA_TO_SQM[from];
  return sqm / AREA_TO_SQM[to];
}

/**
 * Parse area unit string from provider
 */
export function parseAreaUnit(unit: string): AreaUnit {
  const normalized = unit.toLowerCase();
  
  if (normalized === 'ha' || normalized === 'hectare' || normalized === 'hectares') {
    return 'ha';
  }
  if (normalized === 'ac' || normalized === 'acre' || normalized === 'acres') {
    return 'ac';
  }
  if (normalized === 'sqm' || normalized === 'm2' || normalized === 'm²') {
    return 'sqm';
  }
  if (normalized === 'sqft' || normalized === 'ft2' || normalized === 'ft²') {
    return 'sqft';
  }
  
  // Default to hectares
  return 'ha';
}

// ============================================================================
// GEOMETRY SIMPLIFICATION
// ============================================================================

/**
 * Simple Douglas-Peucker line simplification
 * Note: For production, consider using @turf/simplify
 */
function perpendicularDistance(
  point: number[],
  lineStart: number[],
  lineEnd: number[]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point[0] - lineStart[0], 2) + Math.pow(point[1] - lineStart[1], 2)
    );
  }
  
  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
  const nearestX = lineStart[0] + t * dx;
  const nearestY = lineStart[1] + t * dy;
  
  return Math.sqrt(Math.pow(point[0] - nearestX, 2) + Math.pow(point[1] - nearestY, 2));
}

/**
 * Douglas-Peucker simplification algorithm
 */
function douglasPeucker(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points;
  
  let maxDistance = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [points[0], points[points.length - 1]];
}

/**
 * Simplify a ring using Douglas-Peucker algorithm
 * Tolerance is in degrees (approximate)
 */
function simplifyRing(ring: number[][], toleranceDegrees: number): number[][] {
  const simplified = douglasPeucker(ring, toleranceDegrees);
  
  // Ensure at least 4 points for valid polygon (3 + closing point)
  if (simplified.length < 4) {
    return ring;
  }
  
  return simplified;
}

/**
 * Convert meters to approximate degrees at given latitude
 * This is a rough approximation - for precise work, use proper projection
 */
function metersToDegreesApprox(meters: number, latitude: number = 40): number {
  // At equator: 1 degree ≈ 111,320 meters
  // Adjust for latitude
  const metersPerDegree = 111320 * Math.cos((latitude * Math.PI) / 180);
  return meters / metersPerDegree;
}

/**
 * Simplify GeoJSON geometry
 * @param geometry - GeoJSON geometry to simplify
 * @param toleranceMeters - Simplification tolerance in meters
 */
export function simplifyGeometry(
  geometry: GeoJSONGeometry,
  toleranceMeters: number
): GeoJSONGeometry {
  if (toleranceMeters <= 0) return geometry;
  
  // Get approximate latitude for conversion
  const coords = geoJSONToCoordinates(geometry);
  const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  const toleranceDegrees = metersToDegreesApprox(toleranceMeters, avgLat);
  
  switch (geometry.type) {
    case 'Point':
      return geometry;
    
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map(ring => simplifyRing(ring, toleranceDegrees)),
      };
    
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map(polygon =>
          polygon.map(ring => simplifyRing(ring, toleranceDegrees))
        ),
      };
    
    default:
      return geometry;
  }
}

