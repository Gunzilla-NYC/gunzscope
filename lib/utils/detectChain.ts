/**
 * Detect blockchain chain type from a wallet address string.
 * - EVM (0x + 40 hex chars) → 'gunzchain'
 * - Base58 (32-44 chars, no 0/O/I/l) → 'solana'
 */
export type ChainType = 'gunzchain' | 'solana' | null;

export function detectChain(addr: string): ChainType {
  const trimmed = addr.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return 'gunzchain';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return 'solana';
  return null;
}
