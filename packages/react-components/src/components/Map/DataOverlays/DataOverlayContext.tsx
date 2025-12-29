/**
 * DataOverlayContext
 *
 * React Context for managing data overlay state (visibility, selection, loading, errors)
 */

import { createContext, useReducer, useCallback, type ReactNode } from 'react';
import type {
  DataOverlayState,
  DataOverlayContextValue,
  AnyDataOverlayConfig,
  DataOverlayVisibility,
  SoilFeature,
  HydroFeature,
} from '../../../types/dataOverlay';

// ============================================
// Context
// ============================================

export const DataOverlayContext = createContext<DataOverlayContextValue | null>(null);

// ============================================
// Reducer
// ============================================

type Action =
  | { type: 'TOGGLE_OVERLAY'; payload: string }
  | { type: 'SET_OVERLAY_VISIBLE'; payload: { id: string; visible: boolean } }
  | { type: 'SELECT_FEATURE'; payload: { overlayId: string; feature: SoilFeature } }
  | { type: 'REPLACE_SELECTION'; payload: { overlayId: string; feature: SoilFeature } }
  | { type: 'DESELECT_FEATURE'; payload: { overlayId: string; featureId: string } }
  | { type: 'CLEAR_SELECTION'; payload: string }
  | { type: 'CLEAR_ALL_SELECTIONS' }
  | { type: 'SET_LOADING'; payload: { overlayId: string; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { overlayId: string; error: Error | null } }
  | { type: 'REGISTER_OVERLAY'; payload: AnyDataOverlayConfig }
  | { type: 'UNREGISTER_OVERLAY'; payload: string };

function dataOverlayReducer(state: DataOverlayState, action: Action): DataOverlayState {
  switch (action.type) {
    case 'TOGGLE_OVERLAY':
      return {
        ...state,
        visibility: {
          ...state.visibility,
          [action.payload]: !state.visibility[action.payload],
        },
      };

    case 'SET_OVERLAY_VISIBLE':
      return {
        ...state,
        visibility: {
          ...state.visibility,
          [action.payload.id]: action.payload.visible,
        },
      };

    case 'SELECT_FEATURE': {
      const { overlayId, feature } = action.payload;
      const currentSelection = state.selection[overlayId] as SoilFeature[] || [];

      // Prevent duplicate selection
      if (currentSelection.some((f) => f.id === feature.id)) {
        return state;
      }

      return {
        ...state,
        selection: {
          ...state.selection,
          [overlayId]: [...currentSelection, feature],
          // Also update soilFeatures if this is the soil overlay
          soilFeatures: overlayId.includes('soil')
            ? [...(state.selection.soilFeatures || []), feature]
            : state.selection.soilFeatures,
          // Also update hydroFeatures if this is the hydro overlay
          hydroFeatures: overlayId.includes('hydro')
            ? [...(state.selection.hydroFeatures || []), feature as unknown as HydroFeature]
            : state.selection.hydroFeatures,
        },
      };
    }

    case 'REPLACE_SELECTION': {
      const { overlayId, feature } = action.payload;
      // Replace selection with just this feature (single-select mode)
      return {
        ...state,
        selection: {
          ...state.selection,
          [overlayId]: [feature],
          soilFeatures: overlayId.includes('soil') ? [feature] : state.selection.soilFeatures,
          hydroFeatures: overlayId.includes('hydro')
            ? [feature as unknown as HydroFeature]
            : state.selection.hydroFeatures,
        },
      };
    }

    case 'DESELECT_FEATURE': {
      const { overlayId, featureId } = action.payload;
      const currentSelection = state.selection[overlayId] as SoilFeature[] || [];

      return {
        ...state,
        selection: {
          ...state.selection,
          [overlayId]: currentSelection.filter((f) => f.id !== featureId),
          soilFeatures: overlayId.includes('soil')
            ? (state.selection.soilFeatures || []).filter((f) => f.id !== featureId)
            : state.selection.soilFeatures,
          hydroFeatures: overlayId.includes('hydro')
            ? (state.selection.hydroFeatures || []).filter((f) => f.id !== featureId)
            : state.selection.hydroFeatures,
        },
      };
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selection: {
          ...state.selection,
          [action.payload]: [],
          soilFeatures: action.payload.includes('soil')
            ? []
            : state.selection.soilFeatures,
          hydroFeatures: action.payload.includes('hydro')
            ? []
            : state.selection.hydroFeatures,
        },
      };

    case 'CLEAR_ALL_SELECTIONS':
      return {
        ...state,
        selection: {
          soilFeatures: [],
          hydroFeatures: [],
        },
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.overlayId]: action.payload.loading,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.overlayId]: action.payload.error,
        },
      };

    case 'REGISTER_OVERLAY':
      // Don't add duplicate overlays
      if (state.overlays.some((o) => o.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        overlays: [...state.overlays, action.payload],
        visibility: {
          ...state.visibility,
          [action.payload.id]: action.payload.defaultVisible ?? false,
        },
      };

    case 'UNREGISTER_OVERLAY':
      return {
        ...state,
        overlays: state.overlays.filter((o) => o.id !== action.payload),
      };

    default:
      return state;
  }
}

