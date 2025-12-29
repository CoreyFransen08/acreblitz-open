/**
 * RadarAnimationControls Component
 *
 * Playback controls for radar animation
 * Play/pause button, timeline slider, timestamp display
 */

import { useState, useCallback, useMemo } from 'react';
import type { RadarAnimationControlsProps } from '../../../types/weatherRadar';
import './RadarAnimationControls.css';

// Position class mapping
const POSITION_CLASSES: Record<string, string> = {
  topleft: 'acb-radar-controls--topleft',
  topright: 'acb-radar-controls--topright',
  bottomleft: 'acb-radar-controls--bottomleft',
  bottomright: 'acb-radar-controls--bottomright',
};

/**
 * Format a date to time string (e.g., "3:45 PM")
 */
function formatTime(date: Date, includeAmPm: boolean = true): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  if (includeAmPm) {
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }
  return `${displayHours}:${displayMinutes}`;
}

export function RadarAnimationControls({
  position = 'bottomleft',
  state,
  onPlay,
  onPause,
  onSeek,
  className = '',
  showTimestamp = true,
  collapsed: initialCollapsed = false,
  onCollapsedChange,
}: RadarAnimationControlsProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const { frames, currentFrameIndex, playbackState, isInitializing, currentTimestamp } = state;

  const isPlaying = playbackState === 'playing';

  // Handle collapse toggle
  const handleToggleCollapsed = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  // Handle play/pause click
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [isPlaying, onPlay, onPause]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = parseInt(e.target.value, 10);
      onSeek(index);
    },
    [onSeek]
  );

  // Format timestamp for display
  const formattedTimestamp = useMemo(() => {
    if (!currentTimestamp) return '--:--';
    return formatTime(currentTimestamp, true);
  }, [currentTimestamp]);

  // Time range display (first and last frame times)
  const timeRange = useMemo(() => {
    if (frames.length === 0) return { start: '--:--', end: '--:--' };
    return {
      start: formatTime(frames[0].date, false),
      end: formatTime(frames[frames.length - 1].date, true),
    };
  }, [frames]);

  const positionClass = POSITION_CLASSES[position] || POSITION_CLASSES.bottomleft;
  const collapsedClass = isCollapsed ? 'acb-radar-controls--collapsed' : '';

  return (
    <div className={`acb-radar-controls ${positionClass} ${collapsedClass} ${className}`.trim()}>
      {/* Header */}
      <div
        className="acb-radar-controls__header"
        onClick={handleToggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleToggleCollapsed();
          }
        }}
        aria-expanded={!isCollapsed}
      >
        <span className="acb-radar-controls__title">Radar</span>
        {showTimestamp && !isCollapsed && (
          <span className="acb-radar-controls__timestamp">{formattedTimestamp}</span>
        )}
        <svg
          className="acb-radar-controls__toggle"
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
      <div className="acb-radar-controls__content">
        {/* Play/Pause Button */}
        <button
          className="acb-radar-controls__play-btn"
          onClick={handlePlayPause}
          disabled={isInitializing}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          type="button"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Timeline Slider */}
        <div className="acb-radar-controls__timeline">
          <span className="acb-radar-controls__time-label">{timeRange.start}</span>
          <input
            type="range"
            className="acb-radar-controls__slider"
            min={0}
            max={frames.length - 1}
            value={currentFrameIndex}
            onChange={handleSliderChange}
            disabled={isInitializing}
            aria-label="Radar time"
          />
          <span className="acb-radar-controls__time-label">{timeRange.end}</span>
        </div>

        {/* Loading indicator */}
        {isInitializing && (
          <div className="acb-radar-controls__loading">
            <svg className="acb-radar-controls__spinner" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                strokeWidth="2"
                strokeDasharray="32"
                strokeLinecap="round"
                fill="none"
                stroke="currentColor"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
