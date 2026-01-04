import { createContext, useContext } from 'react';
import type { Map as LeafletMap } from 'leaflet';

/**
 * Context value for sharing the Leaflet map instance
 */
export interface MapContextValue {
  map: LeafletMap;
}

/**
 * Context for providing Leaflet map instance to child components
 * Replaces react-leaflet's useMap() hook
 */
export const MapContext = createContext<MapContextValue | null>(null);

/**
 * Hook to access the Leaflet map instance
 * Throws if used outside of MapContext.Provider or if map is not initialized
 *
 * @returns The Leaflet map instance
 * @throws Error if map is not available
 *
 * @example
 * ```tsx
 * function MyMapControl() {
 *   const map = useNativeMap();
 *   // Use map instance...
 *   return null;
 * }
 * ```
 */
export function useNativeMap(): LeafletMap {
  const context = useContext(MapContext);
  if (!context || !context.map) {
    throw new Error(
      'useNativeMap must be used within a Map component with an initialized map instance'
    );
  }
  return context.map;
}

/**
 * Hook to safely access the Leaflet map instance
 * Returns null if map is not available (instead of throwing)
 *
 * @returns The Leaflet map instance or null
 *
 * @example
 * ```tsx
 * function OptionalMapControl() {
 *   const map = useNativeMapSafe();
 *   if (!map) return null;
 *   // Use map instance...
 *   return null;
 * }
 * ```
 */
export function useNativeMapSafe(): LeafletMap | null {
  const context = useContext(MapContext);
  return context?.map ?? null;
}
