'use client';

import { MarketplaceData } from '@/lib/types';

interface MarketplaceStatsProps {
  data: MarketplaceData | null;
  loading?: boolean;
}

export default function MarketplaceStats({ data, loading = false }: MarketplaceStatsProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          In-Game Marketplace
        </h3>
        <p className="text-gray-500">Loading marketplace data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          In-Game Marketplace
        </h3>
        <p className="text-gray-500">Marketplace data not available</p>
        <p className="text-xs text-gray-400 mt-2">
          Configure your game marketplace API in .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-lg shadow-lg text-white">
      <h3 className="text-lg font-semibold mb-4">In-Game Marketplace</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <p className="text-sm opacity-90 mb-1">Total Listings</p>
          <p className="text-2xl font-bold">
            {data.totalListings.toLocaleString()}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <p className="text-sm opacity-90 mb-1">Floor Price</p>
          <p className="text-2xl font-bold">
            {data.floorPrice > 0 ? `${data.floorPrice.toFixed(2)}` : 'N/A'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <p className="text-sm opacity-90 mb-1">24h Volume</p>
          <p className="text-2xl font-bold">
            ${data.volume24h.toLocaleString()}
          </p>
        </div>

        {data.liveMints !== undefined && (
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
            <p className="text-sm opacity-90 mb-1">Live Mints</p>
            <p className="text-2xl font-bold">
              {data.liveMints.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
