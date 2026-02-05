/**
 * Request Deduplication Utility
 *
 * Prevents duplicate RPC/API calls by reusing pending requests.
 * When a request for the same key is already in-flight, returns the
 * existing promise instead of creating a new request.
 */

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

const pendingRequests = new Map<string, PendingRequest<unknown>>();
const REQUEST_TTL_MS = 5000; // 5 seconds - cache in-flight requests

/**
 * Deduplicate a request by key. If a request with the same key is
 * already pending, returns the existing promise instead of making
 * a new request.
 *
 * @param key - Unique identifier for the request (e.g., "acquisition:contract:tokenId:wallet")
 * @param requestFn - Function that makes the actual request
 * @returns Promise that resolves to the request result
 *
 * @example
 * ```typescript
 * const data = await deduplicateRequest(
 *   `nft:${contract}:${tokenId}`,
 *   () => fetchNFTData(contract, tokenId)
 * );
 * ```
 */
export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check for existing pending request within TTL
  const existing = pendingRequests.get(key);
  if (existing && Date.now() - existing.timestamp < REQUEST_TTL_MS) {
    return existing.promise as Promise<T>;
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after completion (with small delay to allow for microtasks)
    setTimeout(() => pendingRequests.delete(key), 100);
  });

  pendingRequests.set(key, { promise, timestamp: Date.now() });
  return promise;
}

/**
 * Clear all pending requests. Useful for testing or reset scenarios.
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Get the number of currently pending requests. Useful for debugging.
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}
