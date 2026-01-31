/**
 * Async Behavior Tests for NFTDetailModal Patterns
 *
 * These tests verify the async state management patterns used by NFTDetailModal:
 * - Cross-token state isolation (no leakage between tokens)
 * - Abort/race condition handling (rapid switching)
 * - Per-token status/error map behavior
 *
 * Tests focus on the patterns, not the full component (which has many dependencies).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FIFOKeyTracker, isAbortError } from '@/lib/nft/nftDetailHelpers';

// =============================================================================
// A) Cross-Token State Isolation Tests
// =============================================================================

describe('Cross-token state isolation', () => {
  /**
   * Pattern: Per-token state maps keyed by tokenId
   * Verifies that state for one token doesn't leak to another
   */
  describe('per-token map isolation', () => {
    it('stores and retrieves state per token without cross-contamination', () => {
      // Simulates the pattern: statusByTokenId[tokenId] = status
      const statusByTokenId: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
      const errorByTokenId: Record<string, string | null> = {};

      // Token A starts loading
      statusByTokenId['token-A'] = 'loading';
      errorByTokenId['token-A'] = null;

      // Token B has an error
      statusByTokenId['token-B'] = 'error';
      errorByTokenId['token-B'] = 'Network failure';

      // Token C is successful
      statusByTokenId['token-C'] = 'success';
      errorByTokenId['token-C'] = null;

      // Verify isolation - each token has its own state
      expect(statusByTokenId['token-A']).toBe('loading');
      expect(statusByTokenId['token-B']).toBe('error');
      expect(statusByTokenId['token-C']).toBe('success');

      expect(errorByTokenId['token-A']).toBeNull();
      expect(errorByTokenId['token-B']).toBe('Network failure');
      expect(errorByTokenId['token-C']).toBeNull();

      // Non-existent token returns undefined (handled with ?? 'idle' in component)
      expect(statusByTokenId['token-D']).toBeUndefined();
    });

    it('switching activeTokenId accesses correct token state', () => {
      const dataByTokenId: Record<string, { price: number }> = {
        'token-1': { price: 100 },
        'token-2': { price: 200 },
        'token-3': { price: 300 },
      };

      // Simulate switching active token
      let activeTokenId = 'token-1';
      expect(dataByTokenId[activeTokenId]?.price).toBe(100);

      activeTokenId = 'token-2';
      expect(dataByTokenId[activeTokenId]?.price).toBe(200);

      activeTokenId = 'token-3';
      expect(dataByTokenId[activeTokenId]?.price).toBe(300);

      // Unknown token returns undefined
      activeTokenId = 'token-unknown';
      expect(dataByTokenId[activeTokenId]).toBeUndefined();
    });
  });

  /**
   * Pattern: FIFO eviction prevents unbounded memory growth
   * Verifies that old tokens are evicted when capacity is exceeded
   */
  describe('FIFO eviction prevents memory leaks', () => {
    it('evicts oldest tokens when browsing many items', () => {
      const tracker = new FIFOKeyTracker(5);
      const dataMap: Record<string, string> = {};

      // Simulate browsing 10 tokens
      for (let i = 1; i <= 10; i++) {
        const tokenId = `token-${i}`;
        const keysToEvict = tracker.track(tokenId);

        // Add new data
        dataMap[tokenId] = `data-${i}`;

        // Remove evicted data
        keysToEvict.forEach((key) => delete dataMap[key]);
      }

      // Only last 5 tokens should remain
      expect(Object.keys(dataMap)).toHaveLength(5);
      expect(dataMap['token-1']).toBeUndefined();
      expect(dataMap['token-5']).toBeUndefined();
      expect(dataMap['token-6']).toBe('data-6');
      expect(dataMap['token-10']).toBe('data-10');
    });

    it('revisiting a token refreshes its position (no eviction)', () => {
      const tracker = new FIFOKeyTracker(3);

      tracker.track('A');
      tracker.track('B');
      tracker.track('C');

      // Revisit A - moves to end
      const evicted = tracker.track('A');
      expect(evicted).toEqual([]);
      expect(tracker.getKeys()).toEqual(['B', 'C', 'A']);

      // Add D - should evict B (oldest)
      const evicted2 = tracker.track('D');
      expect(evicted2).toEqual(['B']);
      expect(tracker.getKeys()).toEqual(['C', 'A', 'D']);
    });
  });
});

