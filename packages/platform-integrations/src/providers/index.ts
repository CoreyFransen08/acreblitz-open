/**
 * Provider Adapters
 * 
 * Export all provider-related types, adapters, and utilities.
 */

// Types
export type {
  ProviderType,
  ProviderClient,
  FieldAdapter,
  BoundaryAdapter,
  ProviderAdapter,
  ListFieldsAdapterOptions,
  GetFieldAdapterOptions,
  ListBoundariesAdapterOptions,
  GetBoundaryAdapterOptions,
} from './types';

// Registry
export {
  getFieldAdapter,
  getBoundaryAdapter,
  registerFieldAdapter,
  registerBoundaryAdapter,
  hasFieldAdapter,
  hasBoundaryAdapter,
  getRegisteredProviders,
  isProviderFullySupported,
} from './registry';

// John Deere Provider
export {
  JohnDeereFieldAdapter,
  johnDeereFieldAdapter,
  JohnDeereBoundaryAdapter,
  johnDeereBoundaryAdapter,
} from './john-deere';
export type {
  JohnDeereFieldClient,
  JohnDeereBoundaryClient,
} from './john-deere';

