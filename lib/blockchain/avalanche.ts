import { ethers } from 'ethers';
import { TokenBalance, NFT, NFTPageResult, AcquisitionVenue, MetadataSource, NFTMetadataDebug, NFTTypeSpec } from '../types';
import { getCachedMetadata, setCachedMetadata } from '../utils/nftCache';

// =============================================================================
// Contract Deployment Block Configuration
// =============================================================================
// Hardcoded deployment start blocks for known contracts to avoid scanning from block 0.
// Key format: `${chainId}:${contractAddress.toLowerCase()}`
// These values should be the block number where the contract was deployed (or slightly before).

const DEPLOYMENT_START_BLOCKS: Record<string, number> = {
  // GunzChain (chainId: 43419) - Off The Grid NFT Collection
  // Contract: 0x9ed98e159be43a8d42b64053831fcae5e4d7d271
  // Deployed around block 1,000,000 - adjust if needed based on actual deployment
  '43419:0x9ed98e159be43a8d42b64053831fcae5e4d7d271': 1_000_000,

  // Avalanche C-Chain (chainId: 43114) - placeholder for future contracts
  // '43114:0x...': 30_000_000,
};

// Fallback: look back ~6 months instead of 2 years for unknown contracts
const DEFAULT_LOOKBACK_BLOCKS = Math.floor((6 * 30 * 24 * 60 * 60) / 2); // ~6 months at 2 sec/block

// Debug logging flag
const DEBUG_ACQUISITION = process.env.NODE_ENV !== 'production';

// Gunzscan API base URL (Blockscout API)
const GUNZSCAN_API_BASE = process.env.NEXT_PUBLIC_GUNZ_EXPLORER_BASE || 'https://gunzscan.io';

/**
 * Fetch NFT metadata from Gunzscan Blockscout API
 * Used as fallback when tokenURI metadata lacks description
 * API: GET /api/v2/tokens/{contract}/instances/{tokenId}
 */
async function fetchGunzscanMetadata(
  contractAddress: string,
  tokenId: string
): Promise<{ description?: string; name?: string; image?: string; attributes?: Array<{ trait_type: string; value: string | number }> } | null> {
  try {
    const url = `${GUNZSCAN_API_BASE}/api/v2/tokens/${contractAddress}/instances/${tokenId}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // Blockscout API returns metadata nested under "metadata" field
    const metadata = data?.metadata;
    if (!metadata) {
      return null;
    }

    return {
      description: metadata.description,
      name: metadata.name,
      image: metadata.image,
      attributes: Array.isArray(metadata.attributes) ? metadata.attributes : undefined,
    };
  } catch (error) {
    console.warn(`[fetchGunzscanMetadata] Failed for token ${tokenId}:`, error);
    return null;
  }
}

/**
 * Fetch NFT metadata from the canonical metadata.gunzchain.io API via local proxy.
 * This API returns the authoritative Serial Number and attributes.
 * Used as override source when tokenURI returns Serial Number: 0.
 * Uses /api/metadata proxy to avoid CORS issues on production.
 */
async function fetchCanonicalMetadata(
  contractAddress: string,
  tokenId: string
): Promise<{ name?: string; description?: string; image?: string; attributes?: Array<{ trait_type: string; value: string | number }> } | null> {
  try {
    // Use local proxy to avoid CORS issues (metadata.gunzchain.io doesn't allow cross-origin)
    const url = `/api/metadata/${contractAddress}/${tokenId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // This API returns flat format: { name, description, image, attributes: [...] }
      // Attributes are standard: [{ trait_type: "Serial Number", value: "768" }, ...]
      if (data && Array.isArray(data.attributes)) {
        return {
          name: data.name,
          description: data.description,
          image: data.image || data.image_url,
          attributes: data.attributes,
        };
      }

      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (DEBUG_ACQUISITION) {
      console.warn(`[fetchCanonicalMetadata] Failed for token ${tokenId}:`, error);
    }
    return null;
  }
}

// =============================================================================
// Robust TokenURI Resolver
// =============================================================================

// IPFS gateways to try in order (with timeout)
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

// ResolvedMetadata uses MetadataSource from types.ts
interface ResolvedMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number; display_type?: string }>;
  source: MetadataSource;
  tokenURI?: string; // Raw tokenURI for debug
  error?: string; // Error message if resolution failed
  typeSpec?: NFTTypeSpec; // Raw type_spec from metadata for functional tier detection
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Try fetching from multiple IPFS gateways in parallel using Promise.any()
 * Returns the first successful response, significantly faster than sequential fallback
 */
async function fetchFromIPFS(cid: string, timeoutMs: number = 8000): Promise<any | null> {
  try {
    // Race all gateways in parallel - first success wins
    const result = await Promise.any(
      IPFS_GATEWAYS.map(async (gateway) => {
        const url = `${gateway}${cid}`;
        const response = await fetchWithTimeout(url, timeoutMs);
        if (!response.ok) {
          throw new Error(`Gateway ${gateway} returned ${response.status}`);
        }
        return response.json();
      })
    );
    return result;
  } catch (error) {
    // All gateways failed (AggregateError from Promise.any)
    if (DEBUG_ACQUISITION) {
      console.warn(`[fetchFromIPFS] All gateways failed for ${cid}`);
    }
    return null;
  }
}

/**
 * Normalize a raw metadata JSON response to extract standard NFT fields.
 * Handles two formats:
 *   1. Standard: { name, description, image, attributes, ... }
 *   2. Wrapped:  { metadata: { name, description, image, attributes, ... }, image_url, ... }
 *      (used by metadata.gunzchain.io and Gunzscan/Blockscout APIs)
 */
