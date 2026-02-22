/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Per-instance only (won't share across Vercel serverless instances),
 * but still throttles rapid-fire from a single client hitting the same instance.
 */

const windows = new Map<string, number[]>();

/** Returns true if the key has exceeded `maxRequests` within `windowMs`. */
export function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = windows.get(key) ?? [];
  const valid = timestamps.filter(t => t > now - windowMs);
  if (valid.length >= maxRequests) {
    windows.set(key, valid);
    return true;
  }
  valid.push(now);
  windows.set(key, valid);
  return false;
}

// Prune stale keys every 60s to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windows) {
    const valid = timestamps.filter(t => t > now - 120_000);
    if (valid.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, valid);
    }
  }
}, 60_000).unref?.();
