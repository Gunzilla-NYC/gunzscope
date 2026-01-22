// GunzChain Explorer URL helpers

// Default to Gunzscan if env var not configured
const GUNZ_EXPLORER_BASE = process.env.NEXT_PUBLIC_GUNZ_EXPLORER_BASE || 'https://gunzscan.io';

/**
 * Build a GunzChain explorer URL for an address
 * @param address - The contract or wallet address
 * @returns Full URL to the explorer address page
 */
export function gunzExplorerAddressUrl(address: string): string {
  return `${GUNZ_EXPLORER_BASE}/address/${address}`;
}

/**
 * Build a GunzChain explorer URL for a transaction
 * @param txHash - The transaction hash
 * @returns Full URL to the explorer transaction page
 */
export function gunzExplorerTxUrl(txHash: string): string {
  return `${GUNZ_EXPLORER_BASE}/tx/${txHash}`;
}

/**
 * Build a GunzChain explorer URL for a block
 * @param blockNumber - The block number
 * @returns Full URL to the explorer block page
 */
export function gunzExplorerBlockUrl(blockNumber: number | string): string {
  return `${GUNZ_EXPLORER_BASE}/block/${blockNumber}`;
}

/**
 * Build a GunzChain explorer URL for an NFT/token
 * @param contractAddress - The NFT contract address
 * @param tokenId - The token ID
 * @returns Full URL to the explorer token page
 */
export function gunzExplorerTokenUrl(contractAddress: string, tokenId: string): string {
  return `${GUNZ_EXPLORER_BASE}/token/${contractAddress}/instance/${tokenId}`;
}
