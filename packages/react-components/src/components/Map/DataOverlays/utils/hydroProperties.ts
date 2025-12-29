/**
 * Hydro Feature Property Utilities
 *
 * Formatting and tooltip generation for 3DHP hydro features
 */

import type { HydroFeatureType, HydroFeatureProperties } from '../../../../types/dataOverlay';

/**
 * Get display label for feature type
 */
export function getHydroTypeLabel(type: HydroFeatureType): string {
  switch (type) {
    case 'flowline':
      return 'Stream/River';
    case 'waterbody':
      return 'Lake/Pond';
    case 'drainagearea':
      return 'Drainage Area';
    default:
      return 'Water Feature';
  }
}

/**
 * Get icon/emoji for feature type (for tooltips)
 */
export function getHydroTypeIcon(type: HydroFeatureType): string {
  switch (type) {
    case 'flowline':
      return '🌊';
    case 'waterbody':
      return '💧';
    case 'drainagearea':
      return '🗺️';
    default:
      return '💧';
  }
}

/**
 * Format feature name for display
 */
export function formatHydroName(properties: HydroFeatureProperties): string {
  return properties.gnis_name || 'Unnamed';
}

/**
 * Format feature code description
 */
export function formatFcodeDescription(properties: HydroFeatureProperties): string | null {
  // FCODE descriptions based on NHD feature codes
  // Reference: https://nhd.usgs.gov/userGuide/Robohelpfiles/NHD_User_Guide/Feature_Catalog/Hydrography_Dataset/Complete_FCode_List.htm
  const fcode = properties.fcode;
  if (!fcode) return null;

  // Common FCODEs - add more as needed
  const fcodeDescriptions: Record<number, string> = {
    // Flowlines
    46000: 'Stream/River',
    46003: 'Stream/River (Intermittent)',
    46006: 'Stream/River (Perennial)',
    46007: 'Stream/River (Ephemeral)',
    33600: 'Canal/Ditch',
    33601: 'Canal/Ditch (Aqueduct)',
    42800: 'Pipeline',
    42801: 'Pipeline (Aqueduct)',
    42803: 'Pipeline (Stormwater)',
    55800: 'Artificial Path',
    56600: 'Coastline',
    // Waterbodies
    39000: 'Lake/Pond',
    39001: 'Lake/Pond (Intermittent)',
    39004: 'Lake/Pond (Perennial)',
    43600: 'Reservoir',
    43601: 'Reservoir (Constructed)',
    43604: 'Reservoir (Aquaculture)',
    43613: 'Reservoir (Tailings Pond)',
    46100: 'Swamp/Marsh',
    46101: 'Swamp/Marsh (Intermittent)',
    36100: 'Playa',
    37800: 'Ice Mass',
    // Drainage Areas
    50301: 'Drainage Area',
  };

  return fcodeDescriptions[fcode] || `Feature Code: ${fcode}`;
}

/**
 * Format length for display (converts km to miles)
 */
export function formatLength(lengthKm: number | undefined): string | null {
  if (lengthKm === undefined || lengthKm === null) return null;
  const lengthMiles = lengthKm * 0.621371;
  if (lengthMiles < 0.1) {
    const lengthFeet = lengthMiles * 5280;
    return `${lengthFeet.toFixed(0)} ft`;
  }
  return `${lengthMiles.toFixed(2)} mi`;
}

/**
 * Format area for display (converts sq km to acres)
 */
export function formatArea(areaSqKm: number | undefined): string | null {
  if (areaSqKm === undefined || areaSqKm === null) return null;
  const areaAcres = areaSqKm * 247.105;
  if (areaAcres < 1) {
    const areaSqFt = areaSqKm * 10763910.4;
    return `${areaSqFt.toFixed(0)} sq ft`;
  }
  if (areaAcres >= 640) {
    const areaSqMi = areaAcres / 640;
    return `${areaSqMi.toFixed(2)} sq mi`;
  }
  return `${areaAcres.toFixed(1)} acres`;
}

/**
 * Build HTML tooltip for hydro feature
 */
export function buildHydroTooltip(
  featureType: HydroFeatureType,
  properties: HydroFeatureProperties
): string {
  const name = formatHydroName(properties);
  const typeLabel = getHydroTypeLabel(featureType);
  const fcodeDesc = formatFcodeDescription(properties);

  let content = `
    <div class="acb-hydro-tooltip">
      <div class="acb-hydro-tooltip-header">
        <strong>${name}</strong>
      </div>
      <div class="acb-hydro-tooltip-type">${typeLabel}</div>
  `;

  // Add FCODE description if available and different from type label
  if (fcodeDesc && fcodeDesc !== typeLabel) {
    content += `<div class="acb-hydro-tooltip-fcode">${fcodeDesc}</div>`;
  }

  // Add measurements based on feature type
  if (featureType === 'flowline') {
    const length = formatLength(properties.lengthkm);
    if (length) {
      content += `<div class="acb-hydro-tooltip-measurement">Length: ${length}</div>`;
    }
  } else if (featureType === 'waterbody' || featureType === 'drainagearea') {
    const area = formatArea(properties.areasqkm);
    if (area) {
      content += `<div class="acb-hydro-tooltip-measurement">Area: ${area}</div>`;
    }
  }

  content += '</div>';
  return content;
}

/**
 * Build simple text summary for hydro feature
 */
export function buildHydroSummary(
  featureType: HydroFeatureType,
  properties: HydroFeatureProperties
): string {
  const name = formatHydroName(properties);
  const typeLabel = getHydroTypeLabel(featureType);
  return `${name} - ${typeLabel}`;
}
