/**
 * Shared OpenSea route cache-control helpers.
 * Single source of truth for isTransientStatus, resolveCacheControl, jsonWithCache.
 */

import { NextResponse } from 'next/server';

// Cache-Control header values
const CACHE_NO_STORE = 'no-store';
const CACHE_SUCCESS = 'public, s-maxage=300, stale-while-revalidate=60';
const CACHE_HARD_FAILURE = 'public, s-maxage=600, stale-while-revalidate=60';

/**
 * Determine if an HTTP status code represents a transient error.
 * Transient errors (429, 5xx) should NOT be cached - they may recover.
 */
export function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Determine if an HTTP status code should trigger failure caching.
 * Only hard failures (401, 403, 404) should be cached.
 */
export function shouldCacheFailureStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}

/**
 * Resolve the appropriate Cache-Control header based on request context.
 *
 * Priority:
 * 1. debug=true → always no-store (bypass CDN for fresh data)
 * 2. transient=true → no-store (don't cache 429/5xx)
 * 3. hard failure (401/403/404) → cache for 10 min
 * 4. success (2xx) → cache for 5 min
 * 5. fallback → no-store
 */
export function resolveCacheControl(opts: {
  debug?: boolean;
  transient: boolean;
  upstreamStatus: number;
  ok: boolean;
}): string {
  const { debug, transient, upstreamStatus, ok } = opts;

  if (debug) return CACHE_NO_STORE;
  if (transient) return CACHE_NO_STORE;
  if (shouldCacheFailureStatus(upstreamStatus)) return CACHE_HARD_FAILURE;
  if (ok) return CACHE_SUCCESS;
  return CACHE_NO_STORE;
}

/**
 * Create a NextResponse with uniform Cache-Control header handling.
 * Ensures every response path has an explicit Cache-Control header set.
 */
export function jsonWithCache<T>(
  body: T,
  cacheControl: string,
  status?: number
): NextResponse {
  const res = NextResponse.json(body, status ? { status } : undefined);
  res.headers.set('Cache-Control', cacheControl);
  return res;
}
