'use client';

import { MarketplaceData } from '@/lib/types';

interface MarketplaceStatsProps {
  data: MarketplaceData | null;
  loading?: boolean;
}

export default function MarketplaceStats({ data, loading = false }: MarketplaceStatsProps) {
  if (loading) {
    return (
      <div className="bg-white/[0.015] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/40 font-medium">
              In-Game Marketplace
            </span>
          </div>
          <span className="text-[10px] text-amber-500/60 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
            Experimental
          </span>
        </div>
        <p className="text-white/40 text-[12px]">Loading marketplace data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white/[0.015] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/40 font-medium">
              In-Game Marketplace
            </span>
          </div>
          <span className="text-[10px] text-amber-500/60 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
            Experimental
          </span>
        </div>
        <p className="text-white/40 text-[12px]">Marketplace data not available</p>
        <p className="text-[11px] text-white/30 mt-2">
          Configure your game marketplace API in .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.015] border border-white/5 rounded-xl overflow-hidden">
      {/* Header with subtle accent border */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/40 font-medium">
              In-Game Marketplace
            </span>
          </div>
          <span className="text-[10px] text-amber-500/60 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
            Experimental
          </span>
        </div>
      </div>

      {/* Stats grid - muted styling */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/40 font-medium block mb-0.5">
              Total Listings
            </span>
            <span className="text-[16px] font-medium text-white/70">
              {data.totalListings.toLocaleString()}
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/40 font-medium block mb-0.5">
              Floor Price
            </span>
            <span className="text-[16px] font-medium text-white/70">
              {data.floorPrice > 0 ? `${data.floorPrice.toFixed(2)} GUN` : '—'}
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/40 font-medium block mb-0.5">
              24h Volume
            </span>
            <span className="text-[16px] font-medium text-white/70">
              ${data.volume24h.toLocaleString()}
            </span>
          </div>

          {data.liveMints !== undefined && (
            <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
              <span className="text-[11px] tracking-[0.12em] uppercase text-white/40 font-medium block mb-0.5">
                Live Mints
              </span>
              <span className="text-[16px] font-medium text-white/70">
                {data.liveMints.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Data notice - very subtle */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/30">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Data may be delayed. Source: In-game marketplace API.</span>
        </div>
      </div>
    </div>
  );
}