function normalizeMetadataResponse(raw: Record<string, unknown>): {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  typeSpec?: NFTTypeSpec;
} {
  // If `attributes` exists at top level, it's already standard format
  if (Array.isArray(raw.attributes)) {
    return {
      ...(raw as any),
      typeSpec: raw.type_spec as NFTTypeSpec | undefined,
    };
  }

  // Check for nested `metadata` wrapper (metadata.gunzchain.io / Blockscout format)
  const nested = raw.metadata;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const meta = nested as Record<string, unknown>;
    return {
      name: (meta.name as string) || (raw.name as string),
      description: (meta.description as string) || (raw.description as string),
      image: (meta.image as string) || (raw.image_url as string) || (raw.image as string),
      attributes: Array.isArray(meta.attributes) ? meta.attributes : undefined,
      typeSpec: (meta.type_spec || raw.type_spec) as NFTTypeSpec | undefined,
    };
  }

  // Fallback: use top-level image_url if image is missing
  if (!raw.image && raw.image_url) {
    return {
      ...(raw as any),
      image: raw.image_url,
      typeSpec: raw.type_spec as NFTTypeSpec | undefined,
    } as any;
  }

  return {
    ...(raw as any),
    typeSpec: raw.type_spec as NFTTypeSpec | undefined,
  };
}

/**
 * Resolve tokenURI to metadata with robust handling for all URI types
 * Supports: http(s), ipfs://, data:application/json;base64, data:application/json;utf8
 */
