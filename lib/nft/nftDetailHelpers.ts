/**
 * NFT Detail Modal Pure Helpers
 *
 * This module contains pure helper functions extracted from NFTDetailModal.tsx
 * for better testability and reusability. All functions are deterministic
 * and have no side effects (except warnOnce which is dev-only logging).
 *
 * GUARDRAILS - Do NOT:
 * - Compute market reference outside computeMarketInputs.
 * - Duplicate data quality logic; use computeMarketInputs.dataQuality.
 * - Bypass normalizeCostBasis for cost basis validation.
 * - Import React or any component from this module.
 */

import { isDev, isTest } from '../utils/dev';
import { NFT, AcquisitionVenue } from '../types';
import { isWeapon } from '../weapon/weaponCompatibility';
import { RARITY_COLORS, RARITY_ORDER, DEFAULT_RARITY_COLORS } from '../utils/rarityColors';

// =============================================================================
// Re-export Types from lib/nft/types.ts
// =============================================================================

export type {
  FetchStatus,
  DataQualityLevel,
  PositionState,
  PositionLabelResult,
  GetPositionLabelInput,
  MarketInputs,
} from './types';

// Import types for internal use
import type {
  DataQualityLevel,
  GetPositionLabelInput,
  MarketInputs,
  PositionLabelResult,
  PositionState,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Maximum entries in token-keyed maps before FIFO eviction */
export const TOKEN_MAP_SOFT_CAP = 200;

// =============================================================================
// warnOnce - Dev-only warning utility
// =============================================================================

const warnedKeys = new Set<string>();

/**
 * Log a warning only once per key during development.
 * Prevents console spam from rapid re-renders.
 */
export function warnOnce(key: string, ...args: unknown[]): void {
  // Only warn in development, not in test or production
  if (!isDev || isTest) return;
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(`[WARN:${key}]`, ...args);
}

/**
 * TEST-ONLY: Reset warnOnce state between tests.
 * This should only be called in test environments.
 */
export function __resetWarnOnceForTests(): void {
  if (!isTest) {
    console.error('__resetWarnOnceForTests should only be called in tests');
    return;
  }
  warnedKeys.clear();
}

// =============================================================================
// normalizeCostBasis
// =============================================================================

/**
 * Normalize cost basis to canonical form.
 * Returns null for non-finite, <=0, NaN, or -0 values.
 *
 * @param value - Raw cost basis value
 * @returns Normalized positive finite number or null
 */
export function normalizeCostBasis(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  // Normalize -0 to null (though it would be filtered by <=0 check)
  return Object.is(value, -0) ? null : value;
}

// =============================================================================
// isAbortError
// =============================================================================

/**
 * Check if an error is an AbortError (should be silently ignored).
 * Handles multiple AbortError representations:
 * - DOMException with name 'AbortError' (standard browser)
 * - Plain object with name property 'AbortError' (Node.js/polyfills)
 * - Error with message containing 'aborted' (conservative fallback)
 *
 * @param error - Error to check
 * @returns true if error represents an abort
 */
export function isAbortError(error: unknown): boolean {
  // Case 1: DOMException with name 'AbortError' (standard browser)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  // Case 2: Plain object/Error with name property 'AbortError'
  // (Node.js AbortError, custom implementations, polyfills)
  if (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  ) {
    return true;
  }

  // Case 3: Error with message containing 'abort' (conservative fallback)
  // Only check message if name is missing/generic to avoid false positives
  if (error instanceof Error) {
    const name = error.name;
    // Only use message fallback if name doesn't give us clear info
    if (!name || name === 'Error') {
      const msg = error.message.toLowerCase();
      if (msg.includes('aborted') || msg.includes('abort')) {
        return true;
      }
    }
  }

  return false;
}

// =============================================================================
// FIFOKeyTracker
// =============================================================================

/**
 * FIFO key tracker for memory-bounded maps.
 * Tracks keys in insertion order and returns keys to evict when capacity is exceeded.
 */
export class FIFOKeyTracker {
  private keys: string[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Track a key access.
   * If key already exists, it's moved to the end (most recent).
   *
   * @param key - Key to track
   * @returns Array of keys that should be evicted (oldest first)
   */
  track(key: string): string[] {
    // Remove if already exists (will be re-added at end)
    const existingIdx = this.keys.indexOf(key);
    if (existingIdx !== -1) {
      this.keys.splice(existingIdx, 1);
    }
    // Add to end
    this.keys.push(key);
    // Evict oldest if over capacity
    const toEvict: string[] = [];
    while (this.keys.length > this.maxSize) {
      const evicted = this.keys.shift();
      if (evicted) toEvict.push(evicted);
    }
    return toEvict;
  }

  /** Reset tracker, clearing all tracked keys */
  reset(): void {
    this.keys = [];
  }

  /** Get current number of tracked keys (for testing) */
  get size(): number {
    return this.keys.length;
  }

  /** Get copy of current keys (for testing) */
  getKeys(): string[] {
    return [...this.keys];
  }
}

// =============================================================================
// toIsoStringSafe
// =============================================================================

/**
 * Safe ISO string converter.
 * Handles Date, string, number (ms), { seconds } objects.
 * Never throws, returns null for invalid/missing values.
 *
 * @param value - Value to convert (Date, string, number, or Firestore timestamp)
 * @returns ISO string or null if invalid
 */
export function toIsoStringSafe(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    // Already a string (possibly ISO format)
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    // Date object
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value.toISOString();
    }
    // Number (milliseconds timestamp)
    if (typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    // Firestore-style { seconds, nanoseconds } object
    if (typeof value === 'object' && 'seconds' in value) {
      const seconds = (value as { seconds: number }).seconds;
      const d = new Date(seconds * 1000);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// computeMarketInputs
// =============================================================================

/**
 * Compute canonical market inputs from listings and NFT metadata.
 * Single source of truth for market reference used by hero display + position label.
 *
 * Reference preference order:
 * 1. listings.average if present and finite
 * 2. midpoint if both bounds exist
 * 3. low if only low exists
 * 4. high if only high exists
 * 5. null
 *
 * Data quality is spread-based and only computed when both bounds exist and low > 0.
 *
 * @param listings - Listing data with optional lowest, highest, average
 * @param nftFloor - Optional floor price from NFT metadata
 * @param nftCeiling - Optional ceiling price from NFT metadata
 * @returns Computed market inputs
 */
export function computeMarketInputs(
  listings: { lowest?: number; highest?: number; average?: number } | null,
  nftFloor?: number,
  nftCeiling?: number
): MarketInputs {
  let low = listings?.lowest ?? nftFloor ?? null;
  let high = listings?.highest ?? nftCeiling ?? null;

  // Guard against NaN values
  if (low !== null && !Number.isFinite(low)) low = null;
  if (high !== null && !Number.isFinite(high)) high = null;

  // Edge case: swap if reversed (low > high)
  if (low !== null && high !== null && low > high) {
    [low, high] = [high, low];
  }

  // Reference preference order:
  // 1) listings.average if present and finite
  // 2) midpoint if both bounds exist
  // 3) low if only low exists
  // 4) high if only high exists
  // 5) null
  let ref: number | null = null;
  if (typeof listings?.average === 'number' && Number.isFinite(listings.average)) {
    ref = listings.average;
  } else if (low !== null && high !== null) {
    ref = (low + high) / 2;
  } else if (low !== null) {
    ref = low;
  } else if (high !== null) {
    ref = high;
  }

  // spread-based quality (only when both bounds exist and low > 0)
  let dataQuality: DataQualityLevel | null = null;
  if (low !== null && high !== null && low > 0) {
    const spreadRatio = (high - low) / low;
    // Guard against NaN from spread calculation
    if (Number.isFinite(spreadRatio)) {
      if (spreadRatio <= 0.25) dataQuality = 'strong';
      else if (spreadRatio <= 0.60) dataQuality = 'fair';
      else dataQuality = 'limited';
    }
  }

  return { low, high, ref, dataQuality };
}

// =============================================================================
// getPositionLabel
// =============================================================================

/**
 * Compute position label from acquisition price and market reference.
 * Pure function that takes pre-computed market ref and data quality.
 *
 * INVARIANTS:
 * - Never returns NaN or Infinity in pnlPct/pnlGun
 * - Deadband: abs(pnlPct) < 0.03 => FLAT
 * - acquisitionPriceGun null/undefined/<=0/non-finite => NO_COST_BASIS
 * - marketRefGun null/undefined/non-finite/<=0 => NO_MARKET_REF
 * - pnlPct clamped to ±1000% (±10)
 *
 * @param input - Acquisition price, market reference, and data quality
 * @returns Position label result with state, P/L values, and quality
 */
export function getPositionLabel(input: GetPositionLabelInput): PositionLabelResult {
  const { acquisitionPriceGun, marketRefGun, dataQuality } = input;
  const epsilon = 1e-9;

  // Validate market reference (must be finite and positive-ish)
  const hasValidMarketRef =
    marketRefGun !== null &&
    marketRefGun !== undefined &&
    Number.isFinite(marketRefGun) &&
    marketRefGun > 0;

  // Validate acquisition price (must be finite and meaningfully positive)
  const hasValidAcquisition =
    acquisitionPriceGun !== null &&
    acquisitionPriceGun !== undefined &&
    Number.isFinite(acquisitionPriceGun) &&
    acquisitionPriceGun >= 0.000001; // Treat extremely small as missing

  // Determine state based on missing data
  if (!hasValidMarketRef) {
    return {
      state: 'NO_MARKET_REF',
      pnlPct: null,
      pnlGun: null,
      marketRefGun: null,
      dataQuality: null,
    };
  }

  if (!hasValidAcquisition) {
    return {
      state: 'NO_COST_BASIS',
      pnlPct: null,
      pnlGun: null,
      marketRefGun,
      dataQuality,
    };
  }

  // Compute P/L with safety guards
  const pnlGun = marketRefGun - acquisitionPriceGun!;
  const rawPnlPct = pnlGun / Math.max(acquisitionPriceGun!, epsilon);

  // Clamp pnlPct to prevent display issues with extreme values
  // (e.g., 1000000% gains would break UI)
  const pnlPct = Number.isFinite(rawPnlPct)
    ? Math.max(-10, Math.min(10, rawPnlPct)) // Clamp to ±1000%
    : 0;

  // Determine position state with ±3% deadband
  let state: PositionState;
  if (Math.abs(pnlPct) < 0.03) {
    state = 'FLAT';
  } else if (pnlPct >= 0.03) {
    state = 'UP';
  } else {
    state = 'DOWN';
  }

  return {
    state,
    pnlPct,
    pnlGun: Number.isFinite(pnlGun) ? pnlGun : null,
    marketRefGun,
    dataQuality,
  };
}

// =============================================================================
// Venue Display Label
// =============================================================================

/**
 * Get human-readable label for acquisition venue.
 * Note: Labels do NOT include "Purchased" prefix - purchase context is implied by the Cost line.
 */
export function getVenueDisplayLabel(
  venue: AcquisitionVenue | undefined,
  hasDecodeCost?: boolean,
  isOfferFill?: boolean,
): string {
  switch (venue) {
    case 'decode':
      return 'Decoded (in-game)';
    case 'system_mint':
      return 'System Reward / Airdrop';
    case 'opensea':
      return isOfferFill ? 'OpenSea (Offer)' : 'OpenSea';
    case 'otg_marketplace':
      return 'OTG Marketplace';
    case 'in_game_marketplace':
      return 'In-Game Marketplace';
    case 'decoder':
      return 'Decoded (in-game)';
    case 'mint':
      return hasDecodeCost ? 'Decoded (in-game)' : 'Minted';
    case 'transfer':
      return 'Transfer';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

// =============================================================================
// Rarity Color Lookup
// =============================================================================

/**
 * Get rarity color for an NFT based on its RARITY trait.
 */
export function getRarityColorForNft(nft: NFT): { primary: string; border: string } {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  return RARITY_COLORS[rarity] || DEFAULT_RARITY_COLORS;
}

// =============================================================================
// Related Items Finder
// =============================================================================

/**
 * Find all related items (skins, attachments) for a weapon NFT.
 * Returns NFTs that mention this weapon in their name, sorted by class then rarity.
 */
export function findRelatedItems(weaponNft: NFT, allNfts: NFT[]): NFT[] {
  if (!isWeapon(weaponNft)) return [];

  const weaponName = weaponNft.name;

  // Extract the core weapon name (without suffixes like Legacy, MK2, etc.)
  const coreWeaponName = weaponName
    .replace(/\s+(Legacy|MK\d+|Pro|Elite|Prime|Standard)\s*$/i, '')
    .trim();

  // Also extract just the first word for shorter weapon names
  const firstWord = coreWeaponName.split(/\s+/)[0];

  const related: NFT[] = [];

  for (const nft of allNfts) {
    // Skip the weapon itself
    if (nft.tokenId === weaponNft.tokenId) continue;

    const itemClass = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';

    // Only include skins and attachments
    const isSkin = itemClass === 'Weapon Skin' || itemClass.toLowerCase().includes('skin');
    const isAccessory = itemClass === 'Accessory' || itemClass.toLowerCase().includes('attachment') || itemClass.toLowerCase().includes('accessory');

    if (!isSkin && !isAccessory) continue;

    // Check if the item name mentions this weapon
    const nftName = nft.name.toLowerCase();
    const lowerWeaponName = coreWeaponName.toLowerCase();
    const lowerFullName = weaponName.toLowerCase();
    const lowerFirstWord = firstWord.toLowerCase();

    if (
      nftName.includes(`for the ${lowerWeaponName}`) ||
      nftName.includes(`for the ${lowerFullName}`) ||
      nftName.includes(`for the ${lowerFirstWord}`) ||
      nftName.includes(`for ${lowerWeaponName}`) ||
      nftName.includes(`for ${lowerFirstWord}`) ||
      nftName.endsWith(lowerWeaponName) ||
      nftName.endsWith(lowerFullName) ||
      nftName.endsWith(lowerFirstWord) ||
      nftName.includes(` ${lowerFirstWord} `) ||
      nftName.includes(` ${lowerFirstWord}`)
    ) {
      related.push(nft);
    }
  }

  // Sort by class (skins first, then attachments), then by rarity, then by name
  return related.sort((a, b) => {
    const classA = a.traits?.['CLASS'] || '';
    const classB = b.traits?.['CLASS'] || '';

    // Skins before Accessories
    if (classA === 'Weapon Skin' && classB !== 'Weapon Skin') return -1;
    if (classB === 'Weapon Skin' && classA !== 'Weapon Skin') return 1;

    // Then by rarity
    const rarityA = RARITY_ORDER[a.traits?.['RARITY'] || a.traits?.['Rarity'] || ''] || 99;
    const rarityB = RARITY_ORDER[b.traits?.['RARITY'] || b.traits?.['Rarity'] || ''] || 99;
    if (rarityA !== rarityB) return rarityA - rarityB;

    // Then by name
    return a.name.localeCompare(b.name);
  });
}

// =============================================================================
// DEV-ONLY INVARIANT CHECKS
// =============================================================================
// These run only in development (NOT in test) to validate helper correctness

if (isDev && !isTest) {
  // Test toIsoStringSafe
  const isoTests = [
    { input: null, expected: null },
    { input: undefined, expected: null },
    { input: 'invalid-date', expected: null },
    { input: '', expected: null },
    { input: '2024-01-15T10:30:00Z', expected: '2024-01-15T10:30:00.000Z' },
    { input: new Date('2024-01-15'), expectedPrefix: '2024-01-15' },
    { input: 1705315800000, expectedPrefix: '2024-01-15' }, // ms timestamp
  ];
  isoTests.forEach(({ input, expected, expectedPrefix }) => {
    const result = toIsoStringSafe(input);
    if (expected !== undefined && result !== expected) {
      console.warn(`[DEV] toIsoStringSafe invariant failed: input=${JSON.stringify(input)}, expected=${expected}, got=${result}`);
    }
    if (expectedPrefix !== undefined && (result === null || !result.startsWith(expectedPrefix))) {
      console.warn(`[DEV] toIsoStringSafe invariant failed: input=${JSON.stringify(input)}, expected prefix ${expectedPrefix}, got=${result}`);
    }
  });

  // Test computeMarketInputs
  const marketTests = [
    { listings: null, floor: undefined, ceil: undefined, expectRef: null },
    { listings: { lowest: 100, highest: 200 }, floor: undefined, ceil: undefined, expectLow: 100, expectHigh: 200, expectRef: 150 },
    { listings: { lowest: 200, highest: 100 }, floor: undefined, ceil: undefined, expectLow: 100, expectHigh: 200 }, // swapped
    { listings: { lowest: NaN, highest: 100 }, floor: undefined, ceil: undefined, expectLow: null }, // NaN filtered
    { listings: { lowest: 100, highest: 100 }, floor: undefined, ceil: undefined, expectLow: 100, expectHigh: 100, expectRef: 100 }, // equal
    { listings: null, floor: 50, ceil: 150, expectLow: 50, expectHigh: 150 },
    { listings: { average: 120 }, floor: 50, ceil: 150, expectRef: 120 }, // average takes priority
  ];
  marketTests.forEach((test, idx) => {
    const result = computeMarketInputs(test.listings, test.floor, test.ceil);
    if (test.expectRef !== undefined && result.ref !== test.expectRef) {
      console.warn(`[DEV] computeMarketInputs invariant failed [${idx}]: expected ref=${test.expectRef}, got=${result.ref}`);
    }
    if (test.expectLow !== undefined && result.low !== test.expectLow) {
      console.warn(`[DEV] computeMarketInputs invariant failed [${idx}]: expected low=${test.expectLow}, got=${result.low}`);
    }
    if (test.expectHigh !== undefined && result.high !== test.expectHigh) {
      console.warn(`[DEV] computeMarketInputs invariant failed [${idx}]: expected high=${test.expectHigh}, got=${result.high}`);
    }
    // Ensure no NaN or Infinity in outputs
    if (result.low !== null && !Number.isFinite(result.low)) {
      console.warn(`[DEV] computeMarketInputs returned non-finite low: ${result.low}`);
    }
    if (result.high !== null && !Number.isFinite(result.high)) {
      console.warn(`[DEV] computeMarketInputs returned non-finite high: ${result.high}`);
    }
    if (result.ref !== null && !Number.isFinite(result.ref)) {
      console.warn(`[DEV] computeMarketInputs returned non-finite ref: ${result.ref}`);
    }
  });

  // Test getPositionLabel
  const positionTests = [
    { input: { acquisitionPriceGun: null, marketRefGun: 100, dataQuality: null }, expectState: 'NO_COST_BASIS' },
    { input: { acquisitionPriceGun: 100, marketRefGun: null, dataQuality: null }, expectState: 'NO_MARKET_REF' },
    { input: { acquisitionPriceGun: 100, marketRefGun: 100, dataQuality: 'strong' as const }, expectState: 'FLAT' },
    { input: { acquisitionPriceGun: 100, marketRefGun: 150, dataQuality: 'strong' as const }, expectState: 'UP' },
    { input: { acquisitionPriceGun: 100, marketRefGun: 50, dataQuality: 'strong' as const }, expectState: 'DOWN' },
    { input: { acquisitionPriceGun: 100, marketRefGun: 102, dataQuality: 'strong' as const }, expectState: 'FLAT' }, // within deadband
    { input: { acquisitionPriceGun: NaN, marketRefGun: 100, dataQuality: null }, expectState: 'NO_COST_BASIS' },
    { input: { acquisitionPriceGun: 100, marketRefGun: Infinity, dataQuality: null }, expectState: 'NO_MARKET_REF' },
  ];
  positionTests.forEach((test, idx) => {
    const result = getPositionLabel(test.input);
    if (result.state !== test.expectState) {
      console.warn(`[DEV] getPositionLabel invariant failed [${idx}]: expected state=${test.expectState}, got=${result.state}`);
    }
    // Ensure no NaN or Infinity in pnl outputs
    if (result.pnlPct !== null && !Number.isFinite(result.pnlPct)) {
      console.warn(`[DEV] getPositionLabel returned non-finite pnlPct: ${result.pnlPct}`);
    }
    if (result.pnlGun !== null && !Number.isFinite(result.pnlGun)) {
      console.warn(`[DEV] getPositionLabel returned non-finite pnlGun: ${result.pnlGun}`);
    }
  });

  console.debug('[DEV] NFT detail helpers invariants checked');
}
