/**
 * John Deere Mappers
 * 
 * Convert John Deere API responses to unified format.
 */

import type {
  Field,
  Boundary,
  Organization,
  WorkPlan,
  WorkPlanOperation,
  WorkPlanAssignment,
  OperationInput,
  GuidanceSettings,
  GuidanceEntity,
  WorkStatus,
  InputType,
  VarietySelectionMode,
  GuidanceEntityType,
} from '../types/john-deere';
import type {
  UnifiedField,
  UnifiedBoundary,
  UnifiedWorkPlan,
  UnifiedWorkPlanOperation,
  UnifiedWorkPlanAssignment,
  UnifiedOperationInput,
  UnifiedOperationProduct,
  UnifiedOperationPrescription,
  UnifiedGuidanceSettings,
  UnifiedGuidancePreferences,
  UnifiedGuidanceEntity,
  UnifiedWorkType,
  UnifiedWorkStatus,
  UnifiedInputType,
  UnifiedVarietySelectionMode,
  UnifiedGuidanceEntityType,
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
  
  // Map area if available (JD API uses valueAsDouble)
  let area: AreaMeasurement | undefined;
  if (jdField.area && jdField.area.valueAsDouble != null) {
    const sourceUnit = parseAreaUnit(jdField.area.unit);
    area = {
      value: convertArea(jdField.area.valueAsDouble, sourceUnit, targetUnit),
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
  
  // Map area if available (JD API uses valueAsDouble)
  let area: AreaMeasurement | undefined;
  if (jdBoundary.area && jdBoundary.area.valueAsDouble != null) {
    const sourceUnit = parseAreaUnit(jdBoundary.area.unit);
    area = {
      value: convertArea(jdBoundary.area.valueAsDouble, sourceUnit, targetUnit),
      unit: targetUnit,
    };
  }

  // Map workable area if available (JD API uses valueAsDouble)
  let workableArea: AreaMeasurement | undefined;
  if (jdBoundary.workableArea && jdBoundary.workableArea.valueAsDouble != null) {
    const sourceUnit = parseAreaUnit(jdBoundary.workableArea.unit);
    workableArea = {
      value: convertArea(jdBoundary.workableArea.valueAsDouble, sourceUnit, targetUnit),
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
// WORK PLAN MAPPER
// ============================================================================

/**
 * Map JD work type to unified work type
 */
function mapWorkType(jdWorkType: string): UnifiedWorkType {
  const mapping: Record<string, UnifiedWorkType> = {
    'dtiTillage': 'tillage',
    'dtiSeeding': 'seeding',
    'dtiApplication': 'application',
    'dtiHarvest': 'harvest',
  };
  return mapping[jdWorkType] ?? 'tillage';
}

/**
 * Map JD work status to unified work status
 */
function mapWorkStatus(jdStatus: WorkStatus): UnifiedWorkStatus {
  const mapping: Record<WorkStatus, UnifiedWorkStatus> = {
    'PLANNED': 'planned',
    'IN_PROGRESS': 'in_progress',
    'COMPLETED': 'completed',
  };
  return mapping[jdStatus] ?? 'planned';
}

/**
 * Map JD input type to unified input type
 */
function mapInputType(jdInputType: InputType): UnifiedInputType {
  const mapping: Record<InputType, UnifiedInputType> = {
    'CROP': 'crop',
    'VARIETY': 'variety',
    'CHEMICAL': 'chemical',
    'FERTILIZER': 'fertilizer',
    'TANK_MIX': 'tank_mix',
    'DRY_BLEND': 'dry_blend',
  };
  return mapping[jdInputType] ?? 'crop';
}

/**
 * Map JD variety selection mode to unified
 */
function mapVarietySelectionMode(jdMode: VarietySelectionMode): UnifiedVarietySelectionMode {
  const mapping: Record<VarietySelectionMode, UnifiedVarietySelectionMode> = {
    'USER_DEFINED': 'user_defined',
    'USE_VARIETY_LOCATOR': 'variety_locator',
    'NONE': 'none',
  };
  return mapping[jdMode] ?? 'none';
}

/**
 * Map JD guidance entity type to unified
 */
function mapGuidanceEntityType(jdType: GuidanceEntityType): UnifiedGuidanceEntityType {
  const mapping: Record<GuidanceEntityType, UnifiedGuidanceEntityType> = {
    'GUIDANCE_LINE': 'guidance_line',
    'GUIDANCE_PLAN': 'guidance_plan',
    'SOURCE_OPERATION': 'source_operation',
  };
  return mapping[jdType] ?? 'guidance_line';
}

/**
 * Extract ID from a URI pattern
 */
function extractIdFromUri(uri: string, resource: string): string | undefined {
  const pattern = new RegExp(`/${resource}/([^/]+)`);
  const match = uri.match(pattern);
  return match ? match[1] : undefined;
}

/**
 * Map JD operation input to unified format
 */
function mapOperationInput(input: OperationInput): UnifiedOperationInput {
  const product: UnifiedOperationProduct = {
    uri: input.operationProduct.inputUri,
    inputType: mapInputType(input.operationProduct.inputType),
    varietySelectionMode: mapVarietySelectionMode(input.operationProduct.varietySelectionMode),
  };

  let prescription: UnifiedOperationPrescription | undefined;
  if (input.operationPrescription) {
    const { fixedRate, prescriptionUse } = input.operationPrescription;
    if (fixedRate) {
      prescription = {
        type: 'fixed_rate',
        fixedRate: {
          value: fixedRate.valueAsDouble,
          unit: fixedRate.unit,
          vrDomainId: fixedRate.vrDomainId,
        },
      };
    } else if (prescriptionUse) {
      prescription = {
        type: 'variable_rate',
        prescriptionUse: {
          fileUri: prescriptionUse.fileUri,
          unit: prescriptionUse.unit,
          vrDomainId: prescriptionUse.vrDomainId,
          prescriptionLayerUri: prescriptionUse.prescriptionLayerUri,
          multiplier: prescriptionUse.multiplier
            ? { value: prescriptionUse.multiplier.valueAsDouble, unit: prescriptionUse.multiplier.unit }
            : undefined,
          multiplierMode: prescriptionUse.multiplierMode,
          lookAhead: prescriptionUse.lookAhead
            ? { value: prescriptionUse.lookAhead.valueAsDouble, unit: prescriptionUse.lookAhead.unit }
            : undefined,
          lookAheadMode: prescriptionUse.lookAheadMode,
        },
      };
    }
  }

  return { product, prescription };
}

/**
 * Map JD work plan operation to unified format
 */
function mapOperation(operation: WorkPlanOperation): UnifiedWorkPlanOperation {
  return {
    operationType: mapWorkType(operation.operationType.instanceDomainId),
    inputs: operation.operationInputs.map(mapOperationInput),
  };
}

/**
 * Map JD work plan assignment to unified format
 */
function mapAssignment(assignment: WorkPlanAssignment): UnifiedWorkPlanAssignment {
  return {
    machineUri: assignment.equipmentMachineUri,
    machineId: assignment.equipmentMachineUri
      ? extractIdFromUri(assignment.equipmentMachineUri, 'equipment')
      : undefined,
    operatorUri: assignment.operatorUri,
    operatorId: assignment.operatorUri
      ? extractIdFromUri(assignment.operatorUri, 'operators')
      : undefined,
    implementUris: assignment.equipmentImplementUris,
    implementIds: assignment.equipmentImplementUris?.map(
      uri => extractIdFromUri(uri, 'equipment')
    ).filter((id): id is string => id !== undefined),
  };
}

/**
 * Map JD guidance entity to unified format
 */
function mapGuidanceEntity(entity: GuidanceEntity): UnifiedGuidanceEntity {
  return {
    entityType: mapGuidanceEntityType(entity.entityType),
    entityUri: entity.entityUri,
    entityId: extractIdFromUri(entity.entityUri, 'guidanceLines')
      ?? extractIdFromUri(entity.entityUri, 'guidancePlans')
      ?? extractIdFromUri(entity.entityUri, 'fieldOperations'),
  };
}

/**
 * Map JD guidance settings to unified format
 */
function mapGuidanceSettings(settings: GuidanceSettings): UnifiedGuidanceSettings {
  let preferences: UnifiedGuidancePreferences | undefined;
  if (settings.preferenceSettings) {
    const prefs = settings.preferenceSettings;
    preferences = {
      includeLatestFieldOperation: prefs.includeLatestFieldOperation,
      preferenceMode: prefs.preferenceMode,
      preferredEntity: prefs.entityType && prefs.entityUri
        ? {
            entityType: mapGuidanceEntityType(prefs.entityType),
            entityUri: prefs.entityUri,
            entityId: extractIdFromUri(prefs.entityUri, 'guidanceLines')
              ?? extractIdFromUri(prefs.entityUri, 'guidancePlans'),
          }
        : undefined,
    };
  }

  return {
    preferences,
    includedGuidance: settings.includeGuidance?.map(mapGuidanceEntity),
  };
}

/**
 * Map John Deere WorkPlan to UnifiedWorkPlan
 */
export function mapJohnDeereWorkPlan(
  jdWorkPlan: WorkPlan,
  options?: MapperOptions
): UnifiedWorkPlan {
  // Extract field ID from location URI
  const fieldId = extractIdFromUri(jdWorkPlan.location.fieldUri, 'fields');

  return {
    id: jdWorkPlan.erid,
    providerId: jdWorkPlan.erid,
    provider: 'john_deere',
    organizationId: options?.context?.organizationId ?? '',
    fieldId,
    fieldUri: jdWorkPlan.location.fieldUri,
    workType: mapWorkType(jdWorkPlan.workType.instanceDomainId),
    workStatus: mapWorkStatus(jdWorkPlan.workStatus),
    year: jdWorkPlan.year,
    workOrder: jdWorkPlan.workOrder,
    instructions: jdWorkPlan.instructions,
    sequenceNumber: jdWorkPlan.sequenceNumber,
    operations: jdWorkPlan.operations.map(mapOperation),
    assignments: jdWorkPlan.workPlanAssignments.map(mapAssignment),
    guidanceSettings: jdWorkPlan.guidanceSettings
      ? mapGuidanceSettings(jdWorkPlan.guidanceSettings)
      : undefined,
    metadata: {
      '@type': jdWorkPlan['@type'],
      links: jdWorkPlan.links,
    },
  };
}

/**
 * Map array of John Deere WorkPlans to UnifiedWorkPlans
 */
export function mapJohnDeereWorkPlans(
  jdWorkPlans: WorkPlan[],
  options?: MapperOptions
): UnifiedWorkPlan[] {
  return jdWorkPlans.map(wp => mapJohnDeereWorkPlan(wp, options));
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

