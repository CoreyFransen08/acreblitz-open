/**
 * John Deere Mappers
 * 
 * Convert John Deere API responses to unified format.
 */

import type { Field, Boundary, Organization } from '../types/john-deere';
import type {
  UnifiedField,
  UnifiedBoundary,
  MapperOptions,
  AreaMeasurement,
  RecordStatus,
  GeoJSONGeometry,
} from '../services/types';
import {
  DEFAULT_AREA_UNIT,
  DEFAULT_GEOMETRY_FORMAT,
} from '../services/types';
import {
  jdToGeoJSON,
  convertGeometryFormat,
  convertArea,
  parseAreaUnit,
  simplifyGeometry,
} from './geometry';

// ============================================================================
// FIELD MAPPER
// ============================================================================

/**
 * Map John Deere Field to UnifiedField
 */
export function mapJohnDeereField(
  jdField: Field,
  options?: MapperOptions
): UnifiedField {
  const targetUnit = options?.units?.areaUnit ?? DEFAULT_AREA_UNIT;
  
  // Map area if available
  let area: AreaMeasurement | undefined;
  if (jdField.area) {
    const sourceUnit = parseAreaUnit(jdField.area.unit);
    area = {
      value: convertArea(jdField.area.value, sourceUnit, targetUnit),
      unit: targetUnit,
    };
  }
  
  // Map status
  const status: RecordStatus = jdField.archived ? 'archived' : 'active';
  
  return {
    id: jdField.id,
    providerId: jdField.id,
    provider: 'john_deere',
    name: jdField.name,
    organizationId: options?.context?.organizationName ? undefined : undefined, // Will be set by caller
    organizationName: options?.context?.organizationName,
    farmId: undefined, // JD doesn't include farm in field response, needs separate lookup
    farmName: options?.context?.farmName,
    area,
    status,
    boundary: undefined, // Set separately if geometry requested
    metadata: {
      '@type': jdField['@type'],
      links: jdField.links,
    },
  };
}

/**
 * Map array of John Deere Fields to UnifiedFields
 */
export function mapJohnDeereFields(
  jdFields: Field[],
  options?: MapperOptions
): UnifiedField[] {
  return jdFields.map(field => mapJohnDeereField(field, options));
}

// ============================================================================
// BOUNDARY MAPPER
// ============================================================================

/**
 * Re-export Boundary as JDBoundaryWithGeometry for backwards compatibility
 * @deprecated Use Boundary from '../types/john-deere' instead
 */
export type JDBoundaryWithGeometry = Boundary;

/**
 * Map John Deere Boundary to UnifiedBoundary
 */
export function mapJohnDeereBoundary(
  jdBoundary: Boundary,
  options?: MapperOptions
): UnifiedBoundary {
  const targetUnit = options?.units?.areaUnit ?? DEFAULT_AREA_UNIT;
  const geometryFormat = options?.geometry?.geometryFormat ?? DEFAULT_GEOMETRY_FORMAT;
  const includeGeometry = options?.geometry?.includeGeometry ?? true;
  const simplifyTolerance = options?.geometry?.simplifyTolerance ?? 0;
  
  // Map area if available
  let area: AreaMeasurement | undefined;
  if (jdBoundary.area) {
    const sourceUnit = parseAreaUnit(jdBoundary.area.unit);
    area = {
      value: convertArea(jdBoundary.area.value, sourceUnit, targetUnit),
      unit: targetUnit,
    };
  }
  
  // Map workable area if available
  let workableArea: AreaMeasurement | undefined;
  if (jdBoundary.workableArea) {
    const sourceUnit = parseAreaUnit(jdBoundary.workableArea.unit);
    workableArea = {
      value: convertArea(jdBoundary.workableArea.value, sourceUnit, targetUnit),
      unit: targetUnit,
    };
  }
  
  // Map geometry if requested and available
  let geometry: GeoJSONGeometry | string | undefined;
  let finalFormat = geometryFormat;
  
  if (includeGeometry && jdBoundary.multipolygons && jdBoundary.multipolygons.length > 0) {
    let geoJson = jdToGeoJSON(jdBoundary.multipolygons);
    
    // Apply simplification if requested
    if (simplifyTolerance > 0) {
      geoJson = simplifyGeometry(geoJson, simplifyTolerance);
    }
    
    // Convert to requested format
    geometry = convertGeometryFormat(geoJson, geometryFormat);
  }
  
  // Map status
  const status: RecordStatus = jdBoundary.archived ? 'archived' : 'active';
  
  // Extract field ID from links if available
  let fieldId: string | undefined;
  const fieldLink = jdBoundary.links?.find(link => link.rel === 'field');
  if (fieldLink?.uri) {
    // Extract field ID from URI like ".../fields/{fieldId}/..."
    const match = fieldLink.uri.match(/\/fields\/([^/]+)/);
    if (match) {
      fieldId = match[1];
    }
  }
  
  return {
    id: jdBoundary.id,
    providerId: jdBoundary.id,
    provider: 'john_deere',
    fieldId,
    fieldName: options?.context?.fieldName,
    name: jdBoundary.name,
    isActive: jdBoundary.active ?? false,
    area,
    workableArea,
    geometry,
    geometryFormat: geometry ? finalFormat : undefined,
    status,
    sourceType: jdBoundary.sourceType,
    signalType: normalizeSignalType(jdBoundary.signalType),
    irrigated: jdBoundary.irrigated,
    metadata: {
      '@type': jdBoundary['@type'],
      source: jdBoundary.source,
      links: jdBoundary.links,
    },
    createdAt: jdBoundary.createdTime ?? jdBoundary.dateCreated,
    modifiedAt: jdBoundary.modifiedTime ?? jdBoundary.dateModified,
  };
}

/**
 * Map array of John Deere Boundaries to UnifiedBoundaries
 */
export function mapJohnDeereBoundaries(
  jdBoundaries: JDBoundaryWithGeometry[],
  options?: MapperOptions
): UnifiedBoundary[] {
  return jdBoundaries.map(boundary => mapJohnDeereBoundary(boundary, options));
}

// ============================================================================
// ORGANIZATION MAPPER
// ============================================================================

/**
 * Simplified org info for context
 */
export interface OrganizationInfo {
  id: string;
  name: string;
  type?: string;
}

/**
 * Map John Deere Organization to simplified info
 */
export function mapJohnDeereOrganization(jdOrg: Organization): OrganizationInfo {
  return {
    id: jdOrg.id,
    name: jdOrg.name,
    type: jdOrg.type,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalize JD signal type to human-readable format
 */
function normalizeSignalType(signalType?: string): string | undefined {
  if (!signalType) return undefined;
  
  const mapping: Record<string, string> = {
    'dtiSignalTypeRTK': 'RTK',
    'dtiSignalTypeSF1': 'SF1',
    'dtiSignalTypeSF2': 'SF2',
    'dtiSignalTypeWAAS': 'WAAS',
    'dtiSignalTypeAutonomous': 'Autonomous',
  };
  
  return mapping[signalType] ?? signalType;
}

/**
 * Extract organization ID from a JD API link
 */
export function extractOrgIdFromLink(uri: string): string | undefined {
  const match = uri.match(/\/organizations\/([^/]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extract field ID from a JD API link
 */
export function extractFieldIdFromLink(uri: string): string | undefined {
  const match = uri.match(/\/fields\/([^/]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extract boundary ID from a JD API link
 */
export function extractBoundaryIdFromLink(uri: string): string | undefined {
  const match = uri.match(/\/boundaries\/([^/]+)/);
  return match ? match[1] : undefined;
}

