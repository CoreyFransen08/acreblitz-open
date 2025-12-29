/**
 * Soil Properties Utilities
 *
 * Formatting and display utilities for SSURGO soil properties
 * Uses actual SSURGO WFS property names from mapunitpolyextended layer
 */

import type { SoilProperty, SoilFeatureProperties } from '../../../../types/dataOverlay';

// ============================================
// Property Display Names
// ============================================

const PROPERTY_LABELS: Record<SoilProperty, string> = {
  drainageClass: 'Drainage',
  farmlandClassification: 'Farmland Class',
  landCapabilityClass: 'Land Capability',
  hydricRating: 'Hydric Rating',
  soilTexture: 'Soil Texture',
  slope: 'Slope',
  awc: 'Available Water (0-100cm)',
};

// Map WFS property names to our property keys
// Exported for consumers who need to map WFS properties
export const WFS_PROPERTY_MAP: Record<string, SoilProperty> = {
  drclassdcd: 'drainageClass',
  farmlndcl: 'farmlandClassification',
  niccdcd: 'landCapabilityClass', // Non-irrigated capability class
  iccdcd: 'landCapabilityClass', // Irrigated capability class
  hydgrpdcd: 'hydricRating', // Hydrologic group (A, B, C, D)
  texdesc: 'soilTexture',
  slopegradwta: 'slope',
  aws0100wta: 'awc', // Available water storage 0-100cm
};

// ============================================
// Formatting Functions
// ============================================

/**
 * Get the display label for a property
 */
export function getPropertyLabel(property: SoilProperty): string {
  return PROPERTY_LABELS[property] || property;
}

/**
 * Format a soil property value for display
 */
export function formatSoilProperty(property: SoilProperty, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  switch (property) {
    case 'landCapabilityClass':
      // Format land capability class (e.g., "2" -> "Class 2")
      return `Class ${value}`;

    case 'slope':
      // Format slope as percentage
      return typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`;

    case 'awc':
      // Format AWC in cm
      return typeof value === 'number' ? `${value.toFixed(1)} cm` : `${value} cm`;

    case 'hydricRating':
      // Hydrologic group - add description
      if (typeof value === 'string') {
        const descriptions: Record<string, string> = {
          A: 'A (Low runoff)',
          B: 'B (Moderate runoff)',
          C: 'C (Mod-high runoff)',
          D: 'D (High runoff)',
        };
        return descriptions[value.toUpperCase()] || value;
      }
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Get a property value from SSURGO feature properties
 * Uses actual SSURGO WFS property names
 */
export function getSoilPropertyValue(
  properties: SoilFeatureProperties,
  property: SoilProperty
): unknown {
  // Access properties using both our keys and raw SSURGO names
  const rawProps = properties as Record<string, unknown>;

  switch (property) {
    case 'drainageClass':
      return rawProps.drclassdcd ?? properties.drclassdcd;
    case 'farmlandClassification':
      return rawProps.farmlndcl ?? properties.farmlndcl;
    case 'landCapabilityClass':
      // Try non-irrigated first, then irrigated
      return rawProps.niccdcd ?? rawProps.iccdcd ?? properties.niccdcd ?? properties.iccdcd;
    case 'hydricRating':
      // Use hydrologic group (A, B, C, D)
      return rawProps.hydgrpdcd ?? properties.hydgrpdcd;
    case 'slope':
      return rawProps.slopegradwta ?? properties.slopegradwta;
    case 'awc':
      return rawProps.aws0100wta ?? properties.aws0100wta;
    default:
      return rawProps[property];
  }
}

// ============================================
// Tooltip Building
// ============================================

/**
 * Build HTML tooltip content for a soil feature
 * Shows farmer-relevant soil properties
 */
export function buildSoilTooltip(
  properties: SoilFeatureProperties,
  displayProperties?: SoilProperty[]
): string {
  // Access raw properties
  const rawProps = properties as Record<string, unknown>;

  // Default to farmer-relevant properties
  const propsToShow = displayProperties || [
    'drainageClass',
    'hydricRating',
    'slope',
    'landCapabilityClass',
    'awc',
  ];

  const rows = propsToShow
    .map((prop) => {
      const value = getSoilPropertyValue(properties, prop);
      // Skip if value is empty/null
      if (value === null || value === undefined || value === '') return '';
      const formattedValue = formatSoilProperty(prop, value);
      const label = getPropertyLabel(prop);
      return `
        <div class="acb-soil-tooltip__property">
          <span class="acb-soil-tooltip__label">${label}:</span>
          <span class="acb-soil-tooltip__value">${formattedValue}</span>
        </div>
      `;
    })
    .filter((row) => row !== '')
    .join('');

  // Get soil name
  const title = rawProps.muname || properties.muname || rawProps.musym || properties.musym || 'Unknown Soil';

  // Add flood frequency if available
  const floodFreq = rawProps.flodfreqdcd;
  const floodRow =
    floodFreq && floodFreq !== 'None'
      ? `<div class="acb-soil-tooltip__property">
          <span class="acb-soil-tooltip__label">Flood Risk:</span>
          <span class="acb-soil-tooltip__value">${floodFreq}</span>
        </div>`
      : '';

  return `
    <div class="acb-soil-tooltip">
      <div class="acb-soil-tooltip__title">${title}</div>
      ${rows}
      ${floodRow}
      <div class="acb-soil-tooltip__hint">Click to select</div>
    </div>
  `;
}

/**
 * Build a simple text summary of soil properties
 */
export function buildSoilSummary(
  properties: SoilFeatureProperties,
  displayProperties?: SoilProperty[]
): string {
  const rawProps = properties as Record<string, unknown>;
  const propsToShow = displayProperties || ['drainageClass', 'hydricRating'];

  const parts = propsToShow
    .map((prop) => {
      const value = getSoilPropertyValue(properties, prop);
      if (value === null || value === undefined || value === '') return null;
      return formatSoilProperty(prop, value);
    })
    .filter(Boolean);

  const name = rawProps.muname || properties.muname || rawProps.musym || properties.musym || 'Unknown Soil';
  return `${name}${parts.length > 0 ? ` - ${parts.join(', ')}` : ''}`;
}
