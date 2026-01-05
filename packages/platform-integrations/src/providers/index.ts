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
  WorkPlanAdapter,
  ProviderAdapter,
  ListFieldsAdapterOptions,
  GetFieldAdapterOptions,
  ListBoundariesAdapterOptions,
  GetBoundaryAdapterOptions,
  ListWorkPlansAdapterOptions,
  GetWorkPlanAdapterOptions,
} from './types';

// Registry
export {
  getFieldAdapter,
  getBoundaryAdapter,
  getWorkPlanAdapter,
  registerFieldAdapter,
  registerBoundaryAdapter,
  registerWorkPlanAdapter,
  hasFieldAdapter,
  hasBoundaryAdapter,
  hasWorkPlanAdapter,
  getRegisteredProviders,
  isProviderFullySupported,
} from './registry';

// John Deere Provider
export {
  JohnDeereFieldAdapter,
  johnDeereFieldAdapter,
  JohnDeereBoundaryAdapter,
  johnDeereBoundaryAdapter,
  JohnDeereWorkPlanAdapter,
  johnDeereWorkPlanAdapter,
} from './john-deere';
export type {
  JohnDeereFieldClient,
  JohnDeereBoundaryClient,
  JohnDeereWorkPlanClient,
} from './john-deere';

