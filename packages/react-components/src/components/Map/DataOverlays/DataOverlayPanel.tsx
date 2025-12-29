/**
 * DataOverlayPanel Component
 *
 * UI panel for toggling data overlay visibility
 * Positioned as a Leaflet control-like panel
 */

import { useState, useCallback, useMemo } from 'react';
import { useDataOverlay } from './hooks';
import type { DataOverlayPanelProps, AnyDataOverlayConfig } from '../../../types/dataOverlay';
import './DataOverlayPanel.css';

// Position class mapping
const POSITION_CLASSES: Record<string, string> = {
  topleft: 'acb-data-overlay-panel--topleft',
  topright: 'acb-data-overlay-panel--topright',
  bottomleft: 'acb-data-overlay-panel--bottomleft',
  bottomright: 'acb-data-overlay-panel--bottomright',
};

// Default icons for overlay types
const TYPE_ICONS: Record<string, string> = {
  soil: '\uD83C\uDF3E', // sheaf of rice emoji
  wfs: '\uD83D\uDDFA', // world map emoji
  'esri-feature': '\uD83C\uDF10', // globe emoji
  geojson: '\uD83D\uDCCD', // pin emoji
};

export function DataOverlayPanel({
  position = 'topright',
  collapsed: initialCollapsed = false,
  title = 'Data Layers',
  showCategories = true,
  className = '',
}: DataOverlayPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const { overlays, visibility, loading, toggleOverlay } = useDataOverlay();

  // Toggle collapsed state
  const handleToggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Group overlays by category
  const groupedOverlays = useMemo(() => {
    if (!showCategories) {
      return { '': overlays };
    }

    const groups: Record<string, AnyDataOverlayConfig[]> = {};
    overlays.forEach((overlay) => {
      const category = overlay.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(overlay);
    });

    return groups;
  }, [overlays, showCategories]);

  // Get icon for overlay
  const getOverlayIcon = (overlay: AnyDataOverlayConfig): React.ReactNode => {
    if (overlay.icon) {
      if (typeof overlay.icon === 'string') {
        return <span className="acb-data-overlay-panel__icon">{overlay.icon}</span>;
      }
      return overlay.icon;
    }

    // Default icon based on type or ID
    const typeIcon =
      TYPE_ICONS[overlay.id.includes('soil') ? 'soil' : overlay.type] || TYPE_ICONS.geojson;
    return <span className="acb-data-overlay-panel__icon">{typeIcon}</span>;
  };

  // Don't render if no overlays
  if (overlays.length === 0) {
    return null;
  }

  const positionClass = POSITION_CLASSES[position] || POSITION_CLASSES.topright;
  const collapsedClass = isCollapsed ? 'acb-data-overlay-panel--collapsed' : '';

  return (
    <div className={`acb-data-overlay-panel ${positionClass} ${collapsedClass} ${className}`.trim()}>
      {/* Header */}
      <div
        className="acb-data-overlay-panel__header"
        onClick={handleToggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleToggleCollapsed();
          }
        }}
        aria-expanded={!isCollapsed}
        aria-controls="data-overlay-content"
      >
        <h3 className="acb-data-overlay-panel__title">{title}</h3>
        <svg
          className="acb-data-overlay-panel__toggle"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="acb-data-overlay-panel__content" id="data-overlay-content">
        {Object.entries(groupedOverlays).map(([category, categoryOverlays]) => (
          <div key={category || 'default'} className="acb-data-overlay-panel__group">
            {showCategories && category && (
              <div className="acb-data-overlay-panel__category">{category}</div>
            )}
            {categoryOverlays.map((overlay) => {
              const isVisible = visibility[overlay.id] ?? false;
              const isLoading = loading[overlay.id] ?? false;

              return (
                <label
                  key={overlay.id}
                  className="acb-data-overlay-panel__item"
                  htmlFor={`overlay-${overlay.id}`}
                >
                  <input
                    type="checkbox"
                    id={`overlay-${overlay.id}`}
                    className="acb-data-overlay-panel__checkbox"
                    checked={isVisible}
                    onChange={() => toggleOverlay(overlay.id)}
                    aria-label={`Toggle ${overlay.name}`}
                  />
                  {getOverlayIcon(overlay)}
                  <span className="acb-data-overlay-panel__label">{overlay.name}</span>
                  {isLoading && (
                    <svg
                      className="acb-data-overlay-panel__loading"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-label="Loading"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        strokeWidth="2"
                        strokeDasharray="32"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
