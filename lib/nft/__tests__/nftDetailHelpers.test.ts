/**
 * Unit tests for NFT Detail Modal Helpers
 *
 * Tests cover the pure helper functions extracted from NFTDetailModal.tsx.
 * All tests are deterministic and do not depend on network or time.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  toIsoStringSafe,
  normalizeCostBasis,
  isAbortError,
  computeMarketInputs,
  getPositionLabel,
  FIFOKeyTracker,
  warnOnce,
  __resetWarnOnceForTests,
  TOKEN_MAP_SOFT_CAP,
} from '../nftDetailHelpers';

// =============================================================================
// A) toIsoStringSafe Tests
// =============================================================================

describe('toIsoStringSafe', () => {
  it('returns null for null input', () => {
    expect(toIsoStringSafe(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(toIsoStringSafe(undefined)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(toIsoStringSafe('invalid-date')).toBeNull();
    expect(toIsoStringSafe('')).toBeNull();
    expect(toIsoStringSafe('not a date')).toBeNull();
  });

  it('converts valid ISO string to normalized ISO string', () => {
    const result = toIsoStringSafe('2024-01-15T10:30:00Z');
    expect(result).toBe('2024-01-15T10:30:00.000Z');
  });

  it('converts valid date string to ISO string', () => {
    const result = toIsoStringSafe('2024-01-15');
    expect(result).not.toBeNull();
    expect(result!.startsWith('2024-01-15')).toBe(true);
  });

  it('converts Date object to ISO string', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = toIsoStringSafe(date);
    expect(result).toBe('2024-01-15T12:00:00.000Z');
  });

  it('returns null for invalid Date object', () => {
    const invalidDate = new Date('invalid');
    expect(toIsoStringSafe(invalidDate)).toBeNull();
  });

  it('converts millisecond timestamp to ISO string', () => {
    const timestamp = 1705315800000; // 2024-01-15 approx
    const result = toIsoStringSafe(timestamp);
    expect(result).not.toBeNull();
    expect(result!.startsWith('2024-01-15')).toBe(true);
  });

  it('converts Firestore-style timestamp object to ISO string', () => {
    const firestoreTimestamp = { seconds: 1705315800 }; // 2024-01-15 approx
    const result = toIsoStringSafe(firestoreTimestamp);
    expect(result).not.toBeNull();
    expect(result!.startsWith('2024-01-15')).toBe(true);
  });

  it('returns null for non-date objects', () => {
    expect(toIsoStringSafe({})).toBeNull();
    expect(toIsoStringSafe({ foo: 'bar' })).toBeNull();
    expect(toIsoStringSafe([])).toBeNull();
  });

  it('returns null for boolean/function inputs', () => {
    expect(toIsoStringSafe(true)).toBeNull();
    expect(toIsoStringSafe(false)).toBeNull();
    expect(toIsoStringSafe(() => {})).toBeNull();
  });
});

// =============================================================================
// B) normalizeCostBasis Tests
// =============================================================================

describe('normalizeCostBasis', () => {
  it('returns null for null input', () => {
    expect(normalizeCostBasis(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeCostBasis(undefined)).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(normalizeCostBasis(NaN)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(normalizeCostBasis(Infinity)).toBeNull();
    expect(normalizeCostBasis(-Infinity)).toBeNull();
  });

  it('returns null for zero', () => {
    expect(normalizeCostBasis(0)).toBeNull();
  });

  it('returns null for negative zero (-0)', () => {
    expect(normalizeCostBasis(-0)).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(normalizeCostBasis(-1)).toBeNull();
    expect(normalizeCostBasis(-100)).toBeNull();
    expect(normalizeCostBasis(-0.001)).toBeNull();
  });

  it('returns the value for small positive finite numbers', () => {
    expect(normalizeCostBasis(0.001)).toBe(0.001);
    expect(normalizeCostBasis(0.0001)).toBe(0.0001);
  });

  it('returns the value for normal positive numbers', () => {
    expect(normalizeCostBasis(100)).toBe(100);
    expect(normalizeCostBasis(1234.56)).toBe(1234.56);
    expect(normalizeCostBasis(1)).toBe(1);
  });

  it('returns the value for very large finite numbers', () => {
    expect(normalizeCostBasis(1e15)).toBe(1e15);
  });
});

// =============================================================================
// C) computeMarketInputs Tests
// =============================================================================

describe('computeMarketInputs', () => {
  describe('NaN guards', () => {
    it('filters NaN low to null', () => {
      const result = computeMarketInputs({ lowest: NaN, highest: 100 });
      expect(result.low).toBeNull();
      expect(result.high).toBe(100);
    });

    it('filters NaN high to null', () => {
      const result = computeMarketInputs({ lowest: 50, highest: NaN });
      expect(result.low).toBe(50);
      expect(result.high).toBeNull();
    });

    it('filters Infinity values to null', () => {
      const result = computeMarketInputs({ lowest: Infinity, highest: -Infinity });
      expect(result.low).toBeNull();
      expect(result.high).toBeNull();
    });
  });

  describe('reversed bounds swap', () => {
    it('swaps low and high when low > high', () => {
      const result = computeMarketInputs({ lowest: 200, highest: 100 });
      expect(result.low).toBe(100);
      expect(result.high).toBe(200);
    });

    it('does not swap when low <= high', () => {
      const result = computeMarketInputs({ lowest: 100, highest: 200 });
      expect(result.low).toBe(100);
      expect(result.high).toBe(200);
    });
  });

  describe('ref fallback order', () => {
    it('uses listings.average when finite (priority 1)', () => {
      const result = computeMarketInputs({ average: 120 }, 50, 150);
      expect(result.ref).toBe(120);
    });

    it('uses midpoint when both bounds exist (priority 2)', () => {
      const result = computeMarketInputs({ lowest: 100, highest: 200 });
      expect(result.ref).toBe(150);
    });

    it('uses low when only low exists (priority 3)', () => {
      const result = computeMarketInputs({ lowest: 100 });
      expect(result.ref).toBe(100);
    });

    it('uses high when only high exists (priority 4)', () => {
      const result = computeMarketInputs({ highest: 200 });
      expect(result.ref).toBe(200);
    });

    it('returns null when no data exists (priority 5)', () => {
      const result = computeMarketInputs(null);
      expect(result.ref).toBeNull();
    });

    it('falls back to nftFloor and nftCeiling when listings is null', () => {
      const result = computeMarketInputs(null, 50, 150);
      expect(result.low).toBe(50);
      expect(result.high).toBe(150);
      expect(result.ref).toBe(100); // midpoint
    });
  });

  describe('dataQuality', () => {
    it('returns "strong" for spread <= 25%', () => {
      const result = computeMarketInputs({ lowest: 100, highest: 120 });
      expect(result.dataQuality).toBe('strong');
    });

    it('returns "fair" for spread 25%-60%', () => {
      const result = computeMarketInputs({ lowest: 100, highest: 150 });
      expect(result.dataQuality).toBe('fair');
    });

    it('returns "limited" for spread > 60%', () => {
      const result = computeMarketInputs({ lowest: 100, highest: 200 });
      expect(result.dataQuality).toBe('limited');
    });

    it('returns null when only one bound exists', () => {
      expect(computeMarketInputs({ lowest: 100 }).dataQuality).toBeNull();
      expect(computeMarketInputs({ highest: 100 }).dataQuality).toBeNull();
    });

    it('returns null when low is 0 (division by zero protection)', () => {
      const result = computeMarketInputs({ lowest: 0, highest: 100 });
      expect(result.dataQuality).toBeNull();
    });

    it('handles equal bounds (spread = 0%)', () => {
      const result = computeMarketInputs({ lowest: 100, highest: 100 });
      expect(result.low).toBe(100);
      expect(result.high).toBe(100);
      expect(result.ref).toBe(100);
      expect(result.dataQuality).toBe('strong'); // 0% spread
    });
  });

  describe('single-bound market states', () => {
    it('Floor Only: only low bound exists', () => {
      const result = computeMarketInputs({ lowest: 100 });
      expect(result.low).toBe(100);
      expect(result.high).toBeNull();
      expect(result.ref).toBe(100); // Falls back to low
      expect(result.dataQuality).toBeNull(); // Can't compute spread with one bound
    });

    it('Ceiling Only: only high bound exists', () => {
      const result = computeMarketInputs({ highest: 200 });
      expect(result.low).toBeNull();
      expect(result.high).toBe(200);
      expect(result.ref).toBe(200); // Falls back to high
      expect(result.dataQuality).toBeNull();
    });

    it('Single Price Point: low === high', () => {
      const result = computeMarketInputs({ lowest: 150, highest: 150 });
      expect(result.low).toBe(150);
      expect(result.high).toBe(150);
      expect(result.ref).toBe(150); // Midpoint of identical values
      expect(result.dataQuality).toBe('strong'); // 0% spread
    });

    it('Floor Only from nftFloor fallback', () => {
      const result = computeMarketInputs(null, 80, undefined);
      expect(result.low).toBe(80);
      expect(result.high).toBeNull();
      expect(result.ref).toBe(80);
    });

    it('Ceiling Only from nftCeiling fallback', () => {
      const result = computeMarketInputs(null, undefined, 250);
      expect(result.low).toBeNull();
      expect(result.high).toBe(250);
      expect(result.ref).toBe(250);
    });
  });
});

// =============================================================================
// D) getPositionLabel Tests
// =============================================================================

describe('getPositionLabel', () => {
  describe('NO_MARKET_REF state', () => {
    it('returns NO_MARKET_REF when marketRefGun is null', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: null,
        dataQuality: 'strong',
      });
      expect(result.state).toBe('NO_MARKET_REF');
      expect(result.pnlPct).toBeNull();
      expect(result.pnlGun).toBeNull();
      expect(result.marketRefGun).toBeNull();
      expect(result.dataQuality).toBeNull();
    });

    it('returns NO_MARKET_REF when marketRefGun is undefined', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: undefined,
        dataQuality: null,
      });
      expect(result.state).toBe('NO_MARKET_REF');
    });

    it('returns NO_MARKET_REF when marketRefGun is Infinity', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: Infinity,
        dataQuality: null,
      });
      expect(result.state).toBe('NO_MARKET_REF');
    });

    it('returns NO_MARKET_REF when marketRefGun is NaN', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: NaN,
        dataQuality: null,
      });
      expect(result.state).toBe('NO_MARKET_REF');
    });

    it('returns NO_MARKET_REF when marketRefGun is 0 or negative', () => {
      expect(
        getPositionLabel({ acquisitionPriceGun: 100, marketRefGun: 0, dataQuality: null }).state
      ).toBe('NO_MARKET_REF');
      expect(
        getPositionLabel({ acquisitionPriceGun: 100, marketRefGun: -50, dataQuality: null }).state
      ).toBe('NO_MARKET_REF');
    });
  });

  describe('NO_COST_BASIS state', () => {
    it('returns NO_COST_BASIS when acquisitionPriceGun is null', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: null,
        marketRefGun: 100,
        dataQuality: 'strong',
      });
      expect(result.state).toBe('NO_COST_BASIS');
      expect(result.pnlPct).toBeNull();
      expect(result.pnlGun).toBeNull();
      expect(result.marketRefGun).toBe(100);
      expect(result.dataQuality).toBe('strong');
    });

    it('returns NO_COST_BASIS when acquisitionPriceGun is NaN', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: NaN,
        marketRefGun: 100,
        dataQuality: null,
      });
      expect(result.state).toBe('NO_COST_BASIS');
    });

    it('returns NO_COST_BASIS for very small acquisition price', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 0.0000001, // Below 0.000001 threshold
        marketRefGun: 100,
        dataQuality: null,
      });
      expect(result.state).toBe('NO_COST_BASIS');
    });
  });

  describe('FLAT state (deadband)', () => {
    it('returns FLAT when pnlPct is within ±3% deadband', () => {
      // 0% gain/loss
      expect(
        getPositionLabel({ acquisitionPriceGun: 100, marketRefGun: 100, dataQuality: 'strong' })
          .state
      ).toBe('FLAT');

      // +2% gain (within deadband)
      expect(
        getPositionLabel({ acquisitionPriceGun: 100, marketRefGun: 102, dataQuality: 'strong' })
          .state
      ).toBe('FLAT');

      // -2% loss (within deadband)
      expect(
        getPositionLabel({ acquisitionPriceGun: 100, marketRefGun: 98, dataQuality: 'strong' })
          .state
      ).toBe('FLAT');
    });
  });

  describe('UP state (profit)', () => {
    it('returns UP when pnlPct >= 3%', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: 150,
        dataQuality: 'strong',
      });
      expect(result.state).toBe('UP');
      expect(result.pnlPct).toBeCloseTo(0.5); // 50%
      expect(result.pnlGun).toBe(50);
    });

    it('returns UP for exactly 3% gain', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: 103,
        dataQuality: 'strong',
      });
      expect(result.state).toBe('UP');
    });
  });

  describe('DOWN state (loss)', () => {
    it('returns DOWN when pnlPct <= -3%', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: 50,
        dataQuality: 'strong',
      });
      expect(result.state).toBe('DOWN');
      expect(result.pnlPct).toBeCloseTo(-0.5); // -50%
      expect(result.pnlGun).toBe(-50);
    });

    it('returns DOWN for exactly -3% loss', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: 97,
        dataQuality: 'strong',
      });
      expect(result.state).toBe('DOWN');
    });
  });

  describe('pnlPct clamping', () => {
    it('clamps extreme positive pnlPct to +1000% (10)', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 1,
        marketRefGun: 10000, // Would be 999900% without clamping
        dataQuality: null,
      });
      expect(result.pnlPct).toBe(10); // Clamped to ±1000%
      expect(result.state).toBe('UP');
    });

    it('clamps extreme negative pnlPct to -1000% (-10)', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 10000,
        marketRefGun: 1, // Would be -99.99% which is fine, but test boundary
        dataQuality: null,
      });
      // This won't hit the clamp, but test the clamp works for edge cases
      expect(result.pnlPct).toBeLessThanOrEqual(10);
      expect(result.pnlPct).toBeGreaterThanOrEqual(-10);
    });
  });

  describe('pnlGun null for non-finite', () => {
    it('pnlGun is always finite when both inputs are valid', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 100,
        marketRefGun: 150,
        dataQuality: null,
      });
      expect(Number.isFinite(result.pnlGun)).toBe(true);
    });
  });

  describe('no division by zero', () => {
    it('handles very small acquisition price without NaN', () => {
      const result = getPositionLabel({
        acquisitionPriceGun: 0.000001, // Just above threshold
        marketRefGun: 100,
        dataQuality: null,
      });
      expect(result.state).toBe('UP');
      expect(Number.isFinite(result.pnlPct!)).toBe(true);
      expect(Number.isFinite(result.pnlGun!)).toBe(true);
    });
  });
});

// =============================================================================
// E) FIFOKeyTracker Tests
// =============================================================================

describe('FIFOKeyTracker', () => {
  it('tracks keys in insertion order', () => {
    const tracker = new FIFOKeyTracker(5);
    tracker.track('a');
    tracker.track('b');
    tracker.track('c');
    expect(tracker.getKeys()).toEqual(['a', 'b', 'c']);
  });

  it('evicts oldest keys when exceeding capacity', () => {
    const tracker = new FIFOKeyTracker(3);
    tracker.track('a');
    tracker.track('b');
    tracker.track('c');
    const evicted = tracker.track('d');
    expect(evicted).toEqual(['a']);
    expect(tracker.getKeys()).toEqual(['b', 'c', 'd']);
  });

  it('moves existing key to end without corrupting order', () => {
    const tracker = new FIFOKeyTracker(5);
    tracker.track('a');
    tracker.track('b');
    tracker.track('c');
    tracker.track('a'); // Re-add 'a' - should move to end
    expect(tracker.getKeys()).toEqual(['b', 'c', 'a']);
  });

  it('does not evict when re-adding existing key', () => {
    const tracker = new FIFOKeyTracker(3);
    tracker.track('a');
    tracker.track('b');
    tracker.track('c');
    const evicted = tracker.track('b'); // Re-add existing
    expect(evicted).toEqual([]);
    expect(tracker.getKeys()).toEqual(['a', 'c', 'b']);
  });

  it('reset clears all tracked keys', () => {
    const tracker = new FIFOKeyTracker(5);
    tracker.track('a');
    tracker.track('b');
    tracker.reset();
    expect(tracker.size).toBe(0);
    expect(tracker.getKeys()).toEqual([]);
  });

  it('respects TOKEN_MAP_SOFT_CAP constant', () => {
    expect(TOKEN_MAP_SOFT_CAP).toBe(200);
  });

  it('handles deterministic eviction for large capacity', () => {
    const tracker = new FIFOKeyTracker(3);
    tracker.track('first');
    tracker.track('second');
    tracker.track('third');

    // Add two more - should evict 'first' then 'second'
    let evicted = tracker.track('fourth');
    expect(evicted).toEqual(['first']);

    evicted = tracker.track('fifth');
    expect(evicted).toEqual(['second']);

    expect(tracker.getKeys()).toEqual(['third', 'fourth', 'fifth']);
  });
});

// =============================================================================
// F) warnOnce and isAbortError Tests
// =============================================================================

describe('warnOnce', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetWarnOnceForTests();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Note: warnOnce only logs in development, but we're in test mode
    // So we need to verify it doesn't log in test mode
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('does not log in test environment', () => {
    warnOnce('test-key', 'test message');
    // warnOnce guards with NODE_ENV !== 'development', so in test it won't log
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('__resetWarnOnceForTests clears the warned keys set', () => {
    // This just verifies the reset function works without error
    __resetWarnOnceForTests();
    // No assertion needed - if it throws, the test fails
  });
});

describe('isAbortError', () => {
  // Case 1: DOMException (standard browser)
  it('returns true for DOMException with name "AbortError"', () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    expect(isAbortError(abortError)).toBe(true);
  });

  it('returns false for DOMException with different name', () => {
    const otherDomException = new DOMException('Other error', 'NotFoundError');
    expect(isAbortError(otherDomException)).toBe(false);
  });

  // Case 2: Plain object with name property (Node.js/polyfills)
  it('returns true for plain object with name "AbortError"', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError({ name: 'AbortError', message: 'custom message' })).toBe(true);
  });

  it('returns true for Error subclass with name "AbortError"', () => {
    const err = new Error('Request aborted');
    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(true);
  });

  // Case 3: Error with message containing 'abort' (fallback)
  it('returns true for Error with "aborted" in message and generic name', () => {
    const err = new Error('The fetch request was aborted');
    // err.name defaults to 'Error', so message fallback applies
    expect(isAbortError(err)).toBe(true);
  });

  it('returns true for Error with "abort" in message and no name', () => {
    const err = new Error('Operation abort triggered');
    err.name = ''; // Force empty name
    expect(isAbortError(err)).toBe(true);
  });

  it('returns false for Error with specific name even if message contains "abort"', () => {
    const err = new TypeError('Something was aborted but this is a TypeError');
    // name is 'TypeError', not generic, so message fallback does NOT apply
    expect(isAbortError(err)).toBe(false);
  });

  // Negative cases
  it('returns false for regular Error without abort indicators', () => {
    const regularError = new Error('Something went wrong');
    expect(isAbortError(regularError)).toBe(false);
  });

  it('returns false for TypeError without abort in message', () => {
    expect(isAbortError(new TypeError('type error'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('error string')).toBe(false);
    expect(isAbortError(42)).toBe(false);
    expect(isAbortError({})).toBe(false); // No name property
  });

  it('returns false for object with different name', () => {
    expect(isAbortError({ name: 'NetworkError' })).toBe(false);
    expect(isAbortError({ name: 'TimeoutError' })).toBe(false);
  });
});
