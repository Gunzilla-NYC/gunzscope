/**
 * OpenSea chain slug mapping utility
 *
 * Maps internal chain identifiers to OpenSea API chain slugs.
 * GunzChain (identified as 'avalanche' or 'gunz' internally) maps to 'gunzilla' for OpenSea.
 */

/**
 * Convert internal chain identifier to OpenSea chain slug
 *
 * @param chain - Internal chain identifier (e.g., 'avalanche', 'gunz', 'ethereum')
 * @returns OpenSea chain slug
 */
export function toOpenSeaChain(chain: string): string {
  const normalized = chain.toLowerCase().trim();

  // GunzChain variants all map to 'gunzilla'
  if (normalized === 'avalanche' || normalized === 'gunz' || normalized === 'gunzilla') {
    return 'gunzilla';
  }

  // Return unchanged for other chains
  return normalized;
}

/**
 * Check if a chain is a GunzChain variant
 */
export function isGunzChain(chain: string): boolean {
  const normalized = chain.toLowerCase().trim();
  return normalized === 'avalanche' || normalized === 'gunz' || normalized === 'gunzilla';
}