// ============================================
// Provider Props
// ============================================

export interface DataOverlayProviderProps {
  children: ReactNode;
  overlays?: AnyDataOverlayConfig[];
  defaultVisibility?: DataOverlayVisibility;
}

// ============================================
// Provider Component
// ============================================

export function DataOverlayProvider({
  children,
  overlays = [],
  defaultVisibility = {},
}: DataOverlayProviderProps) {
  // Initialize visibility from overlays and defaultVisibility prop
  const initialVisibility: DataOverlayVisibility = {};
  overlays.forEach((overlay) => {
    initialVisibility[overlay.id] =
      defaultVisibility[overlay.id] ?? overlay.defaultVisible ?? false;
  });

  const initialState: DataOverlayState = {
    overlays,
    visibility: initialVisibility,
    selection: {
      soilFeatures: [],
      hydroFeatures: [],
    },
    loading: {},
    errors: {},
  };

  const [state, dispatch] = useReducer(dataOverlayReducer, initialState);

  // Action creators
  const toggleOverlay = useCallback((overlayId: string) => {
    dispatch({ type: 'TOGGLE_OVERLAY', payload: overlayId });
  }, []);

  const setOverlayVisible = useCallback((overlayId: string, visible: boolean) => {
    dispatch({ type: 'SET_OVERLAY_VISIBLE', payload: { id: overlayId, visible } });
  }, []);

  const selectFeature = useCallback((overlayId: string, feature: SoilFeature) => {
    dispatch({ type: 'SELECT_FEATURE', payload: { overlayId, feature } });
  }, []);

  const replaceSelection = useCallback((overlayId: string, feature: SoilFeature) => {
    dispatch({ type: 'REPLACE_SELECTION', payload: { overlayId, feature } });
  }, []);

  const deselectFeature = useCallback((overlayId: string, featureId: string) => {
    dispatch({ type: 'DESELECT_FEATURE', payload: { overlayId, featureId } });
  }, []);

  const clearSelection = useCallback((overlayId: string) => {
    dispatch({ type: 'CLEAR_SELECTION', payload: overlayId });
  }, []);

  const clearAllSelections = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_SELECTIONS' });
  }, []);

  const setLoading = useCallback((overlayId: string, loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { overlayId, loading } });
  }, []);

  const setError = useCallback((overlayId: string, error: Error | null) => {
    dispatch({ type: 'SET_ERROR', payload: { overlayId, error } });
  }, []);

  const contextValue: DataOverlayContextValue = {
    ...state,
    toggleOverlay,
    setOverlayVisible,
    selectFeature,
    replaceSelection,
    deselectFeature,
    clearSelection,
    clearAllSelections,
    setLoading,
    setError,
  };

  return (
    <DataOverlayContext.Provider value={contextValue}>
      {children}
    </DataOverlayContext.Provider>
  );
}