// =============================================================================
// B) Abort/Race Condition Tests
// =============================================================================

describe('Abort and race condition handling', () => {
  /**
   * Pattern: tokenId guard at async boundaries
   * Verifies that stale results are discarded when token changes
   */
  describe('tokenId guard pattern', () => {
    it('discards result if activeTokenId changed during fetch', async () => {
      let activeTokenId = 'token-A';
      const results: string[] = [];

      // Simulate async fetch that captures tokenId at start
      const fetchData = async (capturedTokenId: string): Promise<void> => {
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 10));

        // Guard: check if token changed
        if (activeTokenId !== capturedTokenId) {
          return; // Discard stale result
        }

        results.push(`result-for-${capturedTokenId}`);
      };

      // Start fetch for token-A
      const fetchA = fetchData('token-A');

      // User switches to token-B before fetch completes
      activeTokenId = 'token-B';

      await fetchA;

      // Result should be discarded (token changed)
      expect(results).toHaveLength(0);
    });

    it('applies result if activeTokenId unchanged during fetch', async () => {
      let activeTokenId = 'token-A';
      const results: string[] = [];

      const fetchData = async (capturedTokenId: string): Promise<void> => {
        await new Promise((r) => setTimeout(r, 10));

        if (activeTokenId !== capturedTokenId) {
          return;
        }

        results.push(`result-for-${capturedTokenId}`);
      };

      const fetchA = fetchData('token-A');
      // Token stays the same
      await fetchA;

      expect(results).toEqual(['result-for-token-A']);
    });

    it('handles rapid token switching correctly', async () => {
      let activeTokenId = 'token-1';
      const appliedResults: string[] = [];

      const fetchData = async (capturedTokenId: string, delay: number): Promise<void> => {
        await new Promise((r) => setTimeout(r, delay));

        if (activeTokenId !== capturedTokenId) {
          return; // Stale
        }

        appliedResults.push(capturedTokenId);
      };

      // Rapid switching: A -> B -> C
      const fetchA = fetchData('token-1', 50);
      activeTokenId = 'token-2';
      const fetchB = fetchData('token-2', 30);
      activeTokenId = 'token-3';
      const fetchC = fetchData('token-3', 10);

      await Promise.all([fetchA, fetchB, fetchC]);

      // Only token-3 result should be applied (others are stale)
      expect(appliedResults).toEqual(['token-3']);
    });
  });

  /**
   * Pattern: AbortController for fetch cancellation
   * Verifies that aborted requests don't cause errors or state updates
   */
  describe('AbortController pattern', () => {
    it('aborted fetch throws AbortError', async () => {
      const controller = new AbortController();

      const fetchPromise = fetch('https://example.com', {
        signal: controller.signal,
      }).catch((e) => e);

      controller.abort();

      const error = await fetchPromise;
      expect(isAbortError(error)).toBe(true);
    });

    it('isAbortError correctly identifies abort errors', () => {
      // Standard DOMException
      const domException = new DOMException('Aborted', 'AbortError');
      expect(isAbortError(domException)).toBe(true);

      // Plain object pattern (Node.js)
      expect(isAbortError({ name: 'AbortError' })).toBe(true);

      // Error with abort message
      const msgError = new Error('fetch was aborted');
      expect(isAbortError(msgError)).toBe(true);

      // Regular error - should NOT match
      expect(isAbortError(new Error('Network failure'))).toBe(false);
    });

    it('abort errors should be silently ignored (not set as errors)', () => {
      const errorByTokenId: Record<string, string | null> = {};

      const handleError = (tokenId: string, error: unknown) => {
        // Pattern: silently ignore abort errors
        if (isAbortError(error)) {
          return;
        }
        errorByTokenId[tokenId] = error instanceof Error ? error.message : 'Unknown error';
      };

      // Abort error - should be ignored
      handleError('token-A', new DOMException('Aborted', 'AbortError'));
      expect(errorByTokenId['token-A']).toBeUndefined();

      // Real error - should be stored
      handleError('token-B', new Error('Network failure'));
      expect(errorByTokenId['token-B']).toBe('Network failure');
    });
  });

  /**
   * Pattern: isMountedRef guard
   * Verifies that state updates don't happen after unmount
   */
  describe('mounted guard pattern', () => {
    it('discards updates after unmount', async () => {
      let isMounted = true;
      const updates: string[] = [];

      const asyncOperation = async () => {
        await new Promise((r) => setTimeout(r, 10));

        // Guard: check if still mounted
        if (!isMounted) {
          return;
        }

        updates.push('state-update');
      };

      const operation = asyncOperation();

      // Component unmounts
      isMounted = false;

      await operation;

      // Update should be discarded
      expect(updates).toHaveLength(0);
    });

    it('applies updates when still mounted', async () => {
      let isMounted = true;
      const updates: string[] = [];

      const asyncOperation = async () => {
        await new Promise((r) => setTimeout(r, 10));

        if (!isMounted) {
          return;
        }

        updates.push('state-update');
      };

      await asyncOperation();

      expect(updates).toEqual(['state-update']);
    });
  });
});

