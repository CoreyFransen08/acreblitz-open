/**
 * UI Data Cache
 *
 * Stores large uiData payloads separately from tool results to prevent
 * them from being sent to the LLM, saving 6,000-13,000 tokens per tool call.
 *
 * Flow:
 * 1. Tool generates uiData and calls storeUIData(uiData) -> returns ID
 * 2. Tool returns { success, agentSummary, uiDataRef: id } to LLM (minimal tokens)
 * 3. Stream processor calls getUIData(id) and injects into response for client
 * 4. Cache auto-cleans entries older than TTL
 */

import { randomUUID } from "crypto";

interface CacheEntry {
  data: unknown;
  createdAt: number;
}

// 5 minute TTL - enough time for streaming to complete
const CACHE_TTL_MS = 5 * 60 * 1000;

// In-memory cache
const cache = new Map<string, CacheEntry>();

/**
 * Store uiData and return a reference ID
 */
export function storeUIData(data: unknown): string {
  // Clean old entries first
  cleanExpiredEntries();

  const id = randomUUID();
  cache.set(id, {
    data,
    createdAt: Date.now(),
  });

  return id;
}

/**
 * Retrieve uiData by reference ID
 * Returns undefined if not found or expired
 */
export function getUIData(id: string): unknown | undefined {
  const entry = cache.get(id);
  if (!entry) return undefined;

  // Check if expired
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(id);
    return undefined;
  }

  return entry.data;
}

/**
 * Remove uiData from cache after it's been used
 */
export function removeUIData(id: string): void {
  cache.delete(id);
}

/**
 * Clean expired entries (called automatically on store)
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  for (const [id, entry] of cache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      cache.delete(id);
    }
  }
}

/**
 * Get cache stats (for debugging)
 */
export function getCacheStats(): { size: number; oldestAge: number | null } {
  let oldestAge: number | null = null;
  const now = Date.now();

  for (const entry of cache.values()) {
    const age = now - entry.createdAt;
    if (oldestAge === null || age > oldestAge) {
      oldestAge = age;
    }
  }

  return { size: cache.size, oldestAge };
}
