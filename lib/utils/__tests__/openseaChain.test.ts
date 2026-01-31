/**
 * OpenSea Chain Mapping Unit Tests
 *
 * These tests verify the chain slug mapping logic for OpenSea API.
 */

import { describe, it, expect } from 'vitest';
import { toOpenSeaChain, isGunzChain } from '../openseaChain';

// =============================================================================
// Test Cases: toOpenSeaChain
// =============================================================================

describe('toOpenSeaChain', () => {
  it("maps 'avalanche' to 'gunzilla'", () => {
    expect(toOpenSeaChain('avalanche')).toBe('gunzilla');
  });

  it("maps 'gunz' to 'gunzilla'", () => {
    expect(toOpenSeaChain('gunz')).toBe('gunzilla');
  });

  it("keeps 'gunzilla' unchanged", () => {
    expect(toOpenSeaChain('gunzilla')).toBe('gunzilla');
  });

  it("keeps 'ethereum' unchanged", () => {
    expect(toOpenSeaChain('ethereum')).toBe('ethereum');
  });

  it("keeps 'polygon' unchanged", () => {
    expect(toOpenSeaChain('polygon')).toBe('polygon');
  });

  it("handles case insensitivity - 'AVALANCHE' maps to 'gunzilla'", () => {
    expect(toOpenSeaChain('AVALANCHE')).toBe('gunzilla');
  });

  it("handles case insensitivity - 'Gunz' maps to 'gunzilla'", () => {
    expect(toOpenSeaChain('Gunz')).toBe('gunzilla');
  });

  it("trims whitespace - ' avalanche ' maps to 'gunzilla'", () => {
    expect(toOpenSeaChain(' avalanche ')).toBe('gunzilla');
  });

  it("lowercases unknown chain - 'OPTIMISM' returns 'optimism'", () => {
    expect(toOpenSeaChain('OPTIMISM')).toBe('optimism');
  });
});

// =============================================================================
// Test Cases: isGunzChain
// =============================================================================

describe('isGunzChain', () => {
  it("'avalanche' is a GunzChain variant", () => {
    expect(isGunzChain('avalanche')).toBe(true);
  });

  it("'gunz' is a GunzChain variant", () => {
    expect(isGunzChain('gunz')).toBe(true);
  });

  it("'gunzilla' is a GunzChain variant", () => {
    expect(isGunzChain('gunzilla')).toBe(true);
  });

  it("'ethereum' is NOT a GunzChain variant", () => {
    expect(isGunzChain('ethereum')).toBe(false);
  });

  it("'polygon' is NOT a GunzChain variant", () => {
    expect(isGunzChain('polygon')).toBe(false);
  });

  it("handles case insensitivity - 'AVALANCHE' is a GunzChain variant", () => {
    expect(isGunzChain('AVALANCHE')).toBe(true);
  });
});
