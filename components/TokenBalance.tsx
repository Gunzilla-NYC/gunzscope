'use client';

import { TokenBalance as TokenBalanceType } from '@/lib/types';
import Image from 'next/image';

interface TokenBalanceProps {
  balance: TokenBalanceType | null;
  chain: string;
  price?: number;
}

// Get display name for chain
function getChainDisplayName(chain: string): string {
  if (chain === 'avalanche') return 'GUN';
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

// Get network badge name
function getNetworkBadge(chain: string): string {
  if (chain === 'avalanche') return 'GUNZ';
  return chain.toUpperCase();
}

export default function TokenBalance({ balance, chain, price }: TokenBalanceProps) {
  const displayName = getChainDisplayName(chain);
  const networkBadge = getNetworkBadge(chain);

  if (!balance) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">{displayName}</h3>
        <p className="text-gray-500">No GUN tokens found</p>
      </div>
    );
  }

  const usdValue = price ? balance.balance * price : balance.usdValue || 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {chain === 'avalanche' && (
            <Image
              src="/gun-logo.svg"
              alt="GUN"
              width={24}
              height={24}
              className="opacity-80"
            />
          )}
          <h3 className="text-lg font-semibold text-gray-800">{displayName}</h3>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {networkBadge}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm text-gray-600">Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {balance.balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </p>
        </div>

        {price && (
          <div>
            <p className="text-sm text-gray-600">Value (USD)</p>
            <p className="text-xl font-semibold text-green-600">
              ${usdValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )}

        {price && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Price: ${price.toFixed(6)} per {balance.symbol}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