async function resolveTokenURIMetadata(tokenURI: string): Promise<ResolvedMetadata> {
  if (!tokenURI) {
    return { source: 'none', error: 'Empty tokenURI' };
  }

  try {
    // HTTP(S) URLs
    if (tokenURI.startsWith('http://') || tokenURI.startsWith('https://')) {
      const response = await fetchWithTimeout(tokenURI);
      if (!response.ok) {
        return { source: 'none', tokenURI, error: `HTTP ${response.status}` };
      }
      const raw = await response.json();
      const normalized = normalizeMetadataResponse(raw);
      return { ...normalized, source: 'tokenURI', tokenURI };
    }

    // IPFS URLs - try multiple gateways
    if (tokenURI.startsWith('ipfs://')) {
      const cid = tokenURI.slice('ipfs://'.length);
      const raw = await fetchFromIPFS(cid);
      if (raw) {
        const normalized = normalizeMetadataResponse(raw);
        return { ...normalized, source: 'tokenURI', tokenURI };
      }
      return { source: 'none', tokenURI, error: 'All IPFS gateways failed' };
    }

    // Base64-encoded JSON data URI
    if (tokenURI.startsWith('data:application/json;base64,')) {
      const base64Data = tokenURI.slice('data:application/json;base64,'.length);
      const jsonString = atob(base64Data);
      const raw = JSON.parse(jsonString);
      const normalized = normalizeMetadataResponse(raw);
      return { ...normalized, source: 'tokenURI', tokenURI };
    }

    // UTF-8 encoded JSON data URI (with or without explicit utf8)
    if (tokenURI.startsWith('data:application/json;utf8,') || tokenURI.startsWith('data:application/json,')) {
      const prefix = tokenURI.startsWith('data:application/json;utf8,')
        ? 'data:application/json;utf8,'
        : 'data:application/json,';
      const encodedData = tokenURI.slice(prefix.length);
      const jsonString = decodeURIComponent(encodedData);
      const raw = JSON.parse(jsonString);
      const normalized = normalizeMetadataResponse(raw);
      return { ...normalized, source: 'tokenURI', tokenURI };
    }

    // Unknown URI scheme
    return { source: 'none', tokenURI, error: `Unknown URI scheme: ${tokenURI.slice(0, 20)}...` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (DEBUG_ACQUISITION) {
      console.warn(`[resolveTokenURIMetadata] Failed for ${tokenURI.slice(0, 50)}:`, error);
    }
    return { source: 'none', tokenURI, error: errorMessage };
  }
}

/**
 * Merge metadata from multiple sources, preserving non-empty values
 * Priority: tokenURI > gunzscan > fallback
 */
function mergeMetadata(
  primary: ResolvedMetadata,
  fallback: { description?: string; name?: string; image?: string; attributes?: Array<{ trait_type: string; value: string | number }> } | null
): ResolvedMetadata {
  // Helper to check if a string value is non-empty
  const isNonEmpty = (val: unknown): val is string =>
    typeof val === 'string' && val.trim().length > 0;

  return {
    name: isNonEmpty(primary.name) ? primary.name : (isNonEmpty(fallback?.name) ? fallback.name : primary.name),
    description: isNonEmpty(primary.description) ? primary.description : (isNonEmpty(fallback?.description) ? fallback.description : undefined),
    image: isNonEmpty(primary.image) ? primary.image : (isNonEmpty(fallback?.image) ? fallback.image : primary.image),
    attributes: primary.attributes?.length ? primary.attributes : (fallback?.attributes as any) ?? primary.attributes,
    source: isNonEmpty(primary.description) ? primary.source : (isNonEmpty(fallback?.description) ? 'gunzscan' : primary.source),
    tokenURI: primary.tokenURI,
    error: primary.error,
  };
}

// =============================================================================
// Venue Classification Constants
// =============================================================================

// Known Seaport fulfill selectors (OpenSea)
const SEAPORT_SELECTORS = new Set([
  '0xfb0f3ee1', // fulfillBasicOrder
  '0x87201b41', // fulfillBasicOrder_efficient_6GL6yc
  '0xb3a34c4c', // fulfillOrder
  '0xe7acab24', // fulfillAvailableOrders
  '0xed98a574', // fulfillAvailableAdvancedOrders
  '0xf2d12b12', // matchOrders
  '0x88147732', // matchAdvancedOrders
]);

// Seaport contract address on GunzChain (OpenSea's deployed Seaport 1.6)
const SEAPORT_GUNZCHAIN_ADDRESS = '0x00000000006687982678b03100b9bdc8be440814';

// Seaport OrderFulfilled event topic0 (keccak256 of event signature)
// Event: OrderFulfilled(bytes32,address,address,address,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256,address)[])
const ORDER_FULFILLED_TOPIC0 = '0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31';

// Known OTG Marketplace selector
const OTG_MARKETPLACE_SELECTOR = '0xdc2e6be8';

// Known Decoder selectors (add more as discovered)
const DECODER_SELECTORS = new Set([
  '0x00000000', // placeholder - add actual decoder selectors
]);

// In-game marketplace contract and trade event detection
const IN_GAME_MARKETPLACE_ADDRESS = '0x4c9b291874fb5363e3a46cd3bf4a352ffa26a124';
// Trade event topic0 from in-game marketplace (contains price in wei)
const IN_GAME_TRADE_TOPIC0 = '0xdc1da0bf7038060851086ae316261313bb58ae31a3c217e4ba5f5baf0c7756b8';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize an Ethereum address to lowercase with 0x prefix
 */
function normalizeAddr(addr: string | null | undefined): string {
  if (!addr) return '';
  return addr.toLowerCase().startsWith('0x') ? addr.toLowerCase() : `0x${addr.toLowerCase()}`;
}

/**
 * Extract the 4-byte function selector from transaction data
 */
function getSelector(data: string | null | undefined): string | null {
  if (!data || data.length < 10) return null;
  return data.slice(0, 10).toLowerCase();
}

/**
 * Parse a comma-separated list of contract addresses from env var
 */
function parseContractList(envVar: string | undefined): Set<string> {
  if (!envVar) return new Set();
  return new Set(
    envVar
      .split(',')
      .map((addr) => normalizeAddr(addr.trim()))
      .filter((addr) => addr.length > 0)
  );
}

/**
 * Compute net GUN outflow from a transaction receipt
 * Returns the net amount of GUN tokens sent FROM the wallet (outflow - inflow)
 */
function computeNetGunOutflowFromReceipt(
  receipt: ethers.TransactionReceipt,
  walletAddress: string,
  gunTokenAddress: string
): number {
  const walletLower = normalizeAddr(walletAddress);
  const gunLower = normalizeAddr(gunTokenAddress);
  const erc20TransferSig = ethers.id('Transfer(address,address,uint256)');

  let outflow = BigInt(0);
  let inflow = BigInt(0);

  for (const log of receipt.logs) {
    // Check if this is a GUN token Transfer event
    if (normalizeAddr(log.address) !== gunLower) continue;
    if (log.topics[0] !== erc20TransferSig) continue;
    if (log.topics.length < 3) continue;

    const from = normalizeAddr('0x' + log.topics[1].slice(26));
    const to = normalizeAddr('0x' + log.topics[2].slice(26));
    const value = BigInt(log.data);

    if (from === walletLower) {
      outflow += value;
    }
    if (to === walletLower) {
      inflow += value;
    }
  }

  const netOutflow = outflow > inflow ? outflow - inflow : BigInt(0);
  return parseFloat(ethers.formatUnits(netOutflow, 18));
}

// =============================================================================
// Types
// =============================================================================

export interface NFTHoldingAcquisition {
  owned: boolean;
  acquiredAtIso: string | null;
  txHash: string | null;
  venue: AcquisitionVenue;
  costGun: number;
  fromAddress?: string;
  isMint?: boolean;
  debug?: {
    txTo?: string;
    selector?: string;
    gunIsNative?: boolean;
    matchedRule?: string;
    hasOrderFulfilled?: boolean;
    hasInGameTrade?: boolean;
    inGameTradePriceWei?: string;
  };
}

/**
 * Get the starting block for transfer event queries.
 * Uses hardcoded deployment blocks for known contracts, falls back to recent history.
 */
function getQueryStartBlock(
  chainId: number,
  contractAddress: string,
  currentBlock: number
): number {
  const key = `${chainId}:${contractAddress.toLowerCase()}`;
  const deploymentBlock = DEPLOYMENT_START_BLOCKS[key];

  if (deploymentBlock !== undefined) {
    return deploymentBlock;
  }

  // Fallback: look back a reasonable amount instead of from genesis
  return Math.max(0, currentBlock - DEFAULT_LOOKBACK_BLOCKS);
}

// ERC-721 ABI for NFT queries
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

// ERC-1155 ABI for multi-token queries
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
];

