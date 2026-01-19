'use client';

import { NetworkInfo } from '@/lib/utils/networkDetector';

interface NetworkBadgeProps {
  networkInfo: NetworkInfo | null;
  walletType?: 'in-game' | 'external' | 'unknown';
  loading?: boolean;
}

export default function NetworkBadge({ networkInfo, walletType, loading }: NetworkBadgeProps) {
  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="px-3 py-1 rounded-full bg-gray-200 animate-pulse">
          <span className="text-xs text-transparent">Loading...</span>
        </div>
      </div>
    );
  }

  if (!networkInfo) return null;

  // Network badge styling
  const getNetworkBadgeStyle = () => {
    switch (networkInfo.environment) {
      case 'mainnet':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'testnet':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Network badge icon
  const getNetworkIcon = () => {
    switch (networkInfo.environment) {
      case 'mainnet':
        return '🌐';
      case 'testnet':
        return '🧪';
      default:
        return '❓';
    }
  };

  // Network badge text
  const getNetworkText = () => {
    switch (networkInfo.environment) {
      case 'mainnet':
        return 'Mainnet';
      case 'testnet':
        return 'Testnet';
      default:
        return 'Unknown Network';
    }
  };

  // Wallet type badge styling
  const getWalletTypeBadgeStyle = () => {
    switch (walletType) {
      case 'in-game':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'external':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Wallet type badge icon
  const getWalletTypeIcon = () => {
    switch (walletType) {
      case 'in-game':
        return '🎮';
      case 'external':
        return '💼';
      default:
        return '👛';
    }
  };

  // Wallet type badge text
  const getWalletTypeText = () => {
    switch (walletType) {
      case 'in-game':
        return 'In-Game Wallet';
      case 'external':
        return 'External Wallet';
      default:
        return 'Unknown Type';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Network Badge */}
      <div className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 ${getNetworkBadgeStyle()}`}>
        <span>{getNetworkIcon()}</span>
        <span>{getNetworkText()}</span>
      </div>

      {/* Wallet Type Badge */}
      {walletType && (
        <div className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 ${getWalletTypeBadgeStyle()}`}>
          <span>{getWalletTypeIcon()}</span>
          <span>{getWalletTypeText()}</span>
        </div>
      )}

      {/* Chain ID Badge (subtle) */}
      <div className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium">
        Chain ID: {networkInfo.chainId}
      </div>
    </div>
  );
}
