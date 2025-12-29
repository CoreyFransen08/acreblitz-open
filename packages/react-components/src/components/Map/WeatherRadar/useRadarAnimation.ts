/**
 * useRadarAnimation Hook
 *
 * Manages radar animation state, frame generation, and playback
 * Generates timestamps for the past N minutes at configurable intervals
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  UseRadarAnimationOptions,
  UseRadarAnimationResult,
  RadarAnimationState,
  RadarFrame,
} from '../../../types/weatherRadar';

/**
 * Generate radar frame timestamps for the past N minutes
 * Rounds to nearest interval and generates frames going backward
 */
function generateFrameTimestamps(
  historyMinutes: number,
  intervalMinutes: number,
  includeCurrent: boolean
): RadarFrame[] {
  const frames: RadarFrame[] = [];
  const now = new Date();

  // Round down to nearest interval
  const minutes = now.getMinutes();
  const roundedMinutes = Math.floor(minutes / intervalMinutes) * intervalMinutes;
  const latestTime = new Date(now);
  latestTime.setMinutes(roundedMinutes, 0, 0);

  // If not including current, go back one interval
  if (!includeCurrent) {
    latestTime.setMinutes(latestTime.getMinutes() - intervalMinutes);
  }

  // Generate frames going backward in time
  const numFrames = Math.ceil(historyMinutes / intervalMinutes);

  for (let i = numFrames - 1; i >= 0; i--) {
    const frameTime = new Date(latestTime);
    frameTime.setMinutes(frameTime.getMinutes() - i * intervalMinutes);

    const isoString = frameTime.toISOString();

    frames.push({
      timestamp: isoString,
      date: frameTime,
      wmsTime: isoString,
      loaded: false,
    });
  }

  return frames;
}

