"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useThreadViewport } from "@assistant-ui/react";

// Minimum scroll distance (in pixels) to trigger scroll-up detection
const SCROLL_THRESHOLD = 10;

/**
 * Hook to control ThreadPrimitive.Viewport autoScroll behavior.
 *
 * By default, the thread is sticky to the bottom (autoScroll=true).
 * When the user scrolls up, autoScroll is disabled so they can read
 * earlier content without being forced back to the bottom.
 * Auto-scroll is re-enabled when:
 * - User clicks the scroll-to-bottom button
 * - User manually scrolls back to the bottom
 */
export function useAutoScrollControl() {
  const [autoScroll, setAutoScroll] = useState(true);
  const lastScrollTopRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useThreadViewport((v) => v.isAtBottom);

  // Re-enable auto-scroll when user manually scrolls to bottom
  useEffect(() => {
    if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  }, [isAtBottom, autoScroll]);

  // Handle scroll events to detect intentional scroll up
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    const currentScrollTop = target.scrollTop;
    const lastScrollTop = lastScrollTopRef.current;
    const scrollDelta = lastScrollTop - currentScrollTop;

    // User is scrolling up by more than threshold - disable auto-scroll
    if (scrollDelta > SCROLL_THRESHOLD) {
      setAutoScroll(false);
    }

    lastScrollTopRef.current = currentScrollTop;
  }, []);

  // Attach scroll listener to viewport
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Function to scroll to bottom and re-enable sticky behavior
  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
  }, []);

  return {
    autoScroll,
    viewportRef,
    scrollToBottom,
  };
}
