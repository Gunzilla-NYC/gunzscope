'use client';

import { useState, useCallback, useRef } from 'react';
import PortfolioSummary from '@/components/PortfolioSummary';
import TokenBalance from '@/components/TokenBalance';
import NFTGallery from '@/components/NFTGallery';
import MarketplaceStats from '@/components/MarketplaceStats';
import { WalletData, MarketplaceData, NFTPaginationInfo } from '@/lib/types';
import { AvalancheService } from '@/lib/blockchain/avalanche';
import { SolanaService } from '@/lib/blockchain/solana';
import { CoinGeckoService } from '@/lib/api/coingecko';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { NFT } from '@/lib/types';
import { NetworkDetector, NetworkInfo } from '@/lib/utils/networkDetector';
import { groupNFTsByMetadata } from '@/lib/utils/nftGrouping';
import { getCachedNFT, setCachedNFT } from '@/lib/utils/nftCache';
import Navbar from '@/components/Navbar';

// Batch size for parallel NFT enrichment
const ENRICHMENT_BATCH_SIZE = 5;

export default function Home() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData | null>(null);
  const [gunPrice, setGunPrice] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [walletType, setWalletType] = useState<'in-game' | 'external' | 'unknown'>('unknown');
  const [searchAddress, setSearchAddress] = useState('');
  const [enrichingNFTs, setEnrichingNFTs] = useState(false);

  // NFT Pagination state
  const [nftPagination, setNftPagination] = useState<NFTPaginationInfo>({
    totalOwnedCount: 0,
    fetchedCount: 0,
    pageSize: 50,
    pagesLoaded: 0,
    hasMore: false,
    isLoadingMore: false,
  });

  // Ref to track if enrichment should be cancelled
  const enrichmentCancelledRef = useRef(false);

  // Helper to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
  };

  // Process NFTs in batches for better performance
  const processBatch = async <T, R>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<R>
  ): Promise<R[]> => {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      // Check if cancelled
      if (enrichmentCancelledRef.current) break;

      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  };

  // Enrich a single NFT with caching
  const enrichSingleNFT = async (
    nft: NFT,
    walletAddress: string,
    nftContractAddress: string,
    avalancheService: AvalancheService
  ): Promise<NFT> => {
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;

    // Check cache first
    const cached = getCachedNFT(walletAddress, primaryTokenId);
    if (cached) {
      return {
        ...nft,
        quantity: cached.quantity ?? nft.quantity ?? 1,
        purchasePriceGun: cached.purchasePriceGun,
        purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
        transferredFrom: cached.transferredFrom,
        isFreeTransfer: cached.isFreeTransfer,
      };
    }

    try {
      // Fetch quantity and transfer history in parallel
      const [quantity, transferHistory] = await Promise.all([
        // For non-grouped NFTs, fetch quantity (ERC-1155 check)
        nft.tokenIds && nft.tokenIds.length > 1
          ? Promise.resolve(nft.quantity || nft.tokenIds.length)
          : withTimeout(
              avalancheService.detectNFTQuantity(nftContractAddress, nft.tokenId, walletAddress),
              3000
            ),
        // Fetch transfer history to get purchase price
        withTimeout(
          avalancheService.getNFTTransferHistory(nftContractAddress, primaryTokenId, walletAddress),
          5000
        ),
      ]);

      const enrichedData = {
        quantity: quantity ?? 1,
        purchasePriceGun: transferHistory?.purchasePriceGun,
        purchaseDate: transferHistory?.purchaseDate,
        transferredFrom: transferHistory?.transferredFrom,
        isFreeTransfer: transferHistory?.isFreeTransfer,
      };

      // Save to cache (convert Date to ISO string for storage)
      setCachedNFT(walletAddress, primaryTokenId, {
        quantity: enrichedData.quantity,
        purchasePriceGun: enrichedData.purchasePriceGun,
        purchaseDate: enrichedData.purchaseDate?.toISOString(),
        transferredFrom: enrichedData.transferredFrom,
        isFreeTransfer: enrichedData.isFreeTransfer,
      });

      return {
        ...nft,
        ...enrichedData,
      };
    } catch (error) {
      console.error(`Error enriching NFT ${nft.tokenId}:`, error);
      return nft;
    }
  };

  // Background enrichment function - updates NFTs progressively
  const enrichNFTsInBackground = useCallback(async (
    nfts: NFT[],
    walletAddress: string,
    avalancheService: AvalancheService,
    updateCallback: (enrichedNFTs: NFT[]) => void
  ) => {
    const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE;
    if (!nftContractAddress || nfts.length === 0) return;

    setEnrichingNFTs(true);
    enrichmentCancelledRef.current = false;

    // Start with cached data applied immediately
    const nftsWithCache = nfts.map(nft => {
      const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
      const cached = getCachedNFT(walletAddress, primaryTokenId);
      if (cached) {
        return {
          ...nft,
          quantity: cached.quantity ?? nft.quantity ?? 1,
          purchasePriceGun: cached.purchasePriceGun,
          purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
          transferredFrom: cached.transferredFrom,
          isFreeTransfer: cached.isFreeTransfer,
        };
      }
      return nft;
    });

    // Update immediately with cached data
    updateCallback(nftsWithCache);

    // Find NFTs that still need enrichment (no cache)
    const nftsNeedingEnrichment = nftsWithCache.filter(nft => {
      const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
      return !getCachedNFT(walletAddress, primaryTokenId);
    });

    if (nftsNeedingEnrichment.length === 0) {
      setEnrichingNFTs(false);
      return;
    }

    // Process in batches and update progressively
    const enrichedResults = new Map<string, NFT>();
    nftsWithCache.forEach(nft => {
      const key = nft.tokenIds?.[0] || nft.tokenId;
      enrichedResults.set(key, nft);
    });

    for (let i = 0; i < nftsNeedingEnrichment.length; i += ENRICHMENT_BATCH_SIZE) {
      if (enrichmentCancelledRef.current) break;

      const batch = nftsNeedingEnrichment.slice(i, i + ENRICHMENT_BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(nft => enrichSingleNFT(nft, walletAddress, nftContractAddress, avalancheService))
      );

      // Update results map
      batchResults.forEach(enrichedNFT => {
        const key = enrichedNFT.tokenIds?.[0] || enrichedNFT.tokenId;
        enrichedResults.set(key, enrichedNFT);
      });

      // Reconstruct array in original order and update UI
      if (!enrichmentCancelledRef.current) {
        const updatedNFTs = nfts.map(nft => {
          const key = nft.tokenIds?.[0] || nft.tokenId;
          return enrichedResults.get(key) || nft;
        });
        updateCallback(updatedNFTs);
      }
    }

    setEnrichingNFTs(false);
  }, []);

  // Load more NFTs (pagination)
  const handleLoadMoreNFTs = useCallback(async () => {
    if (!walletData || nftPagination.isLoadingMore || !nftPagination.hasMore) return;

    setNftPagination(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const avalancheService = new AvalancheService();
      const startIndex = nftPagination.fetchedCount;

      const result = await avalancheService.getNFTsPaginated(
        walletData.address,
        startIndex,
        nftPagination.pageSize
      );

      if (result.nfts.length > 0) {
        // Group new NFTs
        const groupedNewNFTs = groupNFTsByMetadata(result.nfts);

        // Merge with existing NFTs (avoid duplicates by tokenId)
        const existingTokenIds = new Set(
          walletData.avalanche.nfts.flatMap(nft => nft.tokenIds || [nft.tokenId])
        );
        const uniqueNewNFTs = groupedNewNFTs.filter(nft => {
          const tokenIds = nft.tokenIds || [nft.tokenId];
          return !tokenIds.some(id => existingTokenIds.has(id));
        });

        const mergedNFTs = [...walletData.avalanche.nfts, ...uniqueNewNFTs];

        // Update wallet data with merged NFTs
        setWalletData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            avalanche: {
              ...prev.avalanche,
              nfts: mergedNFTs,
            },
          };
        });

        // Update pagination state
        setNftPagination(prev => ({
          ...prev,
          fetchedCount: prev.fetchedCount + result.nfts.length,
          pagesLoaded: prev.pagesLoaded + 1,
          hasMore: result.hasMore,
          isLoadingMore: false,
        }));

        // Start background enrichment for new NFTs
        enrichNFTsInBackground(
          uniqueNewNFTs,
          walletData.address,
          avalancheService,
          (enrichedNFTs) => {
            setWalletData(prev => {
              if (!prev) return prev;
              // Merge enriched NFTs back
              const existingNFTs = prev.avalanche.nfts;
              const enrichedMap = new Map(
                enrichedNFTs.map(nft => [nft.tokenIds?.[0] || nft.tokenId, nft])
              );
              const updatedNFTs = existingNFTs.map(nft => {
                const key = nft.tokenIds?.[0] || nft.tokenId;
                return enrichedMap.get(key) || nft;
              });
              return {
                ...prev,
                avalanche: {
                  ...prev.avalanche,
                  nfts: updatedNFTs,
                },
              };
            });
          }
        );
      } else {
        setNftPagination(prev => ({
          ...prev,
          hasMore: false,
          isLoadingMore: false,
        }));
      }
    } catch (error) {
      console.error('Error loading more NFTs:', error);
      setNftPagination(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [walletData, nftPagination, enrichNFTsInBackground]);

  const handleWalletSubmit = async (address: string, _chain: 'avalanche' | 'solana') => {
    // Cancel any ongoing enrichment
    enrichmentCancelledRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const avalancheService = new AvalancheService();
      const solanaService = new SolanaService();
      const coinGeckoService = new CoinGeckoService();
      const marketplaceService = new GameMarketplaceService();

      // Detect network and wallet type
      const rpcUrl = process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL ||
        'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';
      const networkDetector = new NetworkDetector(rpcUrl);

      // Fetch basic data in parallel (using paginated NFT fetch)
      const [
        avalancheToken,
        avalancheNFTsResult,
        solanaToken,
        solanaNFTs,
        priceData,
        marketplace,
        detectedNetworkInfo,
        detectedWalletType,
      ] = await Promise.all([
        avalancheService.getGunTokenBalance(address),
        avalancheService.getNFTsPaginated(address, 0, 50), // First page
        solanaService.getGunTokenBalance(address),
        solanaService.getNFTs(address),
        coinGeckoService.getGunTokenPrice(),
        marketplaceService.getMarketplaceData(),
        networkDetector.getNetworkInfo(),
        networkDetector.detectWalletType(address),
      ]);

      // Group NFTs by metadata to consolidate duplicates
      const groupedAvalancheNFTs = groupNFTsByMetadata(avalancheNFTsResult.nfts);
      const groupedSolanaNFTs = groupNFTsByMetadata(solanaNFTs);

      // Update pagination state
      setNftPagination({
        totalOwnedCount: avalancheNFTsResult.totalCount,
        fetchedCount: avalancheNFTsResult.nfts.length,
        pageSize: 50,
        pagesLoaded: 1,
        hasMore: avalancheNFTsResult.hasMore,
        isLoadingMore: false,
      });

      const price = priceData?.gunTokenPrice;
      if (price) {
        setGunPrice(price);
      }

      // Set network info and wallet type
      setNetworkInfo(detectedNetworkInfo);
      setWalletType(detectedWalletType);

      const totalValue =
        ((avalancheToken?.balance || 0) + (solanaToken?.balance || 0)) * (price || 0);

      // Show data immediately with unenriched NFTs
      const initialData: WalletData = {
        address,
        avalanche: {
          gunToken: avalancheToken,
          nfts: groupedAvalancheNFTs,
        },
        solana: {
          gunToken: solanaToken,
          nfts: groupedSolanaNFTs,
        },
        totalValue,
        lastUpdated: new Date(),
      };

      setWalletData(initialData);
      setMarketplaceData(marketplace);
      setLoading(false);

      // Start background enrichment for Avalanche NFTs
      enrichNFTsInBackground(
        groupedAvalancheNFTs,
        address,
        avalancheService,
        (enrichedNFTs) => {
          setWalletData(prev => {
            if (!prev || prev.address !== address) return prev;
            return {
              ...prev,
              avalanche: {
                ...prev.avalanche,
                nfts: enrichedNFTs,
              },
            };
          });
        }
      );

    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to fetch wallet data. Please check the address and try again.');
      setLoading(false);
    }
  };

  // Handle wallet search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      handleWalletSubmit(searchAddress.trim(), 'avalanche');
    }
  };

  // Handle wallet connection from Dynamic
  const handleWalletConnect = (address: string) => {
    // Auto-load wallet data when user connects via Dynamic
    handleWalletSubmit(address, 'avalanche');
  };

  // Handle wallet disconnect
  const handleWalletDisconnect = () => {
    enrichmentCancelledRef.current = true;
    setWalletData(null);
    setMarketplaceData(null);
    setNetworkInfo(null);
    setWalletType('unknown');
    setGunPrice(undefined);
    setError(null);
    setSearchAddress('');
    // Reset pagination
    setNftPagination({
      totalOwnedCount: 0,
      fetchedCount: 0,
      pageSize: 50,
      pagesLoaded: 0,
      hasMore: false,
      isLoadingMore: false,
    });
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar
        onWalletConnect={handleWalletConnect}
        onWalletDisconnect={handleWalletDisconnect}
      />
      <div className="max-w-7xl mx-auto py-8 px-4">
        <header className="text-center mb-8">
          <p className="text-lg text-gray-400">
            Track your GUN tokens and NFTs across GunzChain and Solana
          </p>
        </header>

        {/* Search Bar - always visible when no wallet data */}
        {!walletData && !loading && (
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="wallet-search-input"
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="Search any wallet address..."
                  className="w-full pl-12 pr-32 py-4 text-base bg-[#1a1a1a] border border-[#64ffff]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#64ffff] focus:ring-1 focus:ring-[#64ffff] transition"
                />
                <button
                  type="submit"
                  disabled={!searchAddress.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-[#64ffff] to-[#96aaff] text-black font-semibold text-sm rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search
                </button>
              </div>
            </form>
            <p className="text-center text-gray-500 text-sm mt-3">
              Enter a GUNZ Chain or Solana wallet address to view portfolio
            </p>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-[#181818] border border-[#ff003a] rounded-lg">
            <p className="text-[#ff003a]">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#64ffff]"></div>
            <p className="mt-4 text-gray-400">Loading wallet data...</p>
          </div>
        )}

        {walletData && !loading && (
          <div className="space-y-6">
            {/* Search another wallet - inline search bar */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  enrichmentCancelledRef.current = true;
                  setWalletData(null);
                  setMarketplaceData(null);
                  setNetworkInfo(null);
                  setWalletType('unknown');
                  setError(null);
                  setSearchAddress('');
                }}
                className="text-[#64ffff] hover:text-[#96aaff] font-medium transition-colors text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                New Search
              </button>
              <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="Search another wallet..."
                    className="w-full pl-9 pr-20 py-2 text-sm bg-[#1a1a1a] border border-[#64ffff]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#64ffff] transition"
                  />
                  <button
                    type="submit"
                    disabled={!searchAddress.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#64ffff]/20 text-[#64ffff] text-xs font-medium rounded hover:bg-[#64ffff]/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Go
                  </button>
                </div>
              </form>
              {enrichingNFTs && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 border-2 border-[#64ffff]/30 border-t-[#64ffff] rounded-full animate-spin"></div>
                  <span>Loading details...</span>
                </div>
              )}
            </div>

            <PortfolioSummary
              walletData={walletData}
              gunPrice={gunPrice}
              networkInfo={networkInfo}
              walletType={walletType}
              totalOwnedCount={nftPagination.totalOwnedCount}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TokenBalance
                balance={walletData.avalanche.gunToken}
                chain="avalanche"
                price={gunPrice}
              />
              <TokenBalance
                balance={walletData.solana.gunToken}
                chain="solana"
                price={gunPrice}
              />
            </div>

            <MarketplaceStats data={marketplaceData} />

            <NFTGallery
              nfts={walletData.avalanche.nfts}
              chain="avalanche"
              walletAddress={walletData.address}
              paginationInfo={nftPagination}
              onLoadMore={handleLoadMoreNFTs}
            />
            <NFTGallery nfts={walletData.solana.nfts} chain="solana" walletAddress={walletData.address} />
          </div>
        )}

        <footer className="mt-16 text-center text-gray-600 text-sm border-t border-[#64ffff]/10 pt-8">
          <p className="uppercase tracking-wider text-xs">ZillaScope.xyz - Built for the GUNZILLA community</p>
          <p className="mt-2 text-gray-700">Real-time blockchain portfolio tracking</p>
        </footer>
      </div>
    </div>
  );
}
