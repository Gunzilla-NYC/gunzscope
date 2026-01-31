/**
 * Development Utilities
 *
 * Environment detection and dev-only assertions for invariant checking.
 * All helpers are tree-shaken in production builds.
 */

// =============================================================================
// Environment Detection
// =============================================================================

/** True if running in development mode */
export const isDev = process.env.NODE_ENV === 'development';

/** True if running in test environment */
export const isTest =
  process.env.NODE_ENV === 'test' ||
  typeof (globalThis as Record<string, unknown>).__vitest_worker__ !== 'undefined';

/** True if running in production mode */
export const isProd = process.env.NODE_ENV === 'production';

// =============================================================================
// Dev-Only Assertion
// =============================================================================

const assertedOnce = new Set<string>();

/**
 * Assert a condition in development mode only.
 * Logs a warning (once per key) if condition fails.
 * Does nothing in test or production.
 *
 * @param condition - Condition to check
 * @param message - Warning message if condition fails
 * @param meta - Optional metadata to include in warning
 *
 * @example
 * assertDev(value > 0, 'value_positive', 'Value must be positive', { value });
 */
export function assertDev(
  condition: unknown,
  key: string,
  message: string,
  meta?: unknown
): void {
  // Only run in dev, never in test or prod
  if (!isDev || isTest) return;
  if (condition) return;

  // Only warn once per key to prevent console spam
  if (assertedOnce.has(key)) return;
  assertedOnce.add(key);

  if (meta !== undefined) {
    console.warn(`[ASSERT:${key}] ${message}`, meta);
  } else {
    console.warn(`[ASSERT:${key}] ${message}`);
  }
}

/**
 * TEST-ONLY: Reset assertDev state between tests.
 */
export function __resetAssertDevForTests(): void {
  if (!isTest) {
    console.error('__resetAssertDevForTests should only be called in tests');
    return;
  }
  assertedOnce.clear();
}
