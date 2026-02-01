'use client';

import { WalletData } from '@/lib/types';
import { NetworkInfo } from '@/lib/utils/networkDetector';
import NetworkBadge from './NetworkBadge';

interface PortfolioSummaryProps {
  walletData: WalletData;
  gunPrice?: number;
  networkInfo?: NetworkInfo | null;
  walletType?: 'in-game' | 'external' | 'unknown';
  totalOwnedCount?: number;
}

export default function PortfolioSummary({ walletData, gunPrice, networkInfo, walletType, totalOwnedCount }: PortfolioSummaryProps) {
  const avalancheTokenValue = walletData.avalanche.gunToken && gunPrice
    ? walletData.avalanche.gunToken.balance * gunPrice
    : 0;

  const solanaTokenValue = walletData.solana.gunToken && gunPrice
    ? walletData.solana.gunToken.balance * gunPrice
    : 0;

  const totalTokenValue = avalancheTokenValue + solanaTokenValue;

  // Calculate total NFT count - use totalOwnedCount if provided (from pagination)
  const solanaNFTCount = walletData.solana.nfts.reduce(
    (sum, nft) => sum + (nft.quantity || 1),
    0
  );
  // Use totalOwnedCount for Avalanche if available, otherwise calculate from loaded NFTs
  const avalancheNFTCount = totalOwnedCount ?? walletData.avalanche.nfts.reduce(
    (sum, nft) => sum + (nft.quantity || 1),
    0
  );
  const totalNFTs = avalancheNFTCount + solanaNFTCount;

  // Calculate NFT P&L summary
  const allNfts = [...walletData.avalanche.nfts, ...walletData.solana.nfts];
  let nftTotalSpent = 0;
  let nftTotalEstValue = 0;
  let nftSpentForPnl = 0; // Only items with both purchase price and floor

  for (const nft of allNfts) {
    const price = nft.purchasePriceGun || 0;
    const quantity = nft.quantity || 1;
    const floor = nft.floorPrice;

    nftTotalSpent += price * quantity;

    if (floor !== undefined && floor > 0) {
      nftTotalEstValue += floor * quantity;
    }

    if (price > 0 && floor !== undefined && floor > 0) {
      nftSpentForPnl += price * quantity;
    }
  }

  const nftUnrealizedPnlGun = nftSpentForPnl > 0 ? nftTotalEstValue - nftSpentForPnl : null;
  const nftUnrealizedPnlPct = (nftSpentForPnl > 0 && nftUnrealizedPnlGun !== null)
    ? (nftUnrealizedPnlGun / nftSpentForPnl) * 100
    : null;

  return (
    <div className="glass-effect p-8 rounded-lg shadow-2xl text-white relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#64ffff]/5 to-[#96aaff]/5 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 uppercase tracking-wide">Portfolio Summary</h2>
            <p className="text-[#64ffff] text-sm font-mono">
              {walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-70 uppercase text-xs tracking-wider">Last Updated</p>
            <p className="text-xs text-gray-400">
              {walletData.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Network and Wallet Type Badges */}
        <div className="mb-6">
          <NetworkBadge networkInfo={networkInfo ?? null} walletType={walletType} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          <div className="bg-[#181818] border border-[#64ffff]/20 p-6 rounded-lg hover:border-[#64ffff]/40 transition-all">
            <p className="text-xs opacity-70 mb-2 uppercase tracking-wider text-gray-400">Total Token Value</p>
            <p className="text-4xl font-bold text-[#64ffff]">
              ${totalTokenValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs opacity-60 mt-2 text-gray-500">
              {(walletData.avalanche.gunToken?.balance || 0) +
               (walletData.solana.gunToken?.balance || 0)} GUN total
            </p>
          </div>

          <div className="bg-[#181818] border border-[#96aaff]/20 p-6 rounded-lg hover:border-[#96aaff]/40 transition-all">
            <p className="text-xs opacity-70 mb-2 uppercase tracking-wider text-gray-400">NFT Holdings</p>
            <p className="text-4xl font-bold text-[#96aaff]">{totalNFTs}</p>
            <p className="text-xs opacity-60 mt-2 text-gray-500">
              {avalancheNFTCount} GUNZ • {solanaNFTCount} Solana
            </p>
          </div>

          <div className="bg-[#181818] border border-[#beffd2]/20 p-6 rounded-lg hover:border-[#beffd2]/40 transition-all">
            <p className="text-xs opacity-70 mb-2 uppercase tracking-wider text-gray-400">GUN Price</p>
            <p className="text-4xl font-bold text-[#beffd2]">
              {gunPrice ? `$${gunPrice.toFixed(6)}` : 'N/A'}
            </p>
            <p className="text-xs opacity-60 mt-2 text-gray-500">Current market price</p>
          </div>

          {/* NFT P&L Card */}
          <div className={`bg-[#181818] border p-6 rounded-lg transition-all ${
            nftUnrealizedPnlPct !== null && nftUnrealizedPnlPct > 1
              ? 'border-[#beffd2]/20 hover:border-[#beffd2]/40'
              : nftUnrealizedPnlPct !== null && nftUnrealizedPnlPct < -1
                ? 'border-[#ff6b6b]/20 hover:border-[#ff6b6b]/40'
                : 'border-gray-500/20 hover:border-gray-500/40'
          }`}>
            <p className="text-xs opacity-70 mb-2 uppercase tracking-wider text-gray-400">NFT P&L</p>
            {nftUnrealizedPnlGun !== null && nftUnrealizedPnlPct !== null ? (
              <>
                <p className={`text-4xl font-bold ${
                  nftUnrealizedPnlPct > 1 ? 'text-[#beffd2]' :
                  nftUnrealizedPnlPct < -1 ? 'text-[#ff6b6b]' : 'text-gray-400'
                }`}>
                  {nftUnrealizedPnlPct >= 0 ? '+' : ''}{nftUnrealizedPnlPct.toFixed(1)}%
                </p>
                <p className={`text-xs mt-2 ${
                  nftUnrealizedPnlPct > 1 ? 'text-[#beffd2]/70' :
                  nftUnrealizedPnlPct < -1 ? 'text-[#ff6b6b]/70' : 'text-gray-500'
                }`}>
                  {nftUnrealizedPnlGun >= 0 ? '+' : ''}{nftUnrealizedPnlGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-500">--</p>
                <p className="text-xs opacity-60 mt-2 text-gray-500">
                  {nftTotalSpent > 0 ? 'Missing floor prices' : 'No acquisition data'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
