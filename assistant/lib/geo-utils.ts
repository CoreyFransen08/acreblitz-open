/**
 * Shared GeoJSON utilities for coordinate calculations
 */

// GeoJSON coordinate types
export type Position = [number, number]; // [lng, lat]
export type LinearRing = Position[];
export type Polygon = LinearRing[];
export type MultiPolygon = Polygon[];

export interface GeoJSONGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: Polygon | MultiPolygon;
}

/**
 * Calculate center point (centroid) from GeoJSON geometry
 * Uses simple average of all exterior ring coordinates
 */
export function calculateCenterPoint(geometry: GeoJSONGeometry): {
  latitude: number;
  longitude: number;
} {
  let allCoords: Position[] = [];

  if (geometry.type === "Polygon") {
    // First ring is exterior boundary
    allCoords = geometry.coordinates[0] as Position[];
  } else if (geometry.type === "MultiPolygon") {
    // Flatten all exterior rings
    for (const polygon of geometry.coordinates as MultiPolygon) {
      allCoords = allCoords.concat(polygon[0]);
    }
  }

  if (allCoords.length === 0) {
    throw new Error("No coordinates found in geometry");
  }

  // Calculate centroid (average of all points)
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of allCoords) {
    sumLng += lng;
    sumLat += lat;
  }

  return {
    longitude: sumLng / allCoords.length,
    latitude: sumLat / allCoords.length,
  };
}

/**
 * Validate coordinates are within continental US (NWS API coverage)
 */
export function isInContinentalUS(lat: number, lng: number): boolean {
  return lat >= 24.5 && lat <= 49.5 && lng >= -125 && lng <= -66.5;
}

/**
 * Bounding box interface for map viewport calculations
 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Calculate bounding box from an array of GeoJSON geometries
 */
export function calculateBoundingBox(geometries: GeoJSONGeometry[]): BoundingBox {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const geometry of geometries) {
    const coords =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;

    for (const polygon of coords as MultiPolygon) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        }
      }
    }
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Convert bounding box to Leaflet bounds format [[sw], [ne]]
 */
export function toLeafletBounds(
  box: BoundingBox
): [[number, number], [number, number]] {
  return [
    [box.minLat, box.minLng],
    [box.maxLat, box.maxLng],
  ];
}

/**
 * Field boundary data for FeatureCollection creation
 */
export interface FieldBoundaryData {
  fieldId: string;
  fieldName: string;
  area?: { value: number; unit: string };
  geometry: GeoJSONGeometry;
}

/**
 * Create GeoJSON FeatureCollection from field boundaries
 * Returns a plain object that conforms to GeoJSON spec
 */
export function createFeatureCollection(boundaries: FieldBoundaryData[]): {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      fieldId: string;
      fieldName: string;
      area: number | undefined;
      areaUnit: string | undefined;
    };
    geometry: GeoJSONGeometry;
  }>;
} {
  return {
    type: "FeatureCollection",
    features: boundaries.map((b) => ({
      type: "Feature" as const,
      properties: {
        fieldId: b.fieldId,
        fieldName: b.fieldName,
        area: b.area?.value,
        areaUnit: b.area?.unit,
      },
      geometry: b.geometry,
    })),
  };
}
