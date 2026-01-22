'use client';

import { NFT, MarketplacePurchase, AcquisitionVenue } from '@/lib/types';
import Image from 'next/image';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AvalancheService, NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import { OpenSeaService } from '@/lib/api/opensea';
import { CoinGeckoService } from '@/lib/api/coingecko';
import {
  buildTokenKey,
  buildNftDetailCacheKey,
  getCachedNFTDetail,
  setCachedNFTDetail,
  CacheResult,
  CachedNFTDetailData,
} from '@/lib/utils/nftCache';
import { gunzExplorerAddressUrl, gunzExplorerTxUrl } from '@/lib/explorer';

// Safe ISO string converter - handles Date, string, number (ms), { seconds } objects
// Never throws, returns null for invalid/missing values
function toIsoStringSafe(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    // Already a string (possibly ISO format)
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? value : parsed.toISOString();
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

// Market data quality types (spread-based only)
type DataQualityLevel = 'strong' | 'fair' | 'limited';

// Position label states
type PositionState = 'UP' | 'DOWN' | 'FLAT' | 'NO_COST_BASIS' | 'NO_MARKET_REF';

interface PositionLabelResult {
  state: PositionState;
  pnlPct: number | null;
  pnlGun: number | null;
  marketRefGun: number | null;
  dataQuality: DataQualityLevel | null;
}

interface GetPositionLabelInput {
  acquisitionPriceGun: number | null | undefined;
  priceLow: number | null | undefined;
  priceHigh: number | null | undefined;
}

// Pure function to compute position label per spec
function getPositionLabel(input: GetPositionLabelInput): PositionLabelResult {
  const { acquisitionPriceGun, priceLow, priceHigh } = input;
  const epsilon = 1e-9;

  // Validate acquisition price
  const hasValidAcquisition =
    acquisitionPriceGun !== null &&
    acquisitionPriceGun !== undefined &&
    !isNaN(acquisitionPriceGun) &&
    acquisitionPriceGun >= 0.000001; // Treat extremely small as missing

  // Compute market reference (midpoint or single bound)
  let marketRefGun: number | null = null;
  const hasLow = priceLow !== null && priceLow !== undefined && !isNaN(priceLow) && priceLow >= 0;
  const hasHigh = priceHigh !== null && priceHigh !== undefined && !isNaN(priceHigh) && priceHigh >= 0;

  if (hasLow && hasHigh) {
    marketRefGun = (priceLow + priceHigh) / 2;
  } else if (hasLow) {
    marketRefGun = priceLow;
  } else if (hasHigh) {
    marketRefGun = priceHigh;
  }

  // Compute data quality (only if both bounds exist)
  let dataQuality: DataQualityLevel | null = null;
  if (hasLow && hasHigh) {
    const spreadRatio = (priceHigh - priceLow) / Math.max(priceLow, epsilon);
    if (spreadRatio <= 0.25) dataQuality = 'strong';
    else if (spreadRatio <= 0.60) dataQuality = 'fair';
    else dataQuality = 'limited';
  }

  // Determine state based on missing data
  if (marketRefGun === null) {
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

  // Compute P/L
  const pnlGun = marketRefGun - acquisitionPriceGun!;
  const pnlPct = pnlGun / Math.max(acquisitionPriceGun!, epsilon);

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
    pnlGun,
    marketRefGun,
    dataQuality,
  };
}

// Calculate market data quality based solely on price spread
// Does NOT use listing count or recency (not available from OpenSeaService)
function calculateDataQuality(priceLow?: number, priceHigh?: number): DataQualityLevel | null {
  // If we don't have both prices, return null (no quality to show)
  if (priceLow === undefined || priceHigh === undefined) {
    return null;
  }

  // Calculate spread ratio with epsilon to avoid division by zero
  const epsilon = 0.0001;
  const spreadRatio = (priceHigh - priceLow) / Math.max(priceLow, epsilon);

  // Resolution logic per spec
  if (spreadRatio <= 0.25) return 'strong';
  if (spreadRatio <= 0.60) return 'fair';
  return 'limited';
}

// Rarity order from highest to lowest
const RARITY_ORDER: Record<string, number> = {
  'Mythic': 1,
  'Legendary': 2,
  'Epic': 3,
  'Rare': 4,
  'Uncommon': 5,
  'Common': 6,
};

// Rarity colors based on the game's color scheme
const RARITY_COLORS: Record<string, { primary: string; border: string }> = {
  'Mythic': {
    primary: '#ff44ff',
    border: 'rgba(255, 68, 255, 0.65)',
  },
  'Legendary': {
    primary: '#ff8800',
    border: 'rgba(255, 136, 0, 0.65)',
  },
  'Epic': {
    primary: '#cc44ff',
    border: 'rgba(204, 68, 255, 0.65)',
  },
  'Rare': {
    primary: '#4488ff',
    border: 'rgba(68, 136, 255, 0.65)',
  },
  'Uncommon': {
    primary: '#44ff44',
    border: 'rgba(68, 255, 68, 0.65)',
  },
  'Common': {
    primary: '#888888',
    border: 'rgba(136, 136, 136, 0.65)',
  },
};

const getDefaultRarityColors = () => ({
  primary: '#b05bff',
  border: 'rgba(176, 91, 255, 0.65)',
});

// =============================================================================
// Related Items Utility
// =============================================================================

/**
 * Extract the base weapon name from an NFT.
 * For weapons: returns the weapon name (e.g., "Kestrel Legacy" -> "Kestrel")
 * For skins/attachments: extracts the weapon name from "X for the Y" pattern
 */
function extractWeaponName(nft: NFT): string | null {
  const name = nft.name;
  const itemClass = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';

  // If this is a weapon, extract the base weapon name
  if (itemClass === 'Weapon') {
    // Remove common suffixes like "Legacy", "MK2", etc. to get base name
    // But keep it as-is for matching purposes
    return name;
  }

  // For skins/attachments, look for "for the X" or "for X" pattern
  const forTheMatch = name.match(/\bfor\s+the\s+([A-Za-z0-9\s-]+?)(?:\s*$|\s*[-–])/i);
  if (forTheMatch) {
    return forTheMatch[1].trim();
  }

  const forMatch = name.match(/\bfor\s+([A-Za-z0-9]+)/i);
  if (forMatch) {
    return forMatch[1].trim();
  }

  return null;
}

/**
 * Check if an NFT is a weapon (base item that can have related skins/attachments)
 */
function isWeapon(nft: NFT): boolean {
  const itemClass = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';
  // Check for exact "Weapon" match or weapon subtypes
  return itemClass === 'Weapon' ||
         itemClass === 'Primary Weapon' ||
         itemClass === 'Secondary Weapon' ||
         itemClass === 'Melee Weapon';
}

/**
 * Find all related items (skins, attachments) for a weapon NFT
 * Returns NFTs that mention this weapon in their name
 */
function findRelatedItems(weaponNft: NFT, allNfts: NFT[]): NFT[] {
  if (!isWeapon(weaponNft)) return [];

  const weaponName = weaponNft.name;

  // Extract the core weapon name (without suffixes like Legacy, MK2, etc.)
  // e.g., "Kestrel Legacy" -> "Kestrel", "Thunder MK2" -> "Thunder"
  const coreWeaponName = weaponName
    .replace(/\s+(Legacy|MK\d+|Pro|Elite|Prime|Standard)\s*$/i, '')
    .trim();

  // Also extract just the first word for shorter weapon names
  // e.g., "Kestrel Legacy" -> "Kestrel"
  const firstWord = coreWeaponName.split(/\s+/)[0];

  const related: NFT[] = [];

  for (const nft of allNfts) {
    // Skip the weapon itself
    if (nft.tokenId === weaponNft.tokenId) continue;

    const itemClass = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';

    // Only include skins and attachments (also check for variations)
    const isSkin = itemClass === 'Weapon Skin' || itemClass.toLowerCase().includes('skin');
    const isAccessory = itemClass === 'Accessory' || itemClass.toLowerCase().includes('attachment') || itemClass.toLowerCase().includes('accessory');

    if (!isSkin && !isAccessory) continue;

    // Check if the item name mentions this weapon
    const nftName = nft.name.toLowerCase();
    const lowerWeaponName = coreWeaponName.toLowerCase();
    const lowerFullName = weaponName.toLowerCase();
    const lowerFirstWord = firstWord.toLowerCase();

    // Check for various patterns that indicate this item is for this weapon
    if (
      nftName.includes(`for the ${lowerWeaponName}`) ||
      nftName.includes(`for the ${lowerFullName}`) ||
      nftName.includes(`for the ${lowerFirstWord}`) ||
      nftName.includes(`for ${lowerWeaponName}`) ||
      nftName.includes(`for ${lowerFirstWord}`) ||
      // Also check if it ends with the weapon name (e.g., "Enhanced Compensator Kestrel")
      nftName.endsWith(lowerWeaponName) ||
      nftName.endsWith(lowerFullName) ||
      nftName.endsWith(lowerFirstWord) ||
      // Check if it contains the weapon name as a word
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

/**
 * Get rarity color for an NFT
 */
function getRarityColorForNft(nft: NFT): { primary: string; border: string } {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  return RARITY_COLORS[rarity] || getDefaultRarityColors();
}

interface ItemData {
  tokenId: string;
  mintNumber: string;
  rarity?: string;
  index: number;
  colors: { primary: string; border: string };
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: Date;
}

interface NFTDetailModalProps {
  nft: NFT | null;
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  /** All NFTs in the wallet - used for finding related items (skins/attachments) */
  allNfts?: NFT[];
}

// Price source tracking - how we determined the purchase price
type PriceSource = 'transfers' | 'localStorage' | 'onchain' | 'none';

// Marketplace matching method
type MarketplaceMatchMethod = 'txHash' | 'timeWindow' | 'none';

// Acquisition type from transfer analysis
type AcquisitionType = 'MINT' | 'TRANSFER' | 'PURCHASE' | 'UNKNOWN';

// Get human-readable label for acquisition venue
// Note: Labels do NOT include "Purchased" prefix - purchase context is implied by the Cost line
function getVenueDisplayLabel(venue: AcquisitionVenue | undefined, hasDecodeCost?: boolean): string {
  switch (venue) {
    case 'decode':
      // In-game hex decode (mint from zero address)
      return 'Decoded (in-game)';
    case 'opensea':
      return 'OpenSea';
    case 'otg_marketplace':
      return 'OTG Marketplace';
    case 'in_game_marketplace':
      return 'In-Game Marketplace';
    case 'decoder':
      // Legacy decoder contract
      return 'Decoded (in-game)';
    case 'mint':
      // Legacy mint venue - kept for backwards compatibility
      return hasDecodeCost ? 'Decoded (in-game)' : 'Minted';
    case 'transfer':
      return 'Transfer';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

// Structured acquisition data - separates transfer-derived vs price-derived fields
interface AcquisitionData {
  // Source tracking
  priceSource: PriceSource;           // How we determined the price (onchain/transfers/localStorage/none)
  acquisitionVenue?: AcquisitionVenue; // Where the acquisition happened (opensea/otg_marketplace/decoder/mint/transfer/unknown)

  // Transfer-derived fields (from blockchain)
  acquiredAt?: Date;           // Block timestamp of first incoming transfer
  fromAddress?: string;        // Address that sent the NFT
  acquisitionTxHash?: string;  // Transaction hash of acquisition
  acquisitionType?: AcquisitionType; // MINT, TRANSFER, PURCHASE, or UNKNOWN

  // Marketplace purchase price fields (OpenSea, OTG Marketplace, etc.)
  purchasePriceGun?: number;   // Price paid in GUN for marketplace purchases
  purchasePriceUsd?: number;   // Calculated from purchasePriceGun at historical rate
  purchaseDate?: Date;         // Same as acquiredAt when price is known
  marketplaceTxHash?: string;  // TX hash of the purchase transaction

  // Decode/Mint cost fields (in-game decode costs, NOT marketplace purchases)
  decodeCostGun?: number;      // Cost paid to decode/mint (in-game currency)
  decodeCostUsd?: number;      // Calculated from decodeCostGun at historical rate

  // Legacy compatibility
  transferredFrom?: string;    // Alias for fromAddress when acquisitionType=TRANSFER
  isFreeTransfer?: boolean;    // True if TRANSFER with no price (not applicable to paid decodes)
}

export default function NFTDetailModal({ nft, isOpen, onClose, walletAddress, allNfts = [] }: NFTDetailModalProps) {
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [itemPurchaseData, setItemPurchaseData] = useState<Record<string, AcquisitionData>>({});
  const [listingsData, setListingsData] = useState<{
    lowest?: number;
    highest?: number;
    average?: number;
  } | null>(null);
  const [currentGunPrice, setCurrentGunPrice] = useState<number | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [relatedItemsExpanded, setRelatedItemsExpanded] = useState(false);

  // Debug mode: enabled via ?debugNft=1 URL parameter
  // No-cache mode: enabled via ?noCache=1 - bypasses all cache reads for fresh data
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debugNft') === '1';
  const noCacheMode = searchParams.get('noCache') === '1';
  const [debugExpanded, setDebugExpanded] = useState(false);

  // Raw holding acquisition result from RPC (always fetched fresh for debug)
  const [holdingAcquisitionRaw, setHoldingAcquisitionRaw] = useState<NFTHoldingAcquisition | null>(null);

  // Debug instrumentation state
  const [debugData, setDebugData] = useState<{
    tokenKey: string;
    cacheKey: string;
    cacheHit: boolean;
    cacheReason: string;
    transferEventCount: number;
    marketplaceMatches: number;
    gunPriceTimestamp: Date | null;
    priceSource: PriceSource;
    // Transfer query debug info (legacy - now uses acquisition debug)
    transferQueryInfo?: {
      fromBlock?: number;
      toBlock?: number;
      chunksQueried?: number;
      totalLogsFound?: number;
      currentOwner?: string | null;
      // New acquisition debug fields
      txTo?: string;
      selector?: string;
      gunIsNative?: boolean;
      matchedRule?: string;
    };
    // Transfer-derived debug fields
    derivedFromTransferTxHash?: string;
    derivedAcquiredAt?: string; // ISO string
    derivedAcquisitionType?: AcquisitionType;
    // Acquisition venue/tx from getNFTHoldingAcquisition
    acquisitionVenue?: string;
    acquisitionTxHash?: string;
    // Marketplace matching debug fields - enhanced
    marketplaceConfigured: boolean;
    serverProxyUsed: boolean;
    marketplaceTestConnection?: {
      success: boolean;
      statusCode?: number;
      itemCount?: number;
      error?: string;
      responseKeys?: string[];
      serverProxyUsed?: boolean;
    };
    viewerWallet: string;
    currentOwner: string;
    tokenPurchasesCount: number;
    walletPurchasesCount_viewerWallet: number;
    walletPurchasesCount_currentOwner: number;
    walletPurchasesTimeRange_viewerWallet?: { min: string; max: string };
    walletPurchasesTimeRange_currentOwner?: { min: string; max: string };
    marketplaceEndpointBaseUrl: string;
    marketplaceNetwork: string;
    matchWindowMinutes: number;
    marketplaceMatchedTxHash?: string;
    marketplaceMatchedOrderId?: string;
    marketplaceMatchedPurchaseId?: string;
    marketplaceMatchedTimestamp?: string;
    marketplaceCandidatesCount: number;
    marketplaceCandidateTimes?: { min: string; max: string };
    marketplaceMatchMethod: MarketplaceMatchMethod;
    // OpenSea error (if any)
    openSeaError?: string;
    // No-cache mode status
    noCacheEnabled: boolean;
    cacheBypassed: boolean;
    // Background refresh tracking
    cacheRenderedFirst: boolean;
    backgroundRefreshAttempted: boolean;
    backgroundRefreshUpdated: boolean;
  }>({
    tokenKey: '',
    cacheKey: '',
    cacheHit: false,
    cacheReason: '',
    transferEventCount: 0,
    marketplaceMatches: 0,
    gunPriceTimestamp: null,
    priceSource: 'none',
    // Enhanced marketplace debug defaults
    marketplaceConfigured: false,
    serverProxyUsed: true,
    viewerWallet: '',
    currentOwner: '',
    tokenPurchasesCount: 0,
    walletPurchasesCount_viewerWallet: 0,
    walletPurchasesCount_currentOwner: 0,
    marketplaceEndpointBaseUrl: '',
    marketplaceNetwork: '',
    matchWindowMinutes: 10,
    marketplaceCandidatesCount: 0,
    marketplaceMatchMethod: 'none',
    noCacheEnabled: false,
    cacheBypassed: false,
    cacheRenderedFirst: false,
    backgroundRefreshAttempted: false,
    backgroundRefreshUpdated: false,
  });

  // Reset state when modal opens (component remounts via key prop when NFT changes)
  useEffect(() => {
    if (isOpen) {
      setActiveItemIndex(0);
      setItemPurchaseData({});
      setListingsData(null);
      setCurrentGunPrice(null);
      setDetailsExpanded(false);
      setHoldingAcquisitionRaw(null); // Reset raw acquisition for fresh fetch
      // Note: debugExpanded is NOT reset here - user preference persists during session
      setDebugData({
        tokenKey: '',
        cacheKey: '',
        cacheHit: false,
        cacheReason: '',
        transferEventCount: 0,
        marketplaceMatches: 0,
        gunPriceTimestamp: null,
        priceSource: 'none',
        // Enhanced marketplace debug defaults
        marketplaceConfigured: false,
        serverProxyUsed: true,
        viewerWallet: '',
        currentOwner: '',
        tokenPurchasesCount: 0,
        walletPurchasesCount_viewerWallet: 0,
        walletPurchasesCount_currentOwner: 0,
        marketplaceEndpointBaseUrl: '',
        marketplaceNetwork: '',
        matchWindowMinutes: 10,
        marketplaceCandidatesCount: 0,
        marketplaceMatchMethod: 'none',
        noCacheEnabled: noCacheMode,
        cacheBypassed: false,
        cacheRenderedFirst: false,
        backgroundRefreshAttempted: false,
        backgroundRefreshUpdated: false,
      });

      // Fetch current GUN price
      const fetchGunPrice = async () => {
        try {
          const coinGeckoService = new CoinGeckoService();
          const priceData = await coinGeckoService.getGunTokenPrice();
          if (priceData?.gunTokenPrice) {
            setCurrentGunPrice(priceData.gunTokenPrice);
            const timestamp = priceData.timestamp;
            setDebugData(prev => ({ ...prev, gunPriceTimestamp: timestamp }));
            if (debugMode) {
              console.debug('[NFTDetailModal] GUN/USD rate fetched:', {
                rate: priceData.gunTokenPrice,
                timestamp: timestamp,
                source: priceData.source,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching GUN price:', error);
        }
      };
      fetchGunPrice();
    }
  }, [isOpen, debugMode, noCacheMode]);

  // Build sorted list of items (by rarity desc, then mint number asc)
  const sortedItems: ItemData[] = useMemo(() => {
    if (!nft) {
      return [];
    }

    const getRarity = () => nft.traits?.['RARITY'] || nft.traits?.['Rarity'];
    const rarity = getRarity();
    const colors = RARITY_COLORS[rarity || ''] || getDefaultRarityColors();

    if (!nft.tokenIds || nft.tokenIds.length <= 1) {
      return [{
        tokenId: nft.tokenId,
        mintNumber: nft.mintNumber || nft.tokenId,
        rarity,
        index: 0,
        colors,
      }];
    }

    // Create items array with their data
    const items: ItemData[] = nft.tokenIds.map((tokenId, index) => ({
      tokenId,
      mintNumber: nft.mintNumbers?.[index] || tokenId,
      rarity,
      index,
      colors,
    }));

    // Sort by rarity (highest first), then by mint number (lowest first)
    return items.sort((a, b) => {
      const rarityA = RARITY_ORDER[a.rarity || ''] || 999;
      const rarityB = RARITY_ORDER[b.rarity || ''] || 999;
      if (rarityA !== rarityB) {
        return rarityA - rarityB;
      }
      const mintA = parseInt(a.mintNumber) || 0;
      const mintB = parseInt(b.mintNumber) || 0;
      return mintA - mintB;
    });
  }, [nft]);

  // Get currently active item
  const activeItem = sortedItems[activeItemIndex] || sortedItems[0];

  // Load purchase data for the active item
  useEffect(() => {
    if (!isOpen || !nft || !walletAddress || !activeItem) {
      return;
    }

    const tokenId = activeItem.tokenId;
    const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '';

    // Build token key and cache key using new versioned cache system
    const tokenKey = buildTokenKey(nft.chain, nftContractAddress, tokenId);
    const fullCacheKey = buildNftDetailCacheKey(walletAddress, tokenKey);

    // Update debug keys
    setDebugData(prev => ({
      ...prev,
      tokenKey,
      cacheKey: fullCacheKey,
    }));

    // In noCache mode, log that we're bypassing caches
    if (noCacheMode && debugMode) {
      console.debug('[NFTDetailModal] noCache mode enabled - bypassing all cache reads');
    }

    // NOTE: We intentionally skip NFT prop data - it's unreliable and may contain stale values.
    // Always verify against actual transfer history or localStorage cache.

    // Check localStorage cache using new versioned cache system
    // In noCache mode, skip localStorage entirely
    const cacheResult = noCacheMode
      ? { hit: false, cacheKey: fullCacheKey, reason: 'noCache_mode' as const }
      : getCachedNFTDetail(walletAddress, tokenKey);

    // Track whether we rendered from cache first (for background refresh)
    let cacheRenderedFirst = false;

    // Check component state first (fast path for tab switching)
    // In noCache mode, skip component state to force fresh fetch
    // BUT: Even with cache hit, we ALWAYS run background refresh unless noCache mode
    if (itemPurchaseData[tokenId] && !noCacheMode) {
      if (debugMode) {
        console.debug('[NFTDetailModal] Component state exists for token (will background refresh):', {
          tokenId,
          tokenKey,
          priceSource: itemPurchaseData[tokenId].priceSource,
        });
      }
      // Mark that we have cached data rendered
      cacheRenderedFirst = true;
      setDebugData(prev => ({
        ...prev,
        cacheHit: true,
        cacheReason: 'component_state',
        priceSource: itemPurchaseData[tokenId].priceSource,
        cacheRenderedFirst: true,
      }));
      // NOTE: We do NOT return early - we continue to background refresh
    } else if (cacheResult.hit && 'value' in cacheResult && cacheResult.value && !noCacheMode) {
      // Determine acquisition source from cached data
      const cachedValue = cacheResult.value;
      const hasTransferData = cachedValue.purchasePriceGun !== undefined ||
        cachedValue.purchaseDate !== undefined ||
        cachedValue.isFreeTransfer === true;
      const cachedPriceSource: PriceSource = hasTransferData ? 'localStorage' : 'none';

      if (debugMode) {
        console.debug('[NFTDetailModal] localStorage cache HIT (will background refresh):', {
          tokenId,
          tokenKey,
          cacheKey: cacheResult.cacheKey,
          value: cachedValue,
          priceSource: cachedPriceSource,
        });
      }

      // Restore data from cache IMMEDIATELY for fast UI
      const cachedData = cachedValue;
      const restoredAcquisition: AcquisitionData = {
        priceSource: cachedPriceSource,
        acquisitionVenue: cachedData.acquisitionVenue,

        // We don't have transfer-derived fields in cache, they'd need re-fetch
        acquiredAt: undefined,
        fromAddress: undefined,
        acquisitionType: undefined,
        acquisitionTxHash: cachedData.acquisitionTxHash,

        // Price fields from cache
        purchasePriceGun: cachedData.purchasePriceGun,
        purchasePriceUsd: cachedData.purchasePriceUsd,
        purchaseDate: cachedData.purchaseDate ? new Date(cachedData.purchaseDate) : undefined,
        marketplaceTxHash: cachedData.acquisitionTxHash,

        // Legacy
        transferredFrom: cachedData.transferredFrom,
        isFreeTransfer: cachedData.isFreeTransfer,
      };

      setItemPurchaseData(prev => ({
        ...prev,
        [tokenId]: restoredAcquisition,
      }));

      cacheRenderedFirst = true;
      setDebugData(prev => ({
        ...prev,
        cacheHit: true,
        cacheReason: 'localStorage',
        priceSource: cachedPriceSource,
        cacheRenderedFirst: true,
      }));
      // NOTE: We do NOT return early - we continue to background refresh
    } else {
      // Cache miss (or noCache mode) - need to fetch fresh data
      if (debugMode) {
        console.debug('[NFTDetailModal] localStorage cache MISS:', {
          tokenId,
          tokenKey,
          cacheKey: cacheResult.cacheKey,
          reason: cacheResult.reason,
          noCacheMode,
        });
      }

      // Update debug data to reflect cache bypass in noCache mode
      if (noCacheMode) {
        setDebugData(prev => ({
          ...prev,
          cacheBypassed: true,
          cacheReason: 'noCache_mode',
        }));
      }
    }

    // =========================================================================
    // ALWAYS run background refresh (unless we already fetched fresh data)
    // This ensures transfer events are always fetched from blockchain
    // =========================================================================
    const loadItemDetails = async (isBackgroundRefresh: boolean) => {
      // Only show loading spinner if this is NOT a background refresh
      if (!isBackgroundRefresh) {
        setLoadingDetails(true);
      }

      // Mark background refresh as attempted
      if (isBackgroundRefresh) {
        setDebugData(prev => ({
          ...prev,
          backgroundRefreshAttempted: true,
        }));
      } else {
        setDebugData(prev => ({
          ...prev,
          cacheHit: false,
          cacheReason: cacheResult.reason || 'fetching',
        }));
      }

      if (debugMode) {
        console.debug('[NFTDetailModal] Fetching fresh data for token:', {
          tokenId,
          tokenKey,
        });
      }

      try {
        const avalancheService = new AvalancheService();
        const openSeaService = new OpenSeaService();
        const coinGeckoService = new CoinGeckoService();

        if (!nftContractAddress) {
          return;
        }

        // =====================================================================
        // STEP 1: Load acquisition details (blockchain-derived data)
        // Always fetch fresh from RPC - this is critical for debug panel accuracy
        // =====================================================================
        const acquisition = await avalancheService.getNFTHoldingAcquisition(nftContractAddress, tokenId, walletAddress);

        // Store raw acquisition result for debug panel (always fresh)
        setHoldingAcquisitionRaw(acquisition);

        if (debugMode) {
          console.debug('[NFTDetailModal] Acquisition result:', {
            tokenId,
            acquisition,
          });
        }

        // Extract acquisition-derived fields
        const hasAcquisitionData = acquisition !== null && acquisition.owned;
        const acquiredAt = acquisition?.acquiredAtIso ? new Date(acquisition.acquiredAtIso) : undefined;
        const fromAddress = acquisition?.fromAddress;
        const acquisitionVenue = acquisition?.venue;
        const acquisitionTxHash = acquisition?.txHash;
        const costGunFromChain = acquisition?.costGun ?? 0;

        // Backward compatibility aliases
        const hasTransferData = hasAcquisitionData;
        const totalLogsFound = hasAcquisitionData ? 1 : 0;
        // For currentOwner lookup in marketplace matching (will be determined from acquisition)
        const currentOwnerFromAcquisition = acquisition?.owned ? walletAddress : null;

        // Map venue to acquisition type for backward compatibility
        let acquisitionType: AcquisitionType;
        if (acquisition?.isMint || acquisitionVenue === 'mint') {
          acquisitionType = 'MINT';
        } else if (hasAcquisitionData) {
          acquisitionType = 'TRANSFER';
        } else {
          acquisitionType = 'UNKNOWN';
        }

        // Update debug transfer event count and query info
        setDebugData(prev => ({
          ...prev,
          transferEventCount: totalLogsFound,
          derivedAcquiredAt: acquiredAt?.toISOString(),
          derivedAcquisitionType: acquisitionType,
          acquisitionVenue,
          acquisitionTxHash: acquisitionTxHash ?? undefined,
        }));

        // =====================================================================
        // STEP 2: Load marketplace listings (price data source)
        // =====================================================================
        let marketplaceMatchCount = 0;

        if (!listingsData) {
          try {
            const listings = await openSeaService.getNFTListings(nftContractAddress, tokenId, 'avalanche');
            const lowest = listings.lowest ?? undefined;
            const highest = listings.highest ?? undefined;
            const average = lowest !== undefined && highest !== undefined
              ? (lowest + highest) / 2
              : lowest ?? highest;

            marketplaceMatchCount = (lowest !== undefined ? 1 : 0) + (highest !== undefined ? 1 : 0);

            if (debugMode) {
              console.debug('[NFTDetailModal] Marketplace listings:', {
                tokenId,
                lowest,
                highest,
                average,
                matchCount: marketplaceMatchCount,
                error: listings.error,
              });
            }

            // Update debug marketplace matches and any error
            setDebugData(prev => ({
              ...prev,
              marketplaceMatches: marketplaceMatchCount,
              openSeaError: listings.error,
            }));

            setListingsData({
              lowest,
              highest,
              average,
            });
          } catch (openSeaError) {
            // OpenSea failure is non-blocking
            const errorMsg = openSeaError instanceof Error ? openSeaError.message : 'Unknown error';
            console.warn('[NFTDetailModal] OpenSea fetch failed (non-blocking):', errorMsg);

            setDebugData(prev => ({
              ...prev,
              marketplaceMatches: 0,
              openSeaError: errorMsg,
            }));

            setListingsData({
              lowest: undefined,
              highest: undefined,
              average: undefined,
            });
          }
        }

        // =====================================================================
        // STEP 3: Marketplace purchase matching (DUAL RETRIEVAL STRATEGY)
        // Populate purchasePriceGun/purchaseDate ONLY when a marketplace match exists
        // =====================================================================

        let purchasePriceGun: number | undefined = undefined;
        let purchasePriceUsd: number | undefined = undefined;
        let purchaseDate: Date | undefined = undefined;
        let marketplaceTxHash: string | undefined = undefined;
        let marketplaceOrderId: string | undefined = undefined;
        let marketplacePurchaseId: string | undefined = undefined;
        let marketplaceMatchedTimestamp: string | undefined = undefined;
        let marketplaceMatchMethod: MarketplaceMatchMethod = 'none';
        let marketplaceCandidatesCount = 0;
        let marketplaceCandidateTimes: { min: string; max: string } | undefined = undefined;

        // Enhanced debug tracking
        let tokenPurchasesCount = 0;
        let walletPurchasesCount_viewerWallet = 0;
        let walletPurchasesCount_currentOwner = 0;
        let walletPurchasesTimeRange_viewerWallet: { min: string; max: string } | undefined = undefined;
        let walletPurchasesTimeRange_currentOwner: { min: string; max: string } | undefined = undefined;

        // Identity setup
        const viewerWalletLower = walletAddress.toLowerCase();
        const currentOwnerLower = currentOwnerFromAcquisition?.toLowerCase() || '';
        const TIME_WINDOW_MS = 10 * 60 * 1000; // 10 minutes (widened from 5)
        const MATCH_WINDOW_MINUTES = 10;

        // Only attempt marketplace matching if we have transfer data (acquisition timestamp)
        if (hasTransferData && acquiredAt) {
          try {
            const marketplaceService = new GameMarketplaceService();
            const endpointInfo = marketplaceService.getEndpointInfo();

            // Update endpoint info in debug
            setDebugData(prev => ({
              ...prev,
              viewerWallet: viewerWalletLower,
              currentOwner: currentOwnerLower,
              marketplaceEndpointBaseUrl: endpointInfo.baseUrl,
              marketplaceNetwork: endpointInfo.network,
              matchWindowMinutes: MATCH_WINDOW_MINUTES,
              marketplaceConfigured: endpointInfo.isConfigured,
              serverProxyUsed: endpointInfo.serverProxyUsed,
            }));

            // Check if marketplace is configured before making API calls
            if (!endpointInfo.isConfigured) {
              // Run testConnection for debug info (helps diagnose configuration issues)
              const testResult = await marketplaceService.testConnection();
              setDebugData(prev => ({
                ...prev,
                marketplaceTestConnection: testResult,
              }));

              if (debugMode) {
                console.debug('[NFTDetailModal] Marketplace not configured:', {
                  endpointInfo,
                  testResult,
                });
              }

              // Skip all marketplace retrieval - we'll show "Marketplace data unavailable" in UI
            } else {
              // =========================================================
              // DUAL RETRIEVAL STRATEGY
              // 1. Fetch by token
              // 2. Fetch by wallet (for both viewerWallet AND currentOwner)
              // 3. Merge and dedupe all results
              // =========================================================

              // Strategy A: Fetch purchases for this specific token
              const tokenPurchases = await marketplaceService.getPurchasesForToken(tokenKey);
            tokenPurchasesCount = tokenPurchases.length;

            if (debugMode) {
              console.debug('[NFTDetailModal] Token purchases:', {
                tokenKey,
                count: tokenPurchasesCount,
                purchases: tokenPurchases,
              });
            }

            // Strategy B: Fetch purchases for viewerWallet (user's wallet)
            let viewerWalletPurchases: MarketplacePurchase[] = [];
            if (viewerWalletLower) {
              viewerWalletPurchases = await marketplaceService.getPurchasesForWallet(viewerWalletLower, {
                // Wider time range to catch the purchase
                fromDate: new Date(acquiredAt.getTime() - 24 * 60 * 60 * 1000), // 24h before
                toDate: new Date(acquiredAt.getTime() + 24 * 60 * 60 * 1000),   // 24h after
                limit: 100,
              });
              walletPurchasesCount_viewerWallet = viewerWalletPurchases.length;

              if (viewerWalletPurchases.length > 0) {
                const sorted = [...viewerWalletPurchases].sort(
                  (a, b) => new Date(a.purchaseDateIso).getTime() - new Date(b.purchaseDateIso).getTime()
                );
                walletPurchasesTimeRange_viewerWallet = {
                  min: sorted[0].purchaseDateIso,
                  max: sorted[sorted.length - 1].purchaseDateIso,
                };
              }

              if (debugMode) {
                console.debug('[NFTDetailModal] Viewer wallet purchases:', {
                  viewerWallet: viewerWalletLower,
                  count: walletPurchasesCount_viewerWallet,
                  timeRange: walletPurchasesTimeRange_viewerWallet,
                });
              }
            }

            // Strategy C: Fetch purchases for currentOwner (if different from viewerWallet)
            // Important for custodial wallets where currentOwner != viewerWallet
            let currentOwnerPurchases: MarketplacePurchase[] = [];
            if (currentOwnerLower && currentOwnerLower !== viewerWalletLower) {
              currentOwnerPurchases = await marketplaceService.getPurchasesForWallet(currentOwnerLower, {
                fromDate: new Date(acquiredAt.getTime() - 24 * 60 * 60 * 1000),
                toDate: new Date(acquiredAt.getTime() + 24 * 60 * 60 * 1000),
                limit: 100,
              });
              walletPurchasesCount_currentOwner = currentOwnerPurchases.length;

              if (currentOwnerPurchases.length > 0) {
                const sorted = [...currentOwnerPurchases].sort(
                  (a, b) => new Date(a.purchaseDateIso).getTime() - new Date(b.purchaseDateIso).getTime()
                );
                walletPurchasesTimeRange_currentOwner = {
                  min: sorted[0].purchaseDateIso,
                  max: sorted[sorted.length - 1].purchaseDateIso,
                };
              }

              if (debugMode) {
                console.debug('[NFTDetailModal] Current owner purchases:', {
                  currentOwner: currentOwnerLower,
                  count: walletPurchasesCount_currentOwner,
                  timeRange: walletPurchasesTimeRange_currentOwner,
                });
              }
            }

            // =========================================================
            // MERGE AND DEDUPE all purchases
            // Filter wallet purchases to only those matching this tokenKey
            // =========================================================
            const viewerWalletMatchingToken = viewerWalletPurchases.filter(
              p => p.tokenKey.toLowerCase() === tokenKey.toLowerCase()
            );
            const currentOwnerMatchingToken = currentOwnerPurchases.filter(
              p => p.tokenKey.toLowerCase() === tokenKey.toLowerCase()
            );

            // Combine all sources
            const allPurchases: MarketplacePurchase[] = [
              ...tokenPurchases,
              ...viewerWalletMatchingToken,
              ...currentOwnerMatchingToken,
            ];

            // Dedupe by purchaseId, txHash, or (tokenKey + timestamp)
            const seen = new Set<string>();
            const dedupedPurchases = allPurchases.filter(p => {
              // Create unique keys for deduplication
              const keys = [
                p.purchaseId,
                p.txHash,
                p.orderId,
                `${p.tokenKey}:${new Date(p.purchaseDateIso).getTime()}:${p.priceGun}`,
              ].filter(Boolean);

              for (const key of keys) {
                if (key && seen.has(key)) {
                  return false;
                }
              }

              // Add all keys to seen set
              keys.forEach(key => key && seen.add(key));
              return true;
            });

            marketplaceCandidatesCount = dedupedPurchases.length;

            if (debugMode) {
              console.debug('[NFTDetailModal] Merged marketplace candidates:', {
                tokenKey,
                tokenPurchasesCount,
                viewerWalletMatchingTokenCount: viewerWalletMatchingToken.length,
                currentOwnerMatchingTokenCount: currentOwnerMatchingToken.length,
                totalBeforeDedupe: allPurchases.length,
                afterDedupe: dedupedPurchases.length,
                acquiredAt: acquiredAt.toISOString(),
              });
            }

            if (dedupedPurchases.length > 0) {
              // Calculate candidate time range for debug
              const sortedByDate = [...dedupedPurchases].sort(
                (a, b) => new Date(a.purchaseDateIso).getTime() - new Date(b.purchaseDateIso).getTime()
              );
              marketplaceCandidateTimes = {
                min: sortedByDate[0].purchaseDateIso,
                max: sortedByDate[sortedByDate.length - 1].purchaseDateIso,
              };
            }

            // =========================================================
            // MATCHING ALGORITHM
            // Priority 1: Exact txHash match
            // Priority 2: Closest timestamp within ±10 minutes + identity tiebreaker
            // =========================================================
            let matchedPurchase: MarketplacePurchase | null = null;

            // Priority 1: Exact txHash match (if we have acquisition txHash)
            // Note: We'd need to pass txHash from transfer events for this
            // For now, this is a placeholder for future enhancement

            // Priority 2: Time-window matching with identity tiebreaker
            if (!matchedPurchase && dedupedPurchases.length > 0) {
              // Filter to purchases within ±10 minutes of acquisition
              const candidatesInWindow = dedupedPurchases.filter(p => {
                const timeDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                return timeDiff <= TIME_WINDOW_MS;
              });

              if (debugMode) {
                console.debug('[NFTDetailModal] Candidates in time window:', {
                  windowMinutes: MATCH_WINDOW_MINUTES,
                  acquiredAt: acquiredAt.toISOString(),
                  candidatesInWindow: candidatesInWindow.length,
                  candidates: candidatesInWindow.map(c => ({
                    purchaseId: c.purchaseId,
                    purchaseDate: c.purchaseDateIso,
                    timeDiffMs: Math.abs(new Date(c.purchaseDateIso).getTime() - acquiredAt.getTime()),
                    buyer: c.buyerAddress,
                    priceGun: c.priceGun,
                  })),
                });
              }

              if (candidatesInWindow.length === 1) {
                // Single candidate - use it
                matchedPurchase = candidatesInWindow[0];
                marketplaceMatchMethod = 'timeWindow';
              } else if (candidatesInWindow.length > 1) {
                // Multiple candidates - prefer where buyer matches viewerWallet or currentOwner
                const identityMatches = candidatesInWindow.filter(p => {
                  const buyerLower = p.buyerAddress.toLowerCase();
                  return buyerLower === viewerWalletLower || buyerLower === currentOwnerLower;
                });

                if (identityMatches.length >= 1) {
                  // Take closest to acquisition time among identity matches
                  matchedPurchase = identityMatches.reduce((closest, p) => {
                    const closestDiff = Math.abs(new Date(closest.purchaseDateIso).getTime() - acquiredAt.getTime());
                    const pDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                    return pDiff < closestDiff ? p : closest;
                  });
                  marketplaceMatchMethod = 'timeWindow';
                } else {
                  // No identity match - take closest by time
                  matchedPurchase = candidatesInWindow.reduce((closest, p) => {
                    const closestDiff = Math.abs(new Date(closest.purchaseDateIso).getTime() - acquiredAt.getTime());
                    const pDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                    return pDiff < closestDiff ? p : closest;
                  });
                  marketplaceMatchMethod = 'timeWindow';
                }
              }
            }

            // If matched, populate price fields
            if (matchedPurchase) {
              purchasePriceGun = matchedPurchase.priceGun;
              purchaseDate = matchedPurchase.purchaseDateIso ? new Date(matchedPurchase.purchaseDateIso) : acquiredAt; // Prefer marketplace timestamp, fallback to blockchain
              marketplaceTxHash = matchedPurchase.txHash;
              marketplaceOrderId = matchedPurchase.orderId || matchedPurchase.purchaseId;
              marketplacePurchaseId = matchedPurchase.purchaseId;
              marketplaceMatchedTimestamp = matchedPurchase.purchaseDateIso;

              // Calculate USD value from historical GUN price
              if (purchasePriceGun && purchaseDate) {
                try {
                  const historicalPrice = await coinGeckoService.getHistoricalGunPrice(purchaseDate);
                  if (historicalPrice) {
                    purchasePriceUsd = purchasePriceGun * historicalPrice;
                  }
                } catch (priceError) {
                  console.warn('[NFTDetailModal] Failed to get historical GUN price:', priceError);
                }
              }

              if (debugMode) {
                console.debug('[NFTDetailModal] Marketplace match found:', {
                  tokenKey,
                  matchMethod: marketplaceMatchMethod,
                  matchedPurchase,
                  purchasePriceGun,
                  purchasePriceUsd,
                });
              }
            }
            } // end else (marketplace configured)
          } catch (marketplaceError) {
            console.warn('[NFTDetailModal] Marketplace matching failed (non-blocking):', marketplaceError);
          }
        }

        // Update debug data with marketplace matching results
        setDebugData(prev => ({
          ...prev,
          tokenPurchasesCount,
          walletPurchasesCount_viewerWallet,
          walletPurchasesCount_currentOwner,
          walletPurchasesTimeRange_viewerWallet,
          walletPurchasesTimeRange_currentOwner,
          marketplaceCandidatesCount,
          marketplaceCandidateTimes,
          marketplaceMatchMethod,
          marketplaceMatchedTxHash: marketplaceTxHash,
          marketplaceMatchedOrderId: marketplaceOrderId,
          marketplaceMatchedPurchaseId: marketplacePurchaseId,
          marketplaceMatchedTimestamp,
        }));

        // =====================================================================
        // STEP 4: Determine acquisition source and build final data
        // Explicitly venue-driven mapping from holding acquisition (RPC)
        // =====================================================================

        // Legacy marketplace service match (for backwards compatibility)
        const hasMarketplaceServiceMatch = purchasePriceGun !== undefined;

        // Determine price source and acquisition type based on venue
        let derivedPriceSource: PriceSource;
        let finalPurchasePriceGun: number | undefined;
        let finalPurchasePriceUsd: number | undefined;
        let finalDecodeCostGun: number | undefined;
        let finalDecodeCostUsd: number | undefined;
        let finalPurchaseDate: Date | undefined;
        let finalMarketplaceTxHash: string | undefined;
        let finalIsFreeTransfer: boolean;
        let finalAcquisitionType: AcquisitionType;

        // =====================================================================
        // VENUE-DRIVEN MAPPING
        // A) mint/decoder -> MINT type, decodeCostGun, no purchasePriceGun
        // B) opensea -> PURCHASE type, purchasePriceGun, marketplaceTxHash
        // C) in_game_marketplace -> PURCHASE type, purchasePriceGun, marketplaceTxHash
        // D) otg_marketplace -> PURCHASE type, purchasePriceGun, marketplaceTxHash
        // E) transfer -> TRANSFER type, no cost fields
        // F) unknown/fallback -> use legacy logic or defaults
        // =====================================================================

        if (acquisitionVenue === 'decode' || acquisitionVenue === 'mint' || acquisitionVenue === 'decoder') {
          // A) DECODE/MINT: In-game hex decode (mint from zero address) - use decode cost fields, not purchase price
          // 'decode' = new venue for in-game hex decodes
          // 'mint' = legacy venue (kept for backwards compatibility)
          // 'decoder' = legacy decoder contract
          derivedPriceSource = costGunFromChain > 0 ? 'onchain' : 'transfers';
          finalAcquisitionType = 'MINT';
          // Decode cost (NOT purchase price)
          finalDecodeCostGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          // Purchase price is explicitly null for decodes - never show purchasePriceGun
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // Decodes have NO marketplace tx hash - only acquisitionTxHash
          finalMarketplaceTxHash = undefined;
          // For decodes, isFreeTransfer means no decode cost was paid
          finalIsFreeTransfer = (finalDecodeCostGun ?? 0) === 0;

          // Calculate USD from historical GUN price for decode cost
          if (finalDecodeCostGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalDecodeCostUsd = finalDecodeCostGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for decode cost:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] Decode (in-game) acquisition:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              decodeCostGun: finalDecodeCostGun,
              decodeCostUsd: finalDecodeCostUsd,
            });
          }
        } else if (acquisitionVenue === 'opensea') {
          // B) OPENSEA PURCHASE: Marketplace purchase with RPC cost
          derivedPriceSource = 'onchain';
          finalAcquisitionType = 'PURCHASE';
          finalPurchasePriceGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // OpenSea purchases have marketplace tx hash
          finalMarketplaceTxHash = acquisitionTxHash ?? undefined;
          finalIsFreeTransfer = false;

          // Calculate USD from historical GUN price
          if (finalPurchasePriceGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalPurchasePriceUsd = finalPurchasePriceGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for OpenSea purchase:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] OpenSea purchase:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              purchasePriceGun: finalPurchasePriceGun,
              purchasePriceUsd: finalPurchasePriceUsd,
            });
          }
        } else if (acquisitionVenue === 'in_game_marketplace') {
          // C) IN-GAME MARKETPLACE PURCHASE: Marketplace purchase with RPC cost
          derivedPriceSource = 'onchain';
          finalAcquisitionType = 'PURCHASE';
          finalPurchasePriceGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // In-game marketplace purchases have marketplace tx hash
          finalMarketplaceTxHash = acquisitionTxHash ?? undefined;
          finalIsFreeTransfer = false;

          // Calculate USD from historical GUN price
          if (finalPurchasePriceGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalPurchasePriceUsd = finalPurchasePriceGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for in-game marketplace purchase:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] In-game marketplace purchase:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              purchasePriceGun: finalPurchasePriceGun,
              purchasePriceUsd: finalPurchasePriceUsd,
            });
          }
        } else if (acquisitionVenue === 'otg_marketplace') {
          // D) OTG MARKETPLACE PURCHASE: Legacy marketplace with RPC cost
          derivedPriceSource = 'onchain';
          finalAcquisitionType = 'PURCHASE';
          finalPurchasePriceGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // OTG marketplace purchases have marketplace tx hash
          finalMarketplaceTxHash = acquisitionTxHash ?? undefined;
          finalIsFreeTransfer = false;

          // Calculate USD from historical GUN price
          if (finalPurchasePriceGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalPurchasePriceUsd = finalPurchasePriceGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for OTG marketplace purchase:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] OTG Marketplace purchase:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              purchasePriceGun: finalPurchasePriceGun,
              purchasePriceUsd: finalPurchasePriceUsd,
            });
          }
        } else if (acquisitionVenue === 'transfer') {
          // E) TRANSFER: No price data, no marketplace tx
          derivedPriceSource = 'transfers';
          finalAcquisitionType = 'TRANSFER';
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // Transfers have NO marketplace tx hash - only acquisitionTxHash
          finalMarketplaceTxHash = undefined;
          finalIsFreeTransfer = true;

          if (debugMode) {
            console.debug('[NFTDetailModal] Transfer acquisition:', {
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              fromAddress,
            });
          }
        } else if (hasMarketplaceServiceMatch) {
          // F1) Legacy: Marketplace service match - use marketplace data
          derivedPriceSource = 'onchain';
          finalAcquisitionType = acquisitionType;
          finalPurchasePriceGun = purchasePriceGun;
          finalPurchasePriceUsd = purchasePriceUsd;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = purchaseDate;
          finalMarketplaceTxHash = marketplaceTxHash;
          finalIsFreeTransfer = false;

          if (debugMode) {
            console.debug('[NFTDetailModal] Legacy marketplace service match:', {
              purchasePriceGun,
              purchasePriceUsd,
              marketplaceTxHash,
            });
          }
        } else if (hasTransferData) {
          // F2) Fallback: Has transfer data but unknown venue
          derivedPriceSource = 'transfers';
          finalAcquisitionType = acquisitionType;
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          finalMarketplaceTxHash = undefined;
          finalIsFreeTransfer = acquisitionType === 'TRANSFER';

          if (debugMode) {
            console.debug('[NFTDetailModal] Unknown venue with transfer data:', {
              venue: acquisitionVenue,
              acquisitionType,
              fromAddress,
            });
          }
        } else {
          // F3) No acquisition data
          derivedPriceSource = 'none';
          finalAcquisitionType = 'UNKNOWN';
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = undefined;
          finalMarketplaceTxHash = undefined;
          finalIsFreeTransfer = true;

          if (debugMode) {
            console.debug('[NFTDetailModal] No acquisition data');
          }
        }

        // Build fresh acquisition object - no merging with prior state
        const freshAcquisition: AcquisitionData = {
          priceSource: derivedPriceSource,
          acquisitionVenue: acquisitionVenue,

          // Transfer-derived fields
          acquiredAt: hasTransferData ? acquiredAt : undefined,
          fromAddress: hasTransferData ? fromAddress : undefined,
          acquisitionType: hasTransferData ? finalAcquisitionType : undefined,
          acquisitionTxHash: acquisitionTxHash ?? undefined,

          // Marketplace purchase price fields (OpenSea, OTG Marketplace, etc.)
          purchasePriceGun: finalPurchasePriceGun,
          purchasePriceUsd: finalPurchasePriceUsd,
          purchaseDate: finalPurchaseDate,
          marketplaceTxHash: finalMarketplaceTxHash,

          // Decode/Mint cost fields (in-game, NOT marketplace)
          decodeCostGun: finalDecodeCostGun,
          decodeCostUsd: finalDecodeCostUsd,

          // Legacy compatibility
          transferredFrom: (hasTransferData && finalAcquisitionType === 'TRANSFER') ? fromAddress : undefined,
          isFreeTransfer: finalIsFreeTransfer,
        };

        if (debugMode) {
          console.debug('[NFTDetailModal] Fresh acquisition object built:', {
            tokenId,
            tokenKey,
            hasTransferData,
            acquisitionVenue,
            finalAcquisitionType,
            hasMarketplaceServiceMatch,
            marketplaceCandidatesCount,
            marketplaceMatchMethod,
            freshAcquisition,
            isBackgroundRefresh,
          });
        }

        // Check if we need to update state (for background refresh, compare with existing)
        const existingData = itemPurchaseData[tokenId];
        const shouldUpdate = !isBackgroundRefresh || !existingData ||
          // Update if derived data differs from cached
          existingData.priceSource !== derivedPriceSource ||
          // Update if cached is missing critical fields that we now have
          (hasTransferData && !existingData.acquiredAt) ||
          (hasTransferData && !existingData.acquisitionType) ||
          // Update if transfer event count changed (new data available)
          totalLogsFound > 0;

        if (debugMode && isBackgroundRefresh) {
          console.debug('[NFTDetailModal] Background refresh comparison:', {
            tokenId,
            existingSource: existingData?.priceSource,
            derivedSource: derivedPriceSource,
            existingHasAcquiredAt: !!existingData?.acquiredAt,
            derivedHasAcquiredAt: hasTransferData,
            shouldUpdate,
          });
        }

        // Update debug with final price source and marketplace match info
        setDebugData(prev => ({
          ...prev,
          priceSource: derivedPriceSource,
          marketplaceMatchedTxHash: marketplaceTxHash,
          // Mark if background refresh caused an update
          backgroundRefreshUpdated: isBackgroundRefresh && shouldUpdate,
        }));

        if (shouldUpdate) {
          // Store FRESH data in component state - completely replace, no merging
          setItemPurchaseData(prev => ({
            ...prev,
            [tokenId]: freshAcquisition,
          }));

          // Persist to localStorage using new versioned cache system
          setCachedNFTDetail(walletAddress, tokenKey, {
            purchasePriceGun: freshAcquisition.purchasePriceGun,
            purchasePriceUsd: freshAcquisition.purchasePriceUsd,
            purchaseDate: freshAcquisition.purchaseDate?.toISOString(),
            transferredFrom: freshAcquisition.transferredFrom,
            isFreeTransfer: freshAcquisition.isFreeTransfer,
            acquisitionVenue: acquisitionVenue,
            acquisitionTxHash: acquisitionTxHash ?? undefined,
          });

          if (debugMode) {
            console.debug('[NFTDetailModal] Cached to localStorage:', {
              tokenKey,
              cacheKey: fullCacheKey,
              isBackgroundRefresh,
            });
          }
        } else if (debugMode && isBackgroundRefresh) {
          console.debug('[NFTDetailModal] Background refresh skipped update (no changes):', {
            tokenId,
            tokenKey,
          });
        }
      } catch (error) {
        console.error('Error loading NFT details:', error);
      } finally {
        // Only clear loading if this was NOT a background refresh
        if (!isBackgroundRefresh) {
          setLoadingDetails(false);
        }
      }
    };

    // Run loadItemDetails - pass whether this is a background refresh
    loadItemDetails(cacheRenderedFirst);
  }, [isOpen, nft, walletAddress, activeItem, listingsData, debugMode, noCacheMode]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Get current item's purchase data
  const currentPurchaseData = activeItem ? itemPurchaseData[activeItem.tokenId] : undefined;

  // Filter traits to exclude "None" values
  const filteredTraits = useMemo(() => {
    if (!nft?.traits) return {};
    return Object.fromEntries(
      Object.entries(nft.traits).filter(([, value]) =>
        value && value.toLowerCase() !== 'none'
      )
    );
  }, [nft?.traits]);

  // Find related items (skins/attachments) for weapons
  const relatedItems = useMemo(() => {
    if (!nft || allNfts.length === 0) return [];
    return findRelatedItems(nft, allNfts);
  }, [nft, allNfts]);

  // Check if this NFT is a weapon with related items
  const hasRelatedItems = nft && isWeapon(nft) && relatedItems.length > 0;

  // Early return after all hooks
  if (!nft) return null;

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format chain name for display
  const getChainDisplayName = (chain: string) => {
    if (chain === 'avalanche') return 'GUNZ';
    return chain.toUpperCase();
  };

  // Calculate market reference values
  const getMarketReference = () => {
    const currentValue = listingsData?.average ?? nft.floorPrice ?? nft.ceilingPrice;
    const purchasePrice = currentPurchaseData?.purchasePriceGun;

    if (currentValue === undefined) {
      return { hasMarketData: false };
    }

    const usdValue = currentGunPrice ? currentValue * currentGunPrice : undefined;
    let deltaPercent: number | undefined;

    if (purchasePrice && purchasePrice > 0 && !currentPurchaseData?.isFreeTransfer) {
      deltaPercent = ((currentValue - purchasePrice) / purchasePrice) * 100;
    }

    // Calculate data quality (spread-based only)
    const dataQuality = calculateDataQuality(listingsData?.lowest, listingsData?.highest);

    return {
      hasMarketData: true,
      gunValue: currentValue,
      usdValue,
      deltaPercent,
      dataQuality,
    };
  };

  const marketRef = getMarketReference();

  // Calculate position of a value on the range bar (0-100%)
  const getPositionOnRange = (value: number, low: number, high: number): number => {
    if (high === low) return 50;
    const position = ((value - low) / (high - low)) * 100;
    // Clamp between 2% and 98% to keep markers visible
    return Math.max(2, Math.min(98, position));
  };

  // Check if we have acquisition data to show
  const hasAcquisitionData = currentPurchaseData?.purchaseDate ||
    currentPurchaseData?.purchasePriceGun !== undefined ||
    currentPurchaseData?.isFreeTransfer;

  // Check if we have any details to show in accordion
  const hasDetails = hasAcquisitionData || Object.keys(filteredTraits).length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Modal Container - flex row to allow related items panel */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-stretch gap-0 pointer-events-auto">
          {/* Main Modal */}
          <div
            className={`relative w-full min-w-[360px] max-w-[440px] max-h-[85vh] bg-[#0d0d0d] rounded-2xl overflow-hidden flex flex-col transform transition-all duration-300 ${
              isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
            } ${hasRelatedItems && relatedItemsExpanded ? 'rounded-r-none' : ''}`}
            style={{
              boxShadow: hasRelatedItems && relatedItemsExpanded ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
          {/* ===== 1) ModalHeader ===== */}
          <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.12]">
            <h2 className="text-base font-semibold text-white">NFT Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition p-1.5 -mr-1.5 rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-premium overscroll-contain [-webkit-overflow-scrolling:touch] select-none">
            <div className="p-4 space-y-4">

              {/* ===== 2) IdentitySection ===== */}
              <div className="space-y-3">
                {/* NFT Image */}
                {sortedItems.length > 1 ? (
                  // Multiple items - grid view
                  <div className="grid grid-cols-2 gap-2">
                    {sortedItems.map((item, index) => {
                      const isActive = index === activeItemIndex;
                      return (
                        <button
                          key={item.tokenId}
                          onClick={() => setActiveItemIndex(index)}
                          className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                            isActive ? 'ring-1 opacity-100' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{
                            borderColor: isActive ? item.colors.border : 'transparent',
                            boxShadow: isActive ? `0 0 5px ${item.colors.border}` : 'none',
                          }}
                        >
                          {loadingDetails && isActive ? (
                            <div className="w-full h-full bg-[#1a1a1a] animate-pulse" />
                          ) : nft.image ? (
                            <Image
                              src={nft.image}
                              alt={`${nft.name} #${item.mintNumber}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] text-gray-600 text-xs">
                              No Image
                            </div>
                          )}
                          {/* Mint badge */}
                          <div
                            className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ backgroundColor: isActive ? item.colors.primary : 'rgba(0,0,0,0.7)' }}
                          >
                            #{item.mintNumber}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Single image - responsive: 180px on small screens, 220px otherwise
                  <div className="relative mx-auto max-h-[180px] sm:max-h-[220px]">
                    <div
                      className="relative aspect-square rounded-xl overflow-hidden mx-auto max-h-[180px] sm:max-h-[220px] max-w-[180px] sm:max-w-[220px]"
                      style={{
                        border: `1px solid ${activeItem?.colors.border}`,
                        boxShadow: `0 0 5px ${activeItem?.colors.border}`,
                      }}
                    >
                      {loadingDetails ? (
                        <div className="w-full h-full bg-[#1a1a1a] animate-pulse" />
                      ) : nft.image ? (
                        <Image
                          src={nft.image}
                          alt={nft.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] text-gray-600">
                          No Image
                        </div>
                      )}
                      {/* Mint badge */}
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: activeItem?.colors.primary }}
                      >
                        #{activeItem?.mintNumber}
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata below image */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">{nft.name}</h3>
                  {/* Subtitle: description if available, otherwise collection name */}
                  {(() => {
                    const descriptionText = (nft?.description ?? '').trim();
                    const subtitle = descriptionText.length > 0 ? descriptionText : nft.collection;
                    return (
                      <p className="text-sm text-white/60 leading-snug line-clamp-2 mt-0.5">
                        {subtitle}
                      </p>
                    );
                  })()}
                  <p className="text-[11px] text-white/60 mt-1">
                    Mint #{activeItem?.mintNumber} · Chain: {getChainDisplayName(nft.chain)}
                  </p>
                </div>
              </div>

              {/* ===== 3) ValueHeroSection ===== */}
              {walletAddress && (() => {
                // Compute position label
                const positionLabel = getPositionLabel({
                  acquisitionPriceGun: currentPurchaseData?.isFreeTransfer ? null : currentPurchaseData?.purchasePriceGun,
                  priceLow: listingsData?.lowest,
                  priceHigh: listingsData?.highest,
                });

                // Position pill styling based on state
                const getPositionPillStyles = () => {
                  switch (positionLabel.state) {
                    case 'UP':
                      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
                    case 'DOWN':
                      return 'bg-rose-500/10 text-rose-300 border border-rose-500/20';
                    case 'FLAT':
                      return 'bg-white/5 text-white/70 border border-white/10';
                    default:
                      return 'bg-transparent text-white/60 border border-white/10';
                  }
                };

                // Position pill text
                const getPositionPillText = () => {
                  switch (positionLabel.state) {
                    case 'UP': return 'Up';
                    case 'DOWN': return 'Down';
                    case 'FLAT': return 'Flat';
                    case 'NO_COST_BASIS': return 'No cost basis';
                    case 'NO_MARKET_REF': return 'No market reference';
                  }
                };

                // Position pill icon
                const getPositionIcon = () => {
                  switch (positionLabel.state) {
                    case 'UP':
                      return <span className="text-[10px]">↗</span>;
                    case 'DOWN':
                      return <span className="text-[10px]">↘</span>;
                    case 'FLAT':
                      return <span className="text-[10px]">–</span>;
                    default:
                      return <span className="text-[10px]">•</span>;
                  }
                };

                // Tooltip text
                const getTooltipText = () => {
                  if (positionLabel.state === 'NO_COST_BASIS') {
                    return "We can't compute your position without an acquisition cost.";
                  }
                  if (positionLabel.state === 'NO_MARKET_REF') {
                    return "No active listings found. Market reference may be unavailable in illiquid markets.";
                  }
                  let tooltip = "Based on observed listings (low–high). Illiquid markets can be noisy.";
                  if (positionLabel.dataQuality) {
                    tooltip += ` Data quality: ${positionLabel.dataQuality.charAt(0).toUpperCase() + positionLabel.dataQuality.slice(1)} (based on price spread).`;
                  }
                  return tooltip;
                };

                return (
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'rgba(0, 255, 200, 0.06)' }}
                  >
                    {/* Header row: Market Reference + Position pill */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/65">
                        Market Reference
                      </p>
                      {/* Position pill */}
                      <div
                        className={`h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-help ${getPositionPillStyles()}`}
                        title={getTooltipText()}
                      >
                        {getPositionIcon()}
                        {getPositionPillText()}
                      </div>
                    </div>

                    {loadingDetails ? (
                      // Loading skeleton
                      <div className="space-y-2">
                        <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                        <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
                      </div>
                    ) : marketRef.hasMarketData ? (
                      <div className="space-y-1">
                        <p className="text-[22px] font-semibold text-white">
                          ≈ ${marketRef.usdValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'} USD
                        </p>
                        <p className="text-[13px] font-medium text-white/85">
                          ≈ {marketRef.gunValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                        </p>
                        {/* Unrealized P/L percent line */}
                        {positionLabel.pnlPct !== null && (
                          <p className={`text-xs ${
                            positionLabel.state === 'UP' ? 'text-emerald-300' :
                            positionLabel.state === 'DOWN' ? 'text-rose-300' :
                            'text-white/70'
                          }`}>
                            Unrealized: {positionLabel.pnlPct >= 0 ? '+' : ''}{(positionLabel.pnlPct * 100).toFixed(1)}%
                          </p>
                        )}
                        {/* Data Quality - neutral styling, spread-based only */}
                        {positionLabel.dataQuality && (
                          <p
                            className="text-[11px] text-white/60 mt-2 inline-flex items-center gap-1 cursor-help"
                            title="Based on observed price range only. Listings are sparse and may not reflect actual sale prices."
                          >
                            Data Quality:{' '}
                            <span className="capitalize">{positionLabel.dataQuality}</span>
                            <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </p>
                        )}
                      </div>
                    ) : (
                      // No market data state
                      <div className="space-y-1">
                        <p className="text-base font-medium text-white/85">No active listings found</p>
                        <p className="text-xs text-white/50">
                          This is an illiquid market; reference values may be unavailable.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ===== 4) MarketReferenceSection (Observed Range Visualization) ===== */}
              {walletAddress && (
                <div className="py-4 border-t border-white/[0.12]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/65 mb-3">
                    Observed Market Range
                  </p>

                  {loadingDetails ? (
                    // Loading skeleton
                    <div className="space-y-3">
                      <div className="h-3 bg-white/10 rounded-full animate-pulse" />
                      <div className="flex justify-between">
                        <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
                        <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
                        <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
                      </div>
                    </div>
                  ) : listingsData?.lowest !== undefined && listingsData?.highest !== undefined ? (
                    <div className="space-y-3">
                      {/* Horizontal range bar (bullet chart pattern) */}
                      <div className="relative h-3">
                        {/* Base range bar - neutral gray */}
                        <div className="absolute inset-0 bg-white/10 rounded-full" />

                        {/* Average tick - subtle white vertical line */}
                        {(() => {
                          const avg = listingsData.average ?? (listingsData.lowest + listingsData.highest) / 2;
                          const avgPos = getPositionOnRange(avg, listingsData.lowest, listingsData.highest);
                          return (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                              style={{ left: `${avgPos}%`, transform: 'translateX(-50%)' }}
                            />
                          );
                        })()}

                        {/* Acquisition price marker - dot */}
                        {currentPurchaseData?.purchasePriceGun !== undefined && !currentPurchaseData.isFreeTransfer && (
                          (() => {
                            const acqPrice = currentPurchaseData.purchasePriceGun;
                            const avg = listingsData.average ?? (listingsData.lowest + listingsData.highest) / 2;
                            const acqPos = getPositionOnRange(acqPrice, listingsData.lowest, listingsData.highest);
                            const isGoodDeal = acqPrice < avg;
                            return (
                              <div
                                className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#0d0d0d]"
                                style={{
                                  left: `${acqPos}%`,
                                  transform: 'translate(-50%, -50%)',
                                  backgroundColor: isGoodDeal ? '#4ade80' : '#f87171',
                                }}
                                title={`Acquisition: ${acqPrice.toLocaleString()} GUN`}
                              />
                            );
                          })()
                        )}

                        {/* Current reference marker - emphasized diamond/dot */}
                        {marketRef.gunValue !== undefined && (
                          (() => {
                            const refPos = getPositionOnRange(marketRef.gunValue, listingsData.lowest, listingsData.highest);
                            return (
                              <div
                                className="absolute top-1/2 w-3 h-3 rotate-45 border-2 border-[#0d0d0d]"
                                style={{
                                  left: `${refPos}%`,
                                  transform: 'translate(-50%, -50%) rotate(45deg)',
                                  backgroundColor: '#00ffc8',
                                }}
                                title={`Current: ${marketRef.gunValue.toLocaleString()} GUN`}
                              />
                            );
                          })()
                        )}
                      </div>

                      {/* Labels */}
                      <div className="flex justify-between text-xs">
                        <div className="text-left">
                          <p className="text-white/40">Low</p>
                          <p className="font-medium text-white/70">
                            {listingsData.lowest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40">Avg</p>
                          <p className="font-medium text-white/70">
                            {(listingsData.average ?? (listingsData.lowest + listingsData.highest) / 2).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/40">High</p>
                          <p className="font-medium text-white/70">
                            {listingsData.highest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>

                      {/* Helper text */}
                      <p className="text-[10px] text-white/40 text-center">
                        Based on observed listings
                      </p>
                    </div>
                  ) : (
                    // Missing data state
                    <p className="text-xs text-white/50 text-center py-2">
                      Not enough market data to display range
                    </p>
                  )}
                </div>
              )}

              {/* ===== 5) DetailsAccordion ===== */}
              {hasDetails && (
                <div className="border-t border-white/[0.12] pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDetailsExpanded(v => !v);
                    }}
                    className="w-full flex items-center justify-between py-2 text-xs text-white/50 hover:text-white/70 transition"
                  >
                    <span>{detailsExpanded ? 'Hide details' : 'View details'}</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {detailsExpanded && (
                    <div className="pt-3 pb-1">
                      {/* Two-column card layout: Acquisition + Traits */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* ===== Acquisition Card ===== */}
                        {hasAcquisitionData && (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-full flex flex-col">
                            {/* Card title */}
                            <h4 className="text-sm font-semibold tracking-wide text-white/80 mb-2">
                              Acquisition
                            </h4>
                            <div className="h-px bg-white/10 mb-4" />

                            {/* Top section: Source, Acquired on, Cost */}
                            <div className="flex-1 space-y-4">
                              {/* Source row */}
                              {currentPurchaseData?.acquisitionVenue && currentPurchaseData.acquisitionVenue !== 'unknown' && (
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Source</p>
                                  <p className={`text-base font-medium ${
                                    currentPurchaseData.acquisitionVenue === 'opensea' ? 'text-blue-400' :
                                    currentPurchaseData.acquisitionVenue === 'otg_marketplace' ? 'text-purple-400' :
                                    currentPurchaseData.acquisitionVenue === 'decoder' ? 'text-amber-400' :
                                    currentPurchaseData.acquisitionVenue === 'mint' ? 'text-green-400' :
                                    'text-white/90'
                                  }`}>
                                    {getVenueDisplayLabel(currentPurchaseData.acquisitionVenue, (currentPurchaseData.decodeCostGun ?? 0) > 0)}
                                  </p>
                                </div>
                              )}

                              {/* Acquired on row */}
                              {currentPurchaseData?.purchaseDate && (
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Acquired on</p>
                                  <p className="text-base font-medium text-white/90 tabular-nums">{formatDate(currentPurchaseData.purchaseDate)}</p>
                                </div>
                              )}

                              {/* Cost row - multiple conditions */}
                              {currentPurchaseData?.decodeCostGun !== undefined && currentPurchaseData.decodeCostGun > 0 ? (
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Decode Cost</p>
                                  <p className="text-base font-medium text-amber-300 tabular-nums">
                                    {currentPurchaseData.decodeCostGun.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })} GUN
                                    {currentPurchaseData.decodeCostUsd !== undefined && (
                                      <span className="text-sm text-white/55 tabular-nums">
                                        <span className="mx-2">·</span>${currentPurchaseData.decodeCostUsd.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              ) : currentPurchaseData?.isFreeTransfer ? (
                                <>
                                  <div>
                                    <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Cost</p>
                                    <p className="text-base font-medium text-white/90 tabular-nums">
                                      0.00 GUN
                                      <span className="text-sm text-white/55">
                                        <span className="mx-2">·</span>
                                        {currentPurchaseData.acquisitionVenue === 'mint' ? 'Mint' :
                                          currentPurchaseData.acquisitionVenue === 'decoder' ? 'Decoded' :
                                          'Transfer'}
                                      </span>
                                    </p>
                                  </div>
                                  {currentPurchaseData.transferredFrom && (
                                    <div>
                                      <p className="text-xs uppercase tracking-wider text-white/55 mb-1">From</p>
                                      <a
                                        href={gunzExplorerAddressUrl(currentPurchaseData.transferredFrom)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-base font-medium text-[#64ffff] hover:text-[#96aaff] hover:underline underline-offset-2 transition tabular-nums"
                                        title={currentPurchaseData.transferredFrom}
                                      >
                                        {currentPurchaseData.transferredFrom.slice(0, 6)}...{currentPurchaseData.transferredFrom.slice(-4)}
                                      </a>
                                    </div>
                                  )}
                                </>
                              ) : currentPurchaseData?.purchasePriceGun !== undefined ? (
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Cost</p>
                                  <p className="text-base font-medium text-white/90 tabular-nums">
                                    {currentPurchaseData.purchasePriceGun.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })} GUN
                                    {currentPurchaseData.purchasePriceUsd !== undefined && (
                                      <span className="text-sm text-white/55 tabular-nums">
                                        <span className="mx-2">·</span>${currentPurchaseData.purchasePriceUsd.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              ) : !debugData.marketplaceConfigured && currentPurchaseData?.acquiredAt ? (
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Cost</p>
                                  <p className="text-sm text-white/40 italic">Marketplace data unavailable</p>
                                </div>
                              ) : null}
                            </div>

                            {/* Bottom section: Transaction (anchored at bottom) */}
                            {(() => {
                              const txHash = currentPurchaseData?.marketplaceTxHash
                                || currentPurchaseData?.acquisitionTxHash
                                || holdingAcquisitionRaw?.txHash;

                              if (!txHash) return null;

                              return (
                                <div className="mt-auto pt-4">
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Transaction</p>
                                  <a
                                    href={gunzExplorerTxUrl(txHash)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-base font-medium text-[#64ffff] hover:text-[#96aaff] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:rounded-sm transition"
                                    title={txHash}
                                  >
                                    View on Gunzscan
                                    <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* ===== Traits Card ===== */}
                        {Object.keys(filteredTraits).length > 0 && (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-full flex flex-col">
                            {/* Card title */}
                            <h4 className="text-sm font-semibold tracking-wide text-white/80 mb-2">
                              Traits
                            </h4>
                            <div className="h-px bg-white/10 mb-4" />

                            {/* Traits list: Mint Number, Rarity, Class, Platform */}
                            <div className="space-y-4">
                              {filteredTraits['Serial Number'] && (
                                <div className="min-w-0">
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Mint Number</p>
                                  <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Serial Number']}</p>
                                </div>
                              )}
                              {filteredTraits['Rarity'] && (
                                <div className="min-w-0">
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Rarity</p>
                                  <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Rarity']}</p>
                                </div>
                              )}
                              {filteredTraits['Class'] && (
                                <div className="min-w-0">
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Class</p>
                                  <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Class']}</p>
                                </div>
                              )}
                              {filteredTraits['Platform'] && (
                                <div className="min-w-0">
                                  <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Platform</p>
                                  <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Platform']}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== Debug Section (only visible with ?debugNft=1) ===== */}
              {debugMode && (
                <div className="border-t border-amber-500/30 pt-3 mt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDebugExpanded(v => !v);
                    }}
                    className="w-full flex items-center justify-between py-2 text-sm text-amber-400 hover:text-amber-300 transition"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      {debugExpanded ? 'Hide Debug Info' : 'Show Debug Info'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${debugExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {debugExpanded && (
                    <div className="mt-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 font-mono text-xs space-y-2">
                      {/* NoCache mode indicator */}
                      {debugData.noCacheEnabled && (
                        <div className="bg-purple-500/20 border border-purple-500/30 rounded px-2 py-1 mb-2">
                          <span className="text-purple-300 font-semibold">⚡ noCache mode enabled</span>
                          <span className="text-purple-200/70 text-[10px] ml-2">
                            (bypassed: {debugData.cacheBypassed ? 'yes' : 'no'})
                          </span>
                        </div>
                      )}
                      {/* Background refresh status */}
                      {debugData.cacheRenderedFirst && (
                        <div className="bg-blue-500/20 border border-blue-500/30 rounded px-2 py-1 mb-2">
                          <span className="text-blue-300 font-semibold">🔄 Background refresh</span>
                          <span className="text-blue-200/70 text-[10px] ml-2">
                            attempted: {debugData.backgroundRefreshAttempted ? 'yes' : 'no'},
                            updated: {debugData.backgroundRefreshUpdated ? 'yes' : 'no'}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-amber-400/70">tokenKey:</span>{' '}
                        <span className="text-amber-200 break-all">{debugData.tokenKey || '(not set)'}</span>
                      </div>
                      <div>
                        <span className="text-amber-400/70">cacheKey:</span>{' '}
                        <span className="text-amber-200 break-all text-[10px]">{debugData.cacheKey || '(not set)'}</span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-amber-400/70">cacheHit:</span>{' '}
                          <span className={debugData.cacheHit ? 'text-green-400' : 'text-rose-400'}>
                            {debugData.cacheHit ? 'true' : 'false'}
                          </span>
                        </div>
                        <div>
                          <span className="text-amber-400/70">reason:</span>{' '}
                          <span className="text-amber-200">{debugData.cacheReason || '—'}</span>
                        </div>
                      </div>
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-amber-400/70">priceSource:</span>{' '}
                        <span className={`font-semibold ${
                          debugData.priceSource === 'onchain' ? 'text-purple-400' :
                          debugData.priceSource === 'transfers' ? 'text-green-400' :
                          debugData.priceSource === 'localStorage' ? 'text-blue-400' :
                          'text-rose-400'
                        }`}>
                          {debugData.priceSource}
                        </span>
                      </div>
                      {/* Metadata Debug Section */}
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-green-400 font-semibold">metadata debug:</span>
                        <div className="mt-1 ml-2 text-[10px] space-y-1">
                          <div>
                            <span className="text-green-400/50">metadataSource:</span>{' '}
                            <span className={`font-semibold ${
                              nft?.metadataDebug?.metadataSource === 'tokenURI' ? 'text-green-400' :
                              nft?.metadataDebug?.metadataSource === 'gunzscan' ? 'text-blue-400' :
                              'text-rose-400'
                            }`}>
                              {nft?.metadataDebug?.metadataSource ?? 'unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-400/50">hasDescription:</span>{' '}
                            <span className={nft?.metadataDebug?.hasDescription ? 'text-green-400' : 'text-rose-400'}>
                              {nft?.metadataDebug?.hasDescription?.toString() ?? 'false'}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-400/50">descriptionLength:</span>{' '}
                            <span className="text-green-200/80">{nft?.metadataDebug?.descriptionLength ?? 0}</span>
                          </div>
                          <div>
                            <span className="text-green-400/50">tokenURI:</span>{' '}
                            <span className="text-green-200/80 break-all text-[9px]">
                              {nft?.metadataDebug?.tokenURI
                                ? (nft.metadataDebug.tokenURI.length > 200
                                    ? nft.metadataDebug.tokenURI.slice(0, 200) + '...'
                                    : nft.metadataDebug.tokenURI)
                                : '(not set)'}
                            </span>
                          </div>
                          {nft?.metadataDebug?.error && (
                            <div>
                              <span className="text-rose-400/50">error:</span>{' '}
                              <span className="text-rose-300">{nft.metadataDebug.error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-amber-400/70">acquisition (full):</span>
                        <pre className="text-amber-200 mt-1 whitespace-pre-wrap break-all text-[10px]">
{JSON.stringify({
  // Source tracking
  priceSource: currentPurchaseData?.priceSource ?? 'none',
  acquisitionVenue: currentPurchaseData?.acquisitionVenue ?? null,

  // Transfer-derived (blockchain)
  acquiredAt: toIsoStringSafe(currentPurchaseData?.acquiredAt) ?? null,
  fromAddress: currentPurchaseData?.fromAddress ?? null,
  acquisitionType: currentPurchaseData?.acquisitionType ?? null,
  acquisitionTxHash: currentPurchaseData?.acquisitionTxHash ?? null,

  // Marketplace purchase price (OpenSea, OTG Marketplace, etc.)
  purchasePriceGun: currentPurchaseData?.purchasePriceGun ?? null,
  purchasePriceUsd: currentPurchaseData?.purchasePriceUsd ?? null,
  purchaseDate: toIsoStringSafe(currentPurchaseData?.purchaseDate) ?? null,
  marketplaceTxHash: currentPurchaseData?.marketplaceTxHash ?? null,

  // Decode/Mint cost (in-game, NOT marketplace)
  decodeCostGun: currentPurchaseData?.decodeCostGun ?? null,
  decodeCostUsd: currentPurchaseData?.decodeCostUsd ?? null,

  // Legacy
  transferredFrom: currentPurchaseData?.transferredFrom ?? null,
  isFreeTransfer: currentPurchaseData?.isFreeTransfer ?? null,
}, null, 2)}
                        </pre>
                      </div>
                      {/* Debug: Holding Acquisition from RPC (getNFTHoldingAcquisition) */}
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-cyan-400 font-semibold">holding acquisition (RPC):</span>
                        <pre className="text-cyan-200 mt-1 whitespace-pre-wrap break-all text-[10px] bg-cyan-500/5 p-2 rounded">
{JSON.stringify(holdingAcquisitionRaw, null, 2)}
                        </pre>
                        <div className="mt-2 ml-2 text-[10px] space-y-1">
                          <div>
                            <span className="text-cyan-400/50">owned:</span>{' '}
                            <span className={`font-semibold ${holdingAcquisitionRaw?.owned ? 'text-green-400' : 'text-rose-400'}`}>
                              {holdingAcquisitionRaw?.owned?.toString() ?? 'null'}
                            </span>
                          </div>
                          <div>
                            <span className="text-cyan-400/50">acquisitionVenue:</span>{' '}
                            <span className="text-cyan-200/80">{holdingAcquisitionRaw?.venue ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-cyan-400/50">acquisitionTxHash:</span>{' '}
                            <span className="text-cyan-200/80 break-all">{holdingAcquisitionRaw?.txHash ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-cyan-400/50">costGun:</span>{' '}
                            <span className="text-cyan-200/80">{holdingAcquisitionRaw?.costGun ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-cyan-400/50">fromAddress:</span>{' '}
                            <span className="text-cyan-200/80 break-all">{holdingAcquisitionRaw?.fromAddress ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-cyan-400/50">isMint:</span>{' '}
                            <span className="text-cyan-200/80">{holdingAcquisitionRaw?.isMint?.toString() ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-cyan-400/50">acquiredAtIso:</span>{' '}
                            <span className="text-cyan-200/80">{holdingAcquisitionRaw?.acquiredAtIso ?? 'null'}</span>
                          </div>
                          {/* Debug sub-fields */}
                          {holdingAcquisitionRaw?.debug && (
                            <div className="border-t border-cyan-500/20 pt-1 mt-1">
                              <span className="text-cyan-400/50">debug.txTo:</span>{' '}
                              <span className="text-cyan-200/80 break-all">{holdingAcquisitionRaw.debug.txTo ?? 'null'}</span>
                            </div>
                          )}
                          {holdingAcquisitionRaw?.debug && (
                            <div>
                              <span className="text-cyan-400/50">debug.selector:</span>{' '}
                              <span className="text-cyan-200/80">{holdingAcquisitionRaw.debug.selector ?? 'null'}</span>
                            </div>
                          )}
                          {holdingAcquisitionRaw?.debug && (
                            <div>
                              <span className="text-cyan-400/50">debug.gunIsNative:</span>{' '}
                              <span className="text-cyan-200/80">{holdingAcquisitionRaw.debug.gunIsNative?.toString() ?? 'null'}</span>
                            </div>
                          )}
                          {holdingAcquisitionRaw?.debug && (
                            <div>
                              <span className="text-cyan-400/50">debug.matchedRule:</span>{' '}
                              <span className="text-cyan-200/80">{holdingAcquisitionRaw.debug.matchedRule ?? 'null'}</span>
                            </div>
                          )}
                          {holdingAcquisitionRaw?.debug && (
                            <div>
                              <span className="text-cyan-400/50">debug.hasOrderFulfilled:</span>{' '}
                              <span className={`font-semibold ${holdingAcquisitionRaw.debug.hasOrderFulfilled ? 'text-green-400' : 'text-cyan-200/80'}`}>
                                {holdingAcquisitionRaw.debug.hasOrderFulfilled?.toString() ?? 'null'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Debug: Transfer derivation details (legacy) */}
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-amber-400/70">transfer derivation (legacy):</span>
                        <div className="mt-1 ml-2 text-[10px] space-y-1">
                          <div>
                            <span className="text-amber-400/50">derivedAcquiredAt:</span>{' '}
                            <span className="text-amber-200/80">{debugData.derivedAcquiredAt ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">derivedAcquisitionType:</span>{' '}
                            <span className="text-amber-200/80">{debugData.derivedAcquisitionType ?? 'null'}</span>
                          </div>
                        </div>
                      </div>
                      {/* Debug: Marketplace matching (enhanced) */}
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-amber-400/70">marketplace matching:</span>
                        <div className="mt-1 ml-2 text-[10px] space-y-1">
                          {/* Identity info */}
                          <div>
                            <span className="text-amber-400/50">viewerWallet:</span>{' '}
                            <span className="text-amber-200/80 break-all">{debugData.viewerWallet || 'null'}</span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">currentOwner:</span>{' '}
                            <span className="text-amber-200/80 break-all">{debugData.currentOwner || 'null'}</span>
                          </div>
                          {/* Endpoint info */}
                          <div className="border-t border-amber-500/10 pt-1 mt-1">
                            <span className="text-amber-400/50">endpointBaseUrl:</span>{' '}
                            <span className="text-amber-200/80 break-all">{debugData.marketplaceEndpointBaseUrl || 'null'}</span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">network:</span>{' '}
                            <span className={`font-semibold ${
                              debugData.marketplaceNetwork === 'mainnet' ? 'text-green-400' :
                              debugData.marketplaceNetwork === 'testnet' ? 'text-yellow-400' :
                              'text-rose-400'
                            }`}>
                              {debugData.marketplaceNetwork || 'unconfigured'}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">configured:</span>{' '}
                            <span className={`font-semibold ${debugData.marketplaceConfigured ? 'text-green-400' : 'text-rose-400'}`}>
                              {debugData.marketplaceConfigured ? 'true' : 'false'}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">serverProxy:</span>{' '}
                            <span className={`font-semibold ${debugData.serverProxyUsed ? 'text-green-400' : 'text-amber-400'}`}>
                              {debugData.serverProxyUsed ? 'true' : 'false'}
                            </span>
                          </div>
                          {debugData.marketplaceTestConnection && (
                            <div className="ml-2 text-[9px]">
                              <span className="text-amber-400/30">testConnection:</span>{' '}
                              <span className={`${debugData.marketplaceTestConnection.success ? 'text-green-400' : 'text-rose-400'}`}>
                                {debugData.marketplaceTestConnection.success ? 'OK' : 'FAIL'}
                                {debugData.marketplaceTestConnection.statusCode && ` (${debugData.marketplaceTestConnection.statusCode})`}
                              </span>
                              {debugData.marketplaceTestConnection.error && (
                                <span className="text-rose-300/80 ml-1">{debugData.marketplaceTestConnection.error}</span>
                              )}
                            </div>
                          )}
                          <div>
                            <span className="text-amber-400/50">matchWindowMinutes:</span>{' '}
                            <span className="text-amber-200/80">{debugData.matchWindowMinutes}</span>
                          </div>
                          {/* Retrieval counts */}
                          <div className="border-t border-amber-500/10 pt-1 mt-1">
                            <span className="text-amber-400/50">tokenPurchasesCount:</span>{' '}
                            <span className={`font-semibold ${debugData.tokenPurchasesCount > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                              {debugData.tokenPurchasesCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">walletPurchasesCount (viewer):</span>{' '}
                            <span className={`font-semibold ${debugData.walletPurchasesCount_viewerWallet > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                              {debugData.walletPurchasesCount_viewerWallet}
                            </span>
                          </div>
                          {debugData.walletPurchasesTimeRange_viewerWallet && (
                            <div className="ml-2">
                              <span className="text-amber-400/30">timeRange:</span>{' '}
                              <span className="text-amber-200/60 text-[9px]">
                                {debugData.walletPurchasesTimeRange_viewerWallet.min} → {debugData.walletPurchasesTimeRange_viewerWallet.max}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-amber-400/50">walletPurchasesCount (owner):</span>{' '}
                            <span className={`font-semibold ${debugData.walletPurchasesCount_currentOwner > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                              {debugData.walletPurchasesCount_currentOwner}
                            </span>
                          </div>
                          {debugData.walletPurchasesTimeRange_currentOwner && (
                            <div className="ml-2">
                              <span className="text-amber-400/30">timeRange:</span>{' '}
                              <span className="text-amber-200/60 text-[9px]">
                                {debugData.walletPurchasesTimeRange_currentOwner.min} → {debugData.walletPurchasesTimeRange_currentOwner.max}
                              </span>
                            </div>
                          )}
                          {/* Merged candidates */}
                          <div className="border-t border-amber-500/10 pt-1 mt-1">
                            <span className="text-amber-400/50">candidatesCount (merged):</span>{' '}
                            <span className={`font-semibold ${debugData.marketplaceCandidatesCount > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                              {debugData.marketplaceCandidatesCount}
                            </span>
                          </div>
                          {debugData.marketplaceCandidateTimes && (
                            <div>
                              <span className="text-amber-400/50">candidateTimes:</span>{' '}
                              <span className="text-amber-200/80 text-[9px]">
                                {debugData.marketplaceCandidateTimes.min} → {debugData.marketplaceCandidateTimes.max}
                              </span>
                            </div>
                          )}
                          {/* Match result */}
                          <div className="border-t border-amber-500/10 pt-1 mt-1">
                            <span className="text-amber-400/50">matchMethod:</span>{' '}
                            <span className={`font-semibold ${
                              debugData.marketplaceMatchMethod === 'txHash' ? 'text-purple-400' :
                              debugData.marketplaceMatchMethod === 'timeWindow' ? 'text-blue-400' :
                              'text-rose-400'
                            }`}>
                              {debugData.marketplaceMatchMethod}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">matchedPurchaseId:</span>{' '}
                            <span className="text-amber-200/80">{debugData.marketplaceMatchedPurchaseId ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">matchedOrderId:</span>{' '}
                            <span className="text-amber-200/80">{debugData.marketplaceMatchedOrderId ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">matchedTimestamp:</span>{' '}
                            <span className="text-amber-200/80">{debugData.marketplaceMatchedTimestamp ?? 'null'}</span>
                          </div>
                          <div>
                            <span className="text-amber-400/50">matchedTxHash:</span>{' '}
                            <span className="text-amber-200/80 break-all">{debugData.marketplaceMatchedTxHash ?? 'null'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-amber-400/70">gunUsdRate:</span>{' '}
                        <span className="text-amber-200">{currentGunPrice ?? 'null'}</span>
                      </div>
                      <div>
                        <span className="text-amber-400/70">gunPriceTimestamp:</span>{' '}
                        <span className="text-amber-200">
                          {toIsoStringSafe(debugData.gunPriceTimestamp) ?? 'null'}
                        </span>
                      </div>
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-amber-400/70">transferEventCount:</span>{' '}
                        <span className={`font-semibold ${debugData.transferEventCount > 0 ? 'text-green-400' : 'text-rose-400'}`}>
                          {debugData.transferEventCount}
                        </span>
                      </div>
                      {debugData.transferQueryInfo && (
                        <div className="mt-1 ml-2 text-[10px] space-y-1">
                          {debugData.transferQueryInfo.fromBlock !== undefined && debugData.transferQueryInfo.toBlock !== undefined && (
                            <div>
                              <span className="text-amber-400/50">blockRange:</span>{' '}
                              <span className="text-amber-200/80">
                                {debugData.transferQueryInfo.fromBlock.toLocaleString()} → {debugData.transferQueryInfo.toBlock.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {debugData.transferQueryInfo.chunksQueried !== undefined && (
                            <div>
                              <span className="text-amber-400/50">chunksQueried:</span>{' '}
                              <span className="text-amber-200/80">{debugData.transferQueryInfo.chunksQueried}</span>
                            </div>
                          )}
                          {debugData.transferQueryInfo.currentOwner !== undefined && (
                            <div>
                              <span className="text-amber-400/50">currentOwner:</span>{' '}
                              <span className="text-amber-200/80 break-all">
                                {debugData.transferQueryInfo.currentOwner || 'null'}
                              </span>
                            </div>
                          )}
                          {debugData.transferQueryInfo.matchedRule && (
                            <div>
                              <span className="text-amber-400/50">venueMatchedBy:</span>{' '}
                              <span className="text-amber-200/80">{debugData.transferQueryInfo.matchedRule}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <span className="text-amber-400/70">marketplaceMatches:</span>{' '}
                        <span className="text-amber-200">{debugData.marketplaceMatches}</span>
                      </div>
                      {debugData.openSeaError && (
                        <div className="mt-1">
                          <span className="text-amber-400/70">openSeaError:</span>{' '}
                          <span className="text-rose-400 text-[10px]">{debugData.openSeaError}</span>
                        </div>
                      )}
                      <div className="border-t border-amber-500/20 pt-2">
                        <span className="text-amber-400/70">listingsData:</span>
                        <pre className="text-amber-200 mt-1 whitespace-pre-wrap break-all">
{JSON.stringify(listingsData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== 6) ModalFooter ===== */}
          <div className="h-14 flex-shrink-0 flex items-center justify-center px-4 border-t border-white/[0.12]">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition"
            >
              Close
            </button>
          </div>

        </div>

          {/* Enter Armory Button - positioned outside modal overflow */}
          {hasRelatedItems && (
            <button
              onClick={() => setRelatedItemsExpanded(!relatedItemsExpanded)}
              className={`relative self-start mt-[140px] w-10 h-32 bg-gradient-to-r from-[#1a1a1a] to-[#252525] border border-l-0 border-white/20 rounded-r-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#64ffff] hover:border-[#64ffff]/50 transition-all duration-300 z-10 group ${
                relatedItemsExpanded ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100 hover:translate-x-1'
              }`}
              title={`Armory - ${relatedItems.length} modifications available`}
            >
              {/* Vertical "ARMORY" text */}
              <span
                className="text-[9px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-[#64ffff] transition-colors whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                ARMORY
              </span>
              {/* Animated arrow */}
              <svg
                className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {/* Item count badge */}
              <span className="absolute -top-2 -right-1 w-5 h-5 bg-[#64ffff] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {relatedItems.length}
              </span>
            </button>
          )}

          {/* ===== Weapon Lab Panel ===== */}
          {hasRelatedItems && (
            <div
              className={`relative max-h-[85vh] bg-[#0d0d0d] rounded-r-2xl overflow-hidden flex flex-col transform transition-all duration-300 origin-left ${
                relatedItemsExpanded
                  ? 'w-[320px] opacity-100 scale-x-100'
                  : 'w-0 opacity-0 scale-x-0'
              }`}
              style={{
                boxShadow: relatedItemsExpanded ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : 'none',
              }}
            >
              {/* Panel Header */}
              <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.12]">
                <h3 className="text-sm font-semibold text-white">
                  Weapon Lab
                </h3>
                <button
                  onClick={() => setRelatedItemsExpanded(false)}
                  className="text-gray-400 hover:text-white transition p-1 rounded hover:bg-white/5 flex items-center gap-1 text-xs"
                  title="Exit Armory"
                >
                  <span className="text-[10px] text-gray-500">Exit Armory</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto scrollbar-premium">
                {/* Available Modifications Section */}
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-[#64ffff] uppercase tracking-wider mb-2">
                    Available Modifications
                  </h4>
                  <div className="space-y-2">
                    {relatedItems.map((item) => {
                      const itemColors = getRarityColorForNft(item);
                      const itemRarity = item.traits?.['RARITY'] || item.traits?.['Rarity'] || 'Unknown';
                      const itemClass = item.traits?.['CLASS'] || item.traits?.['Class'] || '';
                      const quantity = item.quantity || 1;

                      return (
                        <div
                          key={item.tokenId}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
                          style={{
                            borderLeft: `3px solid ${itemColors.primary}`,
                          }}
                        >
                          {/* Thumbnail */}
                          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-black/50">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={item.name}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-[10px] font-semibold uppercase"
                                style={{ color: itemColors.primary }}
                              >
                                {itemRarity}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {itemClass === 'Weapon Skin' ? 'Skin' : itemClass}
                              </span>
                            </div>
                          </div>

                          {/* Quantity Badge */}
                          {quantity > 1 && (
                            <div className="flex-shrink-0 px-2 py-0.5 bg-[#96aaff]/20 text-[#96aaff] text-xs font-semibold rounded">
                              ×{quantity}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weapon Prototypes Section */}
                <div className="p-3 border-t border-white/[0.08]">
                  <h4 className="text-xs font-semibold text-[#96aaff] uppercase tracking-wider mb-1">
                    Weapon Prototypes
                  </h4>
                  <p className="text-[10px] text-gray-500 mb-3">
                    Configure, upgrade, and prototype weapons
                  </p>
                  <div className="flex items-center justify-center py-6 text-gray-600 text-xs">
                    <span className="text-center">Coming soon</span>
                  </div>
                </div>
              </div>

              {/* Panel Footer with summary */}
              <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.12] text-xs text-gray-500">
                {(() => {
                  const skins = relatedItems.filter(i => (i.traits?.['CLASS'] || i.traits?.['Class']) === 'Weapon Skin');
                  const accessories = relatedItems.filter(i => (i.traits?.['CLASS'] || i.traits?.['Class']) === 'Accessory');
                  const parts = [];
                  if (skins.length > 0) parts.push(`${skins.length} skin${skins.length > 1 ? 's' : ''}`);
                  if (accessories.length > 0) parts.push(`${accessories.length} attachment${accessories.length > 1 ? 's' : ''}`);
                  return parts.join(', ') || 'No modifications';
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
