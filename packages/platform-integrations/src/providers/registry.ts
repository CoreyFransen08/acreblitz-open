/**
 * Provider Registry
 * 
 * Central registry for provider adapters. Allows looking up the correct
 * adapter implementation based on provider type.
 */

import type {
  ProviderType,
  FieldAdapter,
  BoundaryAdapter,
  WorkPlanAdapter,
} from './types';
import { johnDeereFieldAdapter } from './john-deere/field-adapter';
import { johnDeereBoundaryAdapter } from './john-deere/boundary-adapter';
import { johnDeereWorkPlanAdapter } from './john-deere/workplan-adapter';

// ============================================================================
// FIELD ADAPTER REGISTRY
// ============================================================================

/**
 * Registry of field adapters by provider type
 */
const fieldAdapters = new Map<ProviderType, FieldAdapter>();

// Register built-in adapters
fieldAdapters.set('john_deere', johnDeereFieldAdapter);

/**
 * Get the field adapter for a provider
 * @throws Error if provider is not supported
 */
export function getFieldAdapter(provider: ProviderType): FieldAdapter {
  const adapter = fieldAdapters.get(provider);
  if (!adapter) {
    throw new Error(`Unsupported provider: ${provider}. Available providers: ${[...fieldAdapters.keys()].join(', ')}`);
  }
  return adapter;
}

/**
 * Register a custom field adapter
 * Useful for testing or adding new providers at runtime
 */
export function registerFieldAdapter(provider: ProviderType, adapter: FieldAdapter): void {
  fieldAdapters.set(provider, adapter);
}

/**
 * Check if a field adapter is registered for a provider
 */
export function hasFieldAdapter(provider: ProviderType): boolean {
  return fieldAdapters.has(provider);
}

// ============================================================================
// BOUNDARY ADAPTER REGISTRY
// ============================================================================

/**
 * Registry of boundary adapters by provider type
 */
const boundaryAdapters = new Map<ProviderType, BoundaryAdapter>();

// Register built-in adapters
boundaryAdapters.set('john_deere', johnDeereBoundaryAdapter);

/**
 * Get the boundary adapter for a provider
 * @throws Error if provider is not supported
 */
export function getBoundaryAdapter(provider: ProviderType): BoundaryAdapter {
  const adapter = boundaryAdapters.get(provider);
  if (!adapter) {
    throw new Error(`Unsupported provider: ${provider}. Available providers: ${[...boundaryAdapters.keys()].join(', ')}`);
  }
  return adapter;
}

/**
 * Register a custom boundary adapter
 */
export function registerBoundaryAdapter(provider: ProviderType, adapter: BoundaryAdapter): void {
  boundaryAdapters.set(provider, adapter);
}

/**
 * Check if a boundary adapter is registered for a provider
 */
export function hasBoundaryAdapter(provider: ProviderType): boolean {
  return boundaryAdapters.has(provider);
}

// ============================================================================
// WORK PLAN ADAPTER REGISTRY
// ============================================================================

/**
 * Registry of work plan adapters by provider type
 */
const workPlanAdapters = new Map<ProviderType, WorkPlanAdapter>();

// Register built-in adapters
workPlanAdapters.set('john_deere', johnDeereWorkPlanAdapter);

/**
 * Get the work plan adapter for a provider
 * @throws Error if provider is not supported
 */
export function getWorkPlanAdapter(provider: ProviderType): WorkPlanAdapter {
  const adapter = workPlanAdapters.get(provider);
  if (!adapter) {
    throw new Error(`Unsupported provider: ${provider}. Available providers: ${[...workPlanAdapters.keys()].join(', ')}`);
  }
  return adapter;
}

/**
 * Register a custom work plan adapter
 * Useful for testing or adding new providers at runtime
 */
export function registerWorkPlanAdapter(provider: ProviderType, adapter: WorkPlanAdapter): void {
  workPlanAdapters.set(provider, adapter);
}

/**
 * Check if a work plan adapter is registered for a provider
 */
export function hasWorkPlanAdapter(provider: ProviderType): boolean {
  return workPlanAdapters.has(provider);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get list of all registered providers
 */
export function getRegisteredProviders(): ProviderType[] {
  const providers = new Set<ProviderType>([
    ...fieldAdapters.keys(),
    ...boundaryAdapters.keys(),
  ]);
  return [...providers];
}

/**
 * Check if a provider is fully supported (has all adapters)
 */
export function isProviderFullySupported(provider: ProviderType): boolean {
  return hasFieldAdapter(provider) && hasBoundaryAdapter(provider);
}

