/**
 * Weather Radar Types for @acreblitz/react-components
 *
 * Types for animated weather radar overlay using Iowa State Mesonet NEXRAD WMS-T
 */

import type { TileLayerConfig } from './map';

// ============================================
// Playback State
// ============================================

/** Animation playback state */
export type RadarPlaybackState = 'playing' | 'paused' | 'loading';

// ============================================
// Configuration Types
// ============================================

/** Time range configuration for radar data */
export interface RadarTimeConfig {
  /** Number of minutes of history to show (default: 60) */
  historyMinutes?: number;
  /** Interval between frames in minutes (default: 5) */
  intervalMinutes?: number;
  /** Whether to include current/latest frame (default: true) */
  includeCurrent?: boolean;
}

/** Animation playback configuration */
export interface RadarAnimationConfig {
  /** Delay between frames in milliseconds (default: 500) */
  frameDelay?: number;
  /** Whether to auto-loop when reaching end (default: true) */
  loop?: boolean;
  /** Number of frames to pre-load ahead (default: 3) */
  preloadFrames?: number;
  /** Whether to start playing automatically (default: false) */
  autoPlay?: boolean;
  /** Pause duration on last frame before looping in ms (default: 2000) */
  loopPauseDelay?: number;
}

/** Configuration for animated tile layers (extends TileLayerConfig) */
export interface AnimatedTileLayerConfig extends TileLayerConfig {
  /** Mark this as an animated layer */
  animated: true;
  /** Type of animation (currently only 'time' supported) */
  animationType: 'time';
  /** WMS layer name */
  layers: string;
  /** Time range configuration */
  timeConfig?: RadarTimeConfig;
  /** Animation playback configuration */
  animationConfig?: RadarAnimationConfig;
}

// ============================================
// Radar Frame Types
// ============================================

/** A single radar frame */
export interface RadarFrame {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Date object for display */
  date: Date;
  /** WMS TIME parameter value */
  wmsTime: string;
  /** Whether frame is loaded */
  loaded: boolean;
  /** Loading error if any */
  error?: Error;
}

/** State of the radar animation */
export interface RadarAnimationState {
  /** All available frames */
  frames: RadarFrame[];
  /** Index of current frame */
  currentFrameIndex: number;
  /** Playback state */
  playbackState: RadarPlaybackState;
  /** Whether initial frames are loading */
  isInitializing: boolean;
  /** Current frame timestamp for display */
  currentTimestamp: Date | null;
}

// ============================================
// Hook Types
// ============================================

/** Options for useRadarAnimation hook */
export interface UseRadarAnimationOptions {
  /** Animation configuration */
  config: AnimatedTileLayerConfig;
  /** Override for history minutes */
  historyMinutes?: number;
  /** Override for interval minutes */
  intervalMinutes?: number;
  /** Override for frame delay */
  frameDelay?: number;
  /** Callback when frame changes */
  onFrameChange?: (frame: RadarFrame, index: number) => void;
  /** Callback when playback state changes */
  onPlaybackStateChange?: (state: RadarPlaybackState) => void;
}

/** Return type for useRadarAnimation hook */
export interface UseRadarAnimationResult {
  /** Current animation state */
  state: RadarAnimationState;
  /** Play animation */
  play: () => void;
  /** Pause animation */
  pause: () => void;
  /** Toggle play/pause */
  togglePlayback: () => void;
  /** Go to specific frame */
  goToFrame: (index: number) => void;
  /** Go to next frame */
  nextFrame: () => void;
  /** Go to previous frame */
  previousFrame: () => void;
  /** Go to latest (most recent) frame */
  goToLatest: () => void;
  /** Refresh frames (regenerate timestamps) */
  refresh: () => void;
  /** Current TIME parameter for WMS */
  currentWmsTime: string | null;
}

// ============================================
// Component Props
// ============================================

/** Props for WeatherRadarLayer component */
export interface WeatherRadarLayerProps {
  /** Layer configuration */
  config: AnimatedTileLayerConfig;
  /** Whether layer is visible */
  visible?: boolean;
  /** Override animation options */
  animationOptions?: Partial<RadarAnimationConfig>;
  /** Show animation controls */
  showControls?: boolean;
  /** Position of animation controls */
  controlsPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Callback when frame changes */
  onFrameChange?: (frame: RadarFrame, index: number) => void;
}

/** Props for RadarAnimationControls component */
export interface RadarAnimationControlsProps {
  /** Position of controls */
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  /** Animation state */
  state: RadarAnimationState;
  /** Play callback */
  onPlay: () => void;
  /** Pause callback */
  onPause: () => void;
  /** Seek to frame callback */
  onSeek: (index: number) => void;
  /** Custom class name */
  className?: string;
  /** Whether to show timestamp */
  showTimestamp?: boolean;
  /** Timestamp format (date-fns format string) */
  timestampFormat?: string;
  /** Whether controls are collapsed */
  collapsed?: boolean;
  /** Collapse toggle callback */
  onCollapsedChange?: (collapsed: boolean) => void;
}

// ============================================
// Type Guards
// ============================================

/** Check if a TileLayerConfig is an animated layer */
export function isAnimatedTileLayer(
  layer: TileLayerConfig
): layer is AnimatedTileLayerConfig {
  return 'animated' in layer && (layer as AnimatedTileLayerConfig).animated === true;
}
