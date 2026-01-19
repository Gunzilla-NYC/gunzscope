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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
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
        </div>
      </div>
    </div>
  );
}