export function useRadarAnimation(
  options: UseRadarAnimationOptions
): UseRadarAnimationResult {
  const {
    config,
    historyMinutes = config.timeConfig?.historyMinutes ?? 60,
    intervalMinutes = config.timeConfig?.intervalMinutes ?? 5,
    frameDelay = config.animationConfig?.frameDelay ?? 500,
    onFrameChange,
    onPlaybackStateChange,
  } = options;

  const loop = config.animationConfig?.loop ?? true;
  const loopPauseDelay = config.animationConfig?.loopPauseDelay ?? 1500;
  const autoPlay = config.animationConfig?.autoPlay ?? false;
  const includeCurrent = config.timeConfig?.includeCurrent ?? true;

  // Generate initial frames
  const initialFrames = useMemo(
    () => generateFrameTimestamps(historyMinutes, intervalMinutes, includeCurrent),
    [historyMinutes, intervalMinutes, includeCurrent]
  );

  const [state, setState] = useState<RadarAnimationState>(() => ({
    frames: initialFrames,
    currentFrameIndex: initialFrames.length - 1, // Start at latest
    playbackState: autoPlay ? 'playing' : 'paused',
    isInitializing: true,
    currentTimestamp: initialFrames[initialFrames.length - 1]?.date || null,
  }));

  // Refs for stable references
  const stateRef = useRef(state);
  const onFrameChangeRef = useRef(onFrameChange);
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(state.playbackState === 'playing');

  // Keep refs updated
  useEffect(() => {
    stateRef.current = state;
    isPlayingRef.current = state.playbackState === 'playing';
  }, [state]);

  useEffect(() => {
    onFrameChangeRef.current = onFrameChange;
    onPlaybackStateChangeRef.current = onPlaybackStateChange;
  }, [onFrameChange, onPlaybackStateChange]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, []);

  // Mark initialization complete after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, isInitializing: false }));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Animation tick function - advances to next frame
  const tick = useCallback(() => {
    if (!isPlayingRef.current) return;

    const currentState = stateRef.current;
    const { frames, currentFrameIndex } = currentState;

    let nextIndex = currentFrameIndex + 1;
    const isLastFrame = nextIndex >= frames.length;

    if (isLastFrame) {
      if (loop) {
        // At last frame, pause briefly then loop to start
        animationTimerRef.current = setTimeout(() => {
          if (!isPlayingRef.current) return;

          const frame = stateRef.current.frames[0];
          setState((prev) => ({
            ...prev,
            currentFrameIndex: 0,
            currentTimestamp: frame?.date || null,
          }));
          onFrameChangeRef.current?.(frame, 0);

          // Continue animation
          animationTimerRef.current = setTimeout(tick, frameDelay);
        }, loopPauseDelay);
        return;
      } else {
        // Stop at end
        setState((prev) => ({ ...prev, playbackState: 'paused' }));
        onPlaybackStateChangeRef.current?.('paused');
        isPlayingRef.current = false;
        return;
      }
    }

    // Normal frame advance
    const nextFrame = frames[nextIndex];
    setState((prev) => ({
      ...prev,
      currentFrameIndex: nextIndex,
      currentTimestamp: nextFrame?.date || null,
    }));
    onFrameChangeRef.current?.(nextFrame, nextIndex);

    // Schedule next tick
    animationTimerRef.current = setTimeout(tick, frameDelay);
  }, [frameDelay, loop, loopPauseDelay]);

  // Play control
  const play = useCallback(() => {
    if (isPlayingRef.current) return;

    // Clear any existing timer
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }

    isPlayingRef.current = true;
    setState((prev) => ({ ...prev, playbackState: 'playing' }));
    onPlaybackStateChangeRef.current?.('playing');

    // Start animation loop
    animationTimerRef.current = setTimeout(tick, frameDelay);
  }, [tick, frameDelay]);

  // Pause control
  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;

    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    isPlayingRef.current = false;
    setState((prev) => ({ ...prev, playbackState: 'paused' }));
    onPlaybackStateChangeRef.current?.('paused');
  }, []);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  // Go to specific frame
  const goToFrame = useCallback((index: number) => {
    const frames = stateRef.current.frames;
    const clampedIndex = Math.max(0, Math.min(index, frames.length - 1));
    const frame = frames[clampedIndex];

    setState((prev) => ({
      ...prev,
      currentFrameIndex: clampedIndex,
      currentTimestamp: frame?.date || null,
    }));
    onFrameChangeRef.current?.(frame, clampedIndex);
  }, []);

  // Next frame
  const nextFrame = useCallback(() => {
    const { frames, currentFrameIndex } = stateRef.current;
    const nextIndex = Math.min(currentFrameIndex + 1, frames.length - 1);
    const frame = frames[nextIndex];

    setState((prev) => ({
      ...prev,
      currentFrameIndex: nextIndex,
      currentTimestamp: frame?.date || null,
    }));
    onFrameChangeRef.current?.(frame, nextIndex);
  }, []);

  // Previous frame
  const previousFrame = useCallback(() => {
    const { frames, currentFrameIndex } = stateRef.current;
    const prevIndex = Math.max(currentFrameIndex - 1, 0);
    const frame = frames[prevIndex];

    setState((prev) => ({
      ...prev,
      currentFrameIndex: prevIndex,
      currentTimestamp: frame?.date || null,
    }));
    onFrameChangeRef.current?.(frame, prevIndex);
  }, []);

  // Go to latest frame
  const goToLatest = useCallback(() => {
    const frames = stateRef.current.frames;
    const latestIndex = frames.length - 1;
    const frame = frames[latestIndex];

    setState((prev) => ({
      ...prev,
      currentFrameIndex: latestIndex,
      currentTimestamp: frame?.date || null,
    }));
    onFrameChangeRef.current?.(frame, latestIndex);
  }, []);

  // Refresh frames (regenerate timestamps)
  const refresh = useCallback(() => {
    // Stop any running animation
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    isPlayingRef.current = false;

    const newFrames = generateFrameTimestamps(historyMinutes, intervalMinutes, includeCurrent);
    setState({
      frames: newFrames,
      currentFrameIndex: newFrames.length - 1,
      playbackState: 'paused',
      isInitializing: true,
      currentTimestamp: newFrames[newFrames.length - 1]?.date || null,
    });

    // Mark initialization complete after delay
    setTimeout(() => {
      setState((prev) => ({ ...prev, isInitializing: false }));
    }, 500);
  }, [historyMinutes, intervalMinutes, includeCurrent]);

  // Current WMS TIME parameter
  const currentWmsTime = state.frames[state.currentFrameIndex]?.wmsTime || null;

  return {
    state,
    play,
    pause,
    togglePlayback,
    goToFrame,
    nextFrame,
    previousFrame,
    goToLatest,
    refresh,
    currentWmsTime,
  };
}
