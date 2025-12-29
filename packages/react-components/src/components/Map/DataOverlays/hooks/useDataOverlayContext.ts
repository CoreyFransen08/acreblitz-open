/**
 * useDataOverlayContext Hook
 *
 * Hook to access data overlay context with error handling
 */

import { useContext } from 'react';
import { DataOverlayContext } from '../DataOverlayContext';
import type { DataOverlayContextValue } from '../../../../types/dataOverlay';

/**
 * Access the data overlay context
 * @throws Error if used outside of DataOverlayProvider
 */
export function useDataOverlay(): DataOverlayContextValue {
  const context = useContext(DataOverlayContext);

  if (!context) {
    throw new Error(
      'useDataOverlay must be used within a DataOverlayProvider. ' +
      'Make sure the Map component has dataOverlays.enabled set to true.'
    );
  }

  return context;
}

/**
 * Safely access the data overlay context (returns null if not available)
 * Use this when you're not sure if the context is available
 */
export function useDataOverlaySafe(): DataOverlayContextValue | null {
  return useContext(DataOverlayContext);
}