// =============================================================================
// C) Combined Guard Pattern Tests
// =============================================================================

describe('Combined guard patterns', () => {
  /**
   * NFTDetailModal uses three guards together:
   * 1. AbortController.signal.aborted
   * 2. isMountedRef.current
   * 3. activeItem?.tokenId === tokenId
   */
  it('all three guards work together to prevent stale updates', async () => {
    // Simulated component state
    let isMounted = true;
    let activeTokenId = 'token-A';
    const controller = new AbortController();
    const stateUpdates: Array<{ tokenId: string; data: string }> = [];

    const simulatedFetch = async (capturedTokenId: string, signal: AbortSignal) => {
      // Check abort before starting
      if (signal.aborted) return;

      await new Promise((r) => setTimeout(r, 10));

      // GUARD 1: Check abort
      if (signal.aborted) return;

      // GUARD 2: Check mounted
      if (!isMounted) return;

      // GUARD 3: Check tokenId match
      if (activeTokenId !== capturedTokenId) return;

      // All guards passed - apply update
      stateUpdates.push({ tokenId: capturedTokenId, data: `data-for-${capturedTokenId}` });
    };

    // Scenario 1: All guards pass
    await simulatedFetch('token-A', controller.signal);
    expect(stateUpdates).toHaveLength(1);

    // Scenario 2: Token changed mid-fetch
    stateUpdates.length = 0;
    const fetch2 = simulatedFetch('token-A', controller.signal);
    activeTokenId = 'token-B';
    await fetch2;
    expect(stateUpdates).toHaveLength(0);

    // Scenario 3: Unmount mid-fetch
    activeTokenId = 'token-A';
    stateUpdates.length = 0;
    const fetch3 = simulatedFetch('token-A', controller.signal);
    isMounted = false;
    await fetch3;
    expect(stateUpdates).toHaveLength(0);
  });
});

// =============================================================================
// D) Per-Token Status/Error Map Tests
// =============================================================================

describe('Per-token status and error maps', () => {
  interface TokenState {
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
  }

  it('maintains independent status per token', () => {
    const stateByTokenId: Record<string, TokenState> = {};

    // Helper to update state
    const updateTokenState = (tokenId: string, update: Partial<TokenState>) => {
      const prev = stateByTokenId[tokenId] ?? { status: 'idle', error: null };
      stateByTokenId[tokenId] = { ...prev, ...update };
    };

    // Token A starts loading
    updateTokenState('token-A', { status: 'loading' });

    // Token B errors
    updateTokenState('token-B', { status: 'error', error: 'Failed to fetch' });

    // Token A succeeds
    updateTokenState('token-A', { status: 'success' });

    // Token C stays idle (never fetched)
    expect(stateByTokenId['token-A']?.status).toBe('success');
    expect(stateByTokenId['token-B']?.status).toBe('error');
    expect(stateByTokenId['token-B']?.error).toBe('Failed to fetch');
    expect(stateByTokenId['token-C']).toBeUndefined();
  });

  it('does not set error for aborted requests', () => {
    const errorByTokenId: Record<string, string | null> = {};

    const setError = (tokenId: string, error: unknown) => {
      if (isAbortError(error)) {
        // Silent - don't store abort errors
        return;
      }
      errorByTokenId[tokenId] = error instanceof Error ? error.message : 'Unknown';
    };

    // Abort error - should NOT be stored
    setError('token-A', new DOMException('Aborted', 'AbortError'));
    expect(errorByTokenId['token-A']).toBeUndefined();

    // Real error - should be stored
    setError('token-B', new Error('Rate limited'));
    expect(errorByTokenId['token-B']).toBe('Rate limited');
  });
});