export class AvalancheService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async getGunTokenBalance(walletAddress: string): Promise<TokenBalance | null> {
    try {
      // GUN is the native token on GUNZ chain (chainId 43419), like ETH on Ethereum
      // Simply fetch the native balance - no ERC-20 contract needed
      const balance = await this.provider.getBalance(walletAddress);
      const formattedBalance = parseFloat(ethers.formatEther(balance));

      return {
        balance: formattedBalance,
        decimals: 18,
        symbol: 'GUN',
      };
    } catch (error) {
      console.error('Error fetching Avalanche GUN token balance:', error);
      return null;
    }
  }

  /**
   * Get NFTs with pagination support
   * @param walletAddress - Wallet address to query
   * @param startIndex - Starting index (default 0)
   * @param pageSize - Number of NFTs to fetch (default 50)
   * @returns NFTPageResult with nfts, totalCount, and pagination info
   */
  async getNFTsPaginated(
    walletAddress: string,
    startIndex: number = 0,
    pageSize: number = 50
  ): Promise<NFTPageResult> {
    try {
      const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE;

      if (!nftContractAddress || nftContractAddress.includes('Your')) {
        console.warn('NFT collection address not configured for Avalanche');
        return { nfts: [], totalCount: 0, startIndex, pageSize, hasMore: false };
      }

      const contract = new ethers.Contract(nftContractAddress, ERC721_ABI, this.provider);
      const balance = await contract.balanceOf(walletAddress);
      const totalCount = Number(balance);

      if (totalCount === 0 || startIndex >= totalCount) {
        return { nfts: [], totalCount, startIndex, pageSize, hasMore: false };
      }

      const nfts: NFT[] = [];
      const endIndex = Math.min(startIndex + pageSize, totalCount);

      // Fetch NFT details for each token in the page range
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
          const tokenIdStr = tokenId.toString();

          // Check metadata cache first (token-specific, not wallet-specific)
          const cachedMeta = getCachedMetadata('avalanche', nftContractAddress, tokenIdStr);
          if (cachedMeta.hit && cachedMeta.value) {
            // Use cached metadata - instant load
            nfts.push({
              tokenId: tokenIdStr,
              mintNumber: cachedMeta.value.mintNumber,
              name: cachedMeta.value.name,
              description: cachedMeta.value.description,
              image: cachedMeta.value.image,
              collection: 'Off The Grid NFT Collection',
              chain: 'avalanche',
              traits: cachedMeta.value.traits,
              metadataDebug: {
                tokenURI: '',
                metadataSource: 'cache' as MetadataSource,
                hasDescription: !!cachedMeta.value.description,
                descriptionLength: cachedMeta.value.description?.length ?? 0,
              },
            });
            continue; // Skip network fetch
          }

          // No cache hit - fetch from network
          const tokenURI = await contract.tokenURI(tokenId);

          // Use robust tokenURI resolver with IPFS gateway fallback
          let resolvedMeta = await resolveTokenURIMetadata(tokenURI);

          // Fallback: If description is missing, try Gunzscan Blockscout API
          if (!resolvedMeta.description && nftContractAddress) {
            try {
              const gunzscanMeta = await fetchGunzscanMetadata(nftContractAddress, tokenIdStr);
              // Merge with priority: keep tokenURI values, fill in missing from gunzscan
              resolvedMeta = mergeMetadata(resolvedMeta, gunzscanMeta);
            } catch {
              // Ignore fallback errors
            }
          }

          // Process traits and extract mint number
          let traits = resolvedMeta.attributes?.reduce((acc: Record<string, string>, attr) => {
            acc[attr.trait_type] = String(attr.value);
            return acc;
          }, {} as Record<string, string>);

          // Extract mint number from traits (check various possible trait names)
          let mintNumber = traits?.['Mint Number'] ||
                          traits?.['MINT_NUMBER'] ||
                          traits?.['Serial Number'] ||
                          traits?.['SERIAL_NUMBER'] ||
                          traits?.['serialNumber'];

          // Fix mint #0: If serial number is 0 or missing, fetch from canonical API
          // The contract tokenURI sometimes returns Serial Number: 0 for valid tokens
          if (nftContractAddress && (!mintNumber || mintNumber === '0')) {
            try {
              const canonicalMeta = await fetchCanonicalMetadata(
                nftContractAddress,
                tokenIdStr
              );
              if (canonicalMeta?.attributes) {
                const canonicalTraits = canonicalMeta.attributes.reduce(
                  (acc: Record<string, string>, attr) => {
                    acc[attr.trait_type] = String(attr.value);
                    return acc;
                  },
                  {} as Record<string, string>
                );
                const canonicalMint = canonicalTraits['Serial Number'] ||
                                     canonicalTraits['Mint Number'];
                if (canonicalMint && canonicalMint !== '0') {
                  mintNumber = canonicalMint;
                  // Also update traits with canonical values for display
                  if (traits) {
                    traits['Serial Number'] = canonicalMint;
                  }
                  if (DEBUG_ACQUISITION) {
                    console.log(`[Canonical Override] Token ${tokenId}: Serial Number 0 → ${canonicalMint}`);
                  }
                }
              }
            } catch {
              // Non-critical: keep original mint number
            }
          }

          // Build metadata debug info
          const metadataDebug: NFTMetadataDebug = {
            tokenURI: tokenURI,
            metadataSource: resolvedMeta.source,
            hasDescription: !!resolvedMeta.description && resolvedMeta.description.trim().length > 0,
            descriptionLength: resolvedMeta.description?.length ?? 0,
            error: resolvedMeta.error,
          };

          // Convert IPFS image URLs to gateway URLs
          let imageUrl = resolvedMeta.image || '';
          if (imageUrl.startsWith('ipfs://')) {
            imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }

          const finalName = resolvedMeta.name || `NFT #${tokenId}`;

          // Cache the resolved metadata for future loads (7 day TTL)
          // Only cache if we got meaningful data (has name or image)
          if (finalName && finalName !== `NFT #${tokenId}` || imageUrl) {
            setCachedMetadata('avalanche', nftContractAddress, tokenIdStr, {
              name: finalName,
              description: resolvedMeta.description,
              image: imageUrl,
              traits,
              mintNumber: mintNumber?.toString(),
            });
          }

          nfts.push({
            tokenId: tokenIdStr,
            mintNumber: mintNumber?.toString(),
            name: finalName,
            description: resolvedMeta.description || undefined,
            image: imageUrl,
            collection: 'Off The Grid NFT Collection',
            chain: 'avalanche',
            traits,
            metadataDebug,
            typeSpec: resolvedMeta.typeSpec,
          });
        } catch (error) {
          console.error(`Error fetching NFT at index ${i}:`, error);
        }
      }

      return {
        nfts,
        totalCount,
        startIndex,
        pageSize,
        hasMore: endIndex < totalCount,
      };
    } catch (error) {
      console.error('Error fetching Avalanche NFTs:', error);
      return { nfts: [], totalCount: 0, startIndex, pageSize, hasMore: false };
    }
  }

  /**
   * @deprecated Use getNFTsPaginated instead for proper pagination
   * Legacy method that returns first 50 NFTs (for backward compatibility)
   */
  async getNFTs(walletAddress: string): Promise<NFT[]> {
    const result = await this.getNFTsPaginated(walletAddress, 0, 50);
    return result.nfts;
  }

  async getAvaxBalance(walletAddress: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error fetching AVAX balance:', error);
      return 0;
    }
  }

  /**
   * Query transfer events in chunks to handle large block ranges
   * Returns all logs sorted by (blockNumber, logIndex)
   */
  private async queryLogsInChunks(
    filter: ethers.Filter,
    fromBlock: number,
    toBlock: number,
    chunkSize: number = 100000
  ): Promise<{ logs: ethers.Log[]; chunksQueried: number; blockRanges: Array<{ from: number; to: number; logsFound: number }> }> {
    const allLogs: ethers.Log[] = [];
    const blockRanges: Array<{ from: number; to: number; logsFound: number }> = [];
    let chunksQueried = 0;

    for (let start = fromBlock; start <= toBlock; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, toBlock);
      chunksQueried++;

      try {
        const logs = await this.provider.getLogs({
          ...filter,
          fromBlock: start,
          toBlock: end,
        });
        blockRanges.push({ from: start, to: end, logsFound: logs.length });
        allLogs.push(...logs);
      } catch (error) {
        // If chunk is too large, try smaller chunks
        if (chunkSize > 10000) {
          console.warn(`Chunk ${start}-${end} failed, retrying with smaller chunks`);
          const subResult = await this.queryLogsInChunks(filter, start, end, Math.floor(chunkSize / 4));
          blockRanges.push(...subResult.blockRanges);
          allLogs.push(...subResult.logs);
          chunksQueried += subResult.chunksQueried - 1;
        } else {
          console.error(`Failed to query logs for range ${start}-${end}:`, error);
          blockRanges.push({ from: start, to: end, logsFound: -1 });
        }
      }
    }

    // Sort by blockNumber, then logIndex
    allLogs.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }
      return a.index - b.index;
    });

    return { logs: allLogs, chunksQueried, blockRanges };
  }

  /**
   * Get all Transfer events for a specific tokenId (any sender, any receiver)
   * Uses explicit topic encoding to ensure correct matching
   */
  async getTransferEvents(
    contractAddress: string,
    tokenId: string
  ): Promise<{
    events: Array<{
      from: string;
      to: string;
      tokenId: string;
      blockNumber: number;
      logIndex: number;
      transactionHash: string;
    }>;
    currentOwner: string | null;
    debugInfo: {
      fromBlock: number;
      toBlock: number;
      chunksQueried: number;
      totalLogsFound: number;
      blockRanges: Array<{ from: number; to: number; logsFound: number }>;
    };
  }> {
    const currentBlock = await this.provider.getBlockNumber();

    // Get chain ID for deployment block lookup
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    // Use optimized start block based on contract deployment
    const fromBlock = getQueryStartBlock(chainId, contractAddress, currentBlock);

    // ERC-721 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const topic0 = ethers.id('Transfer(address,address,uint256)');

    // Encode tokenId as 32-byte hex (topic3 for ERC-721)
    const topic3 = ethers.zeroPadValue(ethers.toBeHex(BigInt(tokenId)), 32);

    const filter: ethers.Filter = {
      address: contractAddress,
      topics: [topic0, null, null, topic3], // [signature, from (any), to (any), tokenId]
    };

    console.log(`[getTransferEvents] Querying transfers for tokenId=${tokenId}`);
    console.log(`[getTransferEvents] Chain: ${chainId}, Block range: ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);
    console.log(`[getTransferEvents] Filter topics:`, { topic0, topic3 });

    const { logs, chunksQueried, blockRanges } = await this.queryLogsInChunks(filter, fromBlock, currentBlock);

    console.log(`[getTransferEvents] Found ${logs.length} transfer events`);

    // Parse logs into structured events
    const events = logs.map((log) => ({
      from: '0x' + log.topics[1].slice(26).toLowerCase(),
      to: '0x' + log.topics[2].slice(26).toLowerCase(),
      tokenId: BigInt(log.topics[3]).toString(),
      blockNumber: log.blockNumber,
      logIndex: log.index,
      transactionHash: log.transactionHash,
    }));

    // Derive currentOwner from the last transfer's "to" address
    const currentOwner = events.length > 0 ? events[events.length - 1].to : null;

    return {
      events,
      currentOwner,
      debugInfo: {
        fromBlock,
        toBlock: currentBlock,
        chunksQueried,
        totalLogsFound: logs.length,
        blockRanges,
      },
    };
  }

  /**
   * @deprecated Use getNFTHoldingAcquisition for current holding details.
   *
   * This legacy method returns the ORIGINAL/FIRST acquisition (when wallet first received the token).
   * For current holding acquisition (most recent inbound transfer), use getNFTHoldingAcquisition instead.
   *
   * Key difference:
   * - getNFTTransferHistory: Returns FIRST incoming transfer (original acquisition)
   * - getNFTHoldingAcquisition: Returns MOST RECENT incoming transfer (current holding)
   *
   * If a user sold and re-bought an NFT, this method returns the original purchase,
   * while getNFTHoldingAcquisition returns the re-purchase.
   */
  async getNFTTransferHistory(
    contractAddress: string,
    tokenId: string,
    walletAddress: string
  ): Promise<{
    purchasePriceGun: number;
    purchaseDate?: Date;
    transferredFrom?: string;
    isFreeTransfer?: boolean;
    debugInfo?: {
      fromBlock: number;
      toBlock: number;
      chunksQueried: number;
      totalLogsFound: number;
      currentOwner: string | null;
    };
  } | null> {
    try {
      // Use new robust getTransferEvents method
      const { events, currentOwner, debugInfo } = await this.getTransferEvents(contractAddress, tokenId);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTTransferHistory] tokenId=${tokenId}, wallet=${walletAddress}`);
        console.log(`[getNFTTransferHistory] Found ${events.length} total transfer events, currentOwner=${currentOwner}`);
      }

      if (events.length === 0) {
        return {
          purchasePriceGun: 0,
          isFreeTransfer: true,
          debugInfo: {
            ...debugInfo,
            currentOwner,
          },
        };
      }

      // Find transfers where this wallet received the token
      const walletLower = walletAddress.toLowerCase();
      const incomingTransfers = events.filter((e) => e.to === walletLower);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTTransferHistory] Incoming transfers to wallet: ${incomingTransfers.length}`);
      }

      if (incomingTransfers.length === 0) {
        // Wallet doesn't own this token based on transfer history
        return {
          purchasePriceGun: 0,
          isFreeTransfer: true,
          debugInfo: {
            ...debugInfo,
            currentOwner,
          },
        };
      }

      // Get the FIRST transfer to this wallet (original acquisition)
      const firstIncoming = incomingTransfers[0];
      const isFromZeroAddress = firstIncoming.from === '0x0000000000000000000000000000000000000000';

      // Fetch block and transaction details
      const block = await this.provider.getBlock(firstIncoming.blockNumber);
      const txReceipt = await this.provider.getTransactionReceipt(firstIncoming.transactionHash);
      const transaction = await this.provider.getTransaction(firstIncoming.transactionHash);

      if (DEBUG_ACQUISITION) {
        console.log('[getNFTTransferHistory] First incoming transfer:', {
          hash: firstIncoming.transactionHash,
          from: firstIncoming.from,
          to: firstIncoming.to,
          blockNumber: firstIncoming.blockNumber,
          isFromZeroAddress,
        });
      }

      // Look for GUN token transfers in the transaction receipt
      let purchasePriceGun: number | undefined;

      // ERC-20 Transfer event signature
      const erc20TransferSignature = ethers.id('Transfer(address,address,uint256)');
      const gunTokenAddress = process.env.NEXT_PUBLIC_GUN_TOKEN_AVALANCHE?.toLowerCase();

      if (txReceipt && txReceipt.logs) {
        for (const log of txReceipt.logs) {
          // Check if this is an ERC-20 Transfer event (only 3 topics for non-indexed value)
          if (log.topics[0] === erc20TransferSignature && log.topics.length === 3) {
            // Check if this transfer is FROM the wallet (payment)
            const fromAddress = '0x' + log.topics[1].slice(26).toLowerCase();

            if (fromAddress === walletLower) {
              // Decode the transfer amount (value is in the data field for ERC-20)
              const value = BigInt(log.data);
              // Assume 18 decimals for GUN token
              const amount = parseFloat(ethers.formatUnits(value, 18));

              if (DEBUG_ACQUISITION) {
                console.log(`[getNFTTransferHistory] Found outgoing ERC-20 transfer: ${amount} tokens from ${log.address}`);
              }

              // If this is from the GUN token contract, use this as purchase price
              if (gunTokenAddress && log.address.toLowerCase() === gunTokenAddress) {
                purchasePriceGun = amount;
                if (DEBUG_ACQUISITION) {
                  console.log(`[getNFTTransferHistory] GUN token purchase detected: ${purchasePriceGun} GUN`);
                }
              } else if (purchasePriceGun === undefined) {
                // Use first outgoing token transfer as purchase price if we don't have GUN specifically
                purchasePriceGun = amount;
                if (DEBUG_ACQUISITION) {
                  console.log(`[getNFTTransferHistory] Token purchase detected from ${log.address}: ${amount} tokens`);
                }
              }
            }
          }
        }
      }

      // If no ERC-20 transfer found, check native transaction value
      // On GunzChain, native token is GUN
      if (purchasePriceGun === undefined && transaction && transaction.value > BigInt(0)) {
        purchasePriceGun = parseFloat(ethers.formatEther(transaction.value));
        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTTransferHistory] Native GUN payment detected: ${purchasePriceGun} GUN`);
        }
      }

      // Determine if this was a free transfer (no payment detected)
      const isFreeTransfer = purchasePriceGun === undefined || purchasePriceGun === 0;

      return {
        purchasePriceGun: purchasePriceGun ?? 0,
        purchaseDate: block ? new Date(block.timestamp * 1000) : undefined,
        transferredFrom: isFreeTransfer && !isFromZeroAddress ? firstIncoming.from : undefined,
        isFreeTransfer,
        debugInfo: {
          ...debugInfo,
          currentOwner,
        },
      };
    } catch (error) {
      console.error('Error fetching NFT transfer history:', error);
      return null;
    }
  }

  async detectNFTQuantity(
    contractAddress: string,
    tokenId: string,
    walletAddress: string
  ): Promise<number> {
    try {
      // Try ERC-1155 first (supports multiple quantities)
      const erc1155Contract = new ethers.Contract(contractAddress, ERC1155_ABI, this.provider);

      try {
        const quantity = await erc1155Contract.balanceOf(walletAddress, tokenId);
        return Number(quantity);
      } catch {
        // Not ERC-1155 or method doesn't exist, assume ERC-721 (quantity = 1)
        return 1;
      }
    } catch (error) {
      console.error('Error detecting NFT quantity:', error);
      return 1;
    }
  }

  /**
   * Check if GUN is native token (no contract code) or ERC-20
   * Caches result for efficiency
   */
  /**
   * GUN is always the native token on GUNZ chain (chainId 43419)
   */
  private async isGunNative(): Promise<boolean> {
    return true;
  }

  /**
   * Check if receipt contains a Seaport OrderFulfilled event
   */
  private hasOrderFulfilledEvent(receipt: ethers.TransactionReceipt | null): boolean {
    if (!receipt) return false;
    return receipt.logs.some(
      (log) => log.topics?.[0]?.toLowerCase() === ORDER_FULFILLED_TOPIC0.toLowerCase()
    );
  }

  /**
   * Find in-game marketplace trade event in receipt logs
   * Returns the trade log if found, null otherwise
   */
  private findInGameTradeLog(receipt: ethers.TransactionReceipt | null): ethers.Log | null {
    if (!receipt) return null;
    return receipt.logs.find(
      (log) => log.topics?.[0]?.toLowerCase() === IN_GAME_TRADE_TOPIC0.toLowerCase()
    ) ?? null;
  }

  /**
   * Classify the acquisition venue based on transaction context
   */
  private classifyVenue(
    txTo: string | null,
    selector: string | null,
    fromAddress: string,
    receipt: ethers.TransactionReceipt | null
  ): { venue: AcquisitionVenue; matchedRule: string; hasOrderFulfilled: boolean; hasInGameTrade: boolean; inGameTradeLog: ethers.Log | null } {
    const txToLower = normalizeAddr(txTo);
    const hasOrderFulfilled = this.hasOrderFulfilledEvent(receipt);
    const inGameTradeLog = this.findInGameTradeLog(receipt);
    const hasInGameTrade = !!inGameTradeLog || txToLower === IN_GAME_MARKETPLACE_ADDRESS;

    // Check for decode/mint (from zero address = in-game hex decode)
    if (fromAddress === '0x0000000000000000000000000000000000000000') {
      return { venue: 'decode', matchedRule: 'decode_mint', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }

    // 1. OpenSea / Seaport check - MUST come before decoder check
    // Check for Seaport GunzChain contract address OR OrderFulfilled event in receipt
    if (txToLower === SEAPORT_GUNZCHAIN_ADDRESS || hasOrderFulfilled) {
      return { venue: 'opensea', matchedRule: 'opensea_seaport_match', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }

    // Also check env-configured OpenSea contracts and Seaport selectors
    const openseaContracts = parseContractList(process.env.NEXT_PUBLIC_OPENSEA_CONTRACTS);
    if (openseaContracts.has(txToLower)) {
      return { venue: 'opensea', matchedRule: 'opensea_contract_match', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }
    if (selector && SEAPORT_SELECTORS.has(selector)) {
      return { venue: 'opensea', matchedRule: 'seaport_selector_match', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }

    // 2. In-game marketplace check (trade event or contract address match)
    if (hasInGameTrade) {
      return { venue: 'in_game_marketplace', matchedRule: 'in_game_marketplace_trade_event', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }

    // 3. Decoder contract check
    const decoderContract = normalizeAddr(process.env.NEXT_PUBLIC_OTG_DECODER_CONTRACT);
    if (decoderContract && txToLower === decoderContract) {
      return { venue: 'decoder', matchedRule: 'decoder_contract_match', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }
    if (selector && DECODER_SELECTORS.has(selector)) {
      return { venue: 'decoder', matchedRule: 'decoder_selector_match', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }

    // 4. OTG Marketplace check (legacy - may be superseded by in_game_marketplace)
    const marketplaceContract = normalizeAddr(process.env.NEXT_PUBLIC_OTG_MARKETPLACE_CONTRACT);
    if (marketplaceContract && txToLower === marketplaceContract) {
      return { venue: 'otg_marketplace', matchedRule: 'marketplace_contract_match', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }
    if (selector === OTG_MARKETPLACE_SELECTOR) {
      return { venue: 'otg_marketplace', matchedRule: 'marketplace_selector_match', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }

    // 5. Default to transfer if we have tx.to, otherwise unknown
    if (txTo) {
      return { venue: 'transfer', matchedRule: 'default_transfer', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
    }

    return { venue: 'unknown', matchedRule: 'no_tx_to', hasOrderFulfilled, hasInGameTrade, inGameTradeLog };
  }

  /**
   * Get acquisition details for a CURRENTLY OWNED NFT
   * Returns the most recent inbound transfer (current holding acquisition)
   *
   * @param contractAddress - NFT contract address
   * @param tokenId - Token ID
   * @param walletAddress - Wallet address to check ownership for
   * @returns Acquisition details or null if not owned
   */
  async getNFTHoldingAcquisition(
    contractAddress: string,
    tokenId: string,
    walletAddress: string
  ): Promise<NFTHoldingAcquisition | null> {
    try {
      const walletLower = normalizeAddr(walletAddress);

      // Get all transfer events for this token
      const { events, currentOwner } = await this.getTransferEvents(contractAddress, tokenId);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTHoldingAcquisition] tokenId=${tokenId}, wallet=${walletLower}`);
        console.log(`[getNFTHoldingAcquisition] currentOwner=${currentOwner}, events=${events.length}`);
      }

      // Verify wallet is current owner
      if (normalizeAddr(currentOwner) !== walletLower) {
        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTHoldingAcquisition] Wallet is not current owner`);
        }
        return {
          owned: false,
          acquiredAtIso: null,
          txHash: null,
          venue: 'unknown',
          costGun: 0,
        };
      }

      // Find all inbound transfers to this wallet
      const incomingTransfers = events.filter((e) => normalizeAddr(e.to) === walletLower);

      if (incomingTransfers.length === 0) {
        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTHoldingAcquisition] No incoming transfers found`);
        }
        return {
          owned: true,
          acquiredAtIso: null,
          txHash: null,
          venue: 'unknown',
          costGun: 0,
        };
      }

      // Get the MOST RECENT inbound transfer (current holding acquisition)
      const acquisitionEvent = incomingTransfers[incomingTransfers.length - 1];
      const isMint = acquisitionEvent.from === '0x0000000000000000000000000000000000000000';

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTHoldingAcquisition] Acquisition event:`, {
          txHash: acquisitionEvent.transactionHash,
          from: acquisitionEvent.from,
          block: acquisitionEvent.blockNumber,
          isMint,
        });
      }

      // Fetch transaction and block details
      const [tx, receipt, block] = await Promise.all([
        this.provider.getTransaction(acquisitionEvent.transactionHash),
        this.provider.getTransactionReceipt(acquisitionEvent.transactionHash),
        this.provider.getBlock(acquisitionEvent.blockNumber),
      ]);

      // Get acquisition timestamp
      const acquiredAtIso = block ? new Date(block.timestamp * 1000).toISOString() : null;

      // Extract tx context
      const txTo = tx?.to ?? null;
      const selector = getSelector(tx?.data);

      // Classify venue (pass receipt for OrderFulfilled and in-game trade detection)
      const { venue, matchedRule, hasOrderFulfilled, hasInGameTrade, inGameTradeLog } = this.classifyVenue(txTo, selector, acquisitionEvent.from, receipt);

      if (DEBUG_ACQUISITION) {
        console.log(`[getNFTHoldingAcquisition] Venue classification:`, {
          txTo,
          selector,
          venue,
          matchedRule,
          hasOrderFulfilled,
          hasInGameTrade,
        });
      }

      // Compute cost in GUN
      let costGun = 0;
      let inGameTradePriceWei: string | undefined;
      const gunIsNative = await this.isGunNative();
      const gunTokenAddress = process.env.NEXT_PUBLIC_GUN_TOKEN_AVALANCHE;

      // Priority 1: Extract price from in-game marketplace trade event
      if (hasInGameTrade && inGameTradeLog) {
        try {
          // The trade event data contains the price in wei (18 decimals)
          const priceWei = inGameTradeLog.data && inGameTradeLog.data !== '0x'
            ? BigInt(inGameTradeLog.data)
            : BigInt(0);
          inGameTradePriceWei = priceWei.toString();
          costGun = parseFloat(ethers.formatUnits(priceWei, 18));

          if (DEBUG_ACQUISITION) {
            console.log(`[getNFTHoldingAcquisition] In-game marketplace price: ${costGun} GUN (${inGameTradePriceWei} wei)`);
          }
        } catch (parseError) {
          console.warn('[getNFTHoldingAcquisition] Failed to parse in-game trade price:', parseError);
        }
      }
      // Priority 2: ERC-20 GUN token transfers (if not in-game marketplace)
      else if (!gunIsNative && receipt && gunTokenAddress) {
        // ERC-20 GUN: compute net outflow from receipt logs
        costGun = computeNetGunOutflowFromReceipt(receipt, walletAddress, gunTokenAddress);

        if (DEBUG_ACQUISITION) {
          console.log(`[getNFTHoldingAcquisition] ERC-20 GUN outflow: ${costGun}`);
        }
      }
      // Priority 3: Native GUN (tx.value)
      else if (gunIsNative && tx) {
        // Native GUN: use tx.value if tx.from is the wallet
        const txFrom = normalizeAddr(tx.from);
        if (txFrom === walletLower && tx.value > BigInt(0)) {
          costGun = parseFloat(ethers.formatEther(tx.value));

          if (DEBUG_ACQUISITION) {
            console.log(`[getNFTHoldingAcquisition] Native GUN payment: ${costGun}`);
          }
        }
      }

      return {
        owned: true,
        acquiredAtIso,
        txHash: acquisitionEvent.transactionHash,
        venue,
        costGun,
        fromAddress: isMint ? undefined : acquisitionEvent.from,
        isMint,
        debug: DEBUG_ACQUISITION
          ? {
              txTo: txTo ?? undefined,
              selector: selector ?? undefined,
              gunIsNative,
              matchedRule,
              hasOrderFulfilled,
              hasInGameTrade,
              inGameTradePriceWei,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[getNFTHoldingAcquisition] Error:', error);
      return null;
    }
  }

}
