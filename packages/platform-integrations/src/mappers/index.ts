/**
 * Mapper Exports
 * 
 * Functions for converting provider-specific data to unified format.
 */

// Geometry utilities
export {
  // JD types
  type JDPoint,
  type JDRing,
  type JDPolygon,
  type JDBoundingBox,
  
  // Coordinate conversion
  jdPointToGeoJSON,
  geoJSONPointToJD,
  
  // JD → GeoJSON
  jdRingToGeoJSON,
  jdPolygonToGeoJSON,
  jdMultiPolygonsToGeoJSON,
  jdToGeoJSON,
  
  // GeoJSON → other formats
  geoJSONToWKT,
  geoJSONToCoordinates,
  convertGeometryFormat,
  
  // Bounding box
  calculateBBox,
  jdBBoxToArray,
  
  // Area conversion
  convertArea,
  parseAreaUnit,
  
  // Simplification
  simplifyGeometry,
} from './geometry';

// John Deere mappers
export {
  // Field mapping
  mapJohnDeereField,
  mapJohnDeereFields,

  // Boundary mapping
  mapJohnDeereBoundary,
  mapJohnDeereBoundaries,
  type JDBoundaryWithGeometry,

  // Organization mapping
  mapJohnDeereOrganization,
  type OrganizationInfo,

  // Work plan mapping
  mapJohnDeereWorkPlan,
  mapJohnDeereWorkPlans,

  // Helpers
  extractOrgIdFromLink,
  extractFieldIdFromLink,
  extractBoundaryIdFromLink,
} from './john-deere';

