'use client';

import { useMemo, useState, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

interface CompositionChartProps {
  gunPercent: number;
  nftPercent: number;
  gunValueUsd?: number;
  nftValueUsd?: number;
  nftCount?: number;
  size?: number;
  showLegend?: boolean;
  className?: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: {
    type: 'gun' | 'nft';
    label: string;
    valueUsd: number;
    percent: number;
    count?: number;
  } | null;
}

// =============================================================================
// Constants
// =============================================================================

const GUN_COLOR = '#64ffff';
const NFT_COLOR = '#96aaff';

// =============================================================================
// Component (exported as WaffleChart for backwards compatibility)
// =============================================================================

export default function WaffleChart({
  gunPercent,
  nftPercent,
  gunValueUsd = 0,
  nftValueUsd = 0,
  nftCount,
  size = 160,
  showLegend = false,
  className = '',
}: CompositionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  // Normalize percentages to ensure they sum to 100 (or less)
  const { normalizedGun, normalizedNft } = useMemo(() => {
    const total = gunPercent + nftPercent;
    if (total === 0) return { normalizedGun: 0, normalizedNft: 0 };
    if (total <= 100) return { normalizedGun: gunPercent, normalizedNft: nftPercent };
    // Scale down if over 100
    const scale = 100 / total;
    return { normalizedGun: gunPercent * scale, normalizedNft: nftPercent * scale };
  }, [gunPercent, nftPercent]);

  const handleBlockHover = (
    e: React.MouseEvent,
    type: 'gun' | 'nft'
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = -50;

    if (type === 'gun') {
      setTooltip({
        visible: true,
        x,
        y,
        content: {
          type: 'gun',
          label: 'GUN Tokens',
          valueUsd: gunValueUsd,
          percent: gunPercent,
        },
      });
    } else {
      setTooltip({
        visible: true,
        x,
        y,
        content: {
          type: 'nft',
          label: 'NFT Holdings',
          valueUsd: nftValueUsd,
          percent: nftPercent,
          count: nftCount,
        },
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip.visible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip(prev => ({
        ...prev,
        x: e.clientX - rect.left,
      }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false, content: null }));
  };

  // Empty state
  if (normalizedGun === 0 && normalizedNft === 0) {
    return (
      <div className={className}>
        <div
          data-testid="waffle-grid"
          className="rounded-lg overflow-hidden"
          style={{ width: size, height: size }}
        >
          <div
            data-testid="waffle-cell-empty"
            className="w-full h-full bg-white/5 flex items-center justify-center"
          >
            <span className="text-xs text-white/30">No data</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} ref={containerRef}>
      {/* Composition Square - Two blocks */}
      <div
        data-testid="waffle-grid"
        className="rounded-lg overflow-hidden relative"
        style={{ width: size, height: size }}
      >
        {/* Vertical split layout */}
        <div className="w-full h-full flex flex-col">
          {/* GUN Block (top) */}
          {normalizedGun > 0 && (
            <div
              data-testid="waffle-cell-gun"
              className="w-full transition-all duration-300 cursor-pointer hover:brightness-110 flex items-center justify-center"
              style={{
                height: `${normalizedGun}%`,
                backgroundColor: GUN_COLOR,
                minHeight: normalizedGun > 0 ? '20px' : 0,
              }}
              onMouseEnter={(e) => handleBlockHover(e, 'gun')}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {normalizedGun >= 15 && (
                <span className="text-black/70 text-xs font-medium">
                  {normalizedGun.toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {/* NFT Block (bottom) */}
          {normalizedNft > 0 && (
            <div
              data-testid="waffle-cell-nft"
              className="w-full transition-all duration-300 cursor-pointer hover:brightness-110 flex items-center justify-center"
              style={{
                height: `${normalizedNft}%`,
                backgroundColor: NFT_COLOR,
                minHeight: normalizedNft > 0 ? '20px' : 0,
              }}
              onMouseEnter={(e) => handleBlockHover(e, 'nft')}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {normalizedNft >= 15 && (
                <span className="text-black/70 text-xs font-medium">
                  {normalizedNft.toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tooltip */}
        {tooltip.visible && tooltip.content && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-black/95 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
              <div className="font-medium text-white mb-1">
                {tooltip.content.label}
              </div>
              <div className="text-white/70">
                ${tooltip.content.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-white/50 ml-1">({tooltip.content.percent.toFixed(1)}%)</span>
              </div>
              {tooltip.content.count !== undefined && tooltip.content.count > 0 && (
                <div className="text-white/50 text-[10px] mt-0.5">
                  {tooltip.content.count} {tooltip.content.count === 1 ? 'item' : 'items'}
                </div>
              )}
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"
              style={{ bottom: -4 }}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div data-testid="waffle-legend" className="mt-3 space-y-1.5">
          {normalizedGun > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: GUN_COLOR }} />
              <span className="text-[11px] text-white/70">GUN</span>
              <span className="text-[10px] text-white/40 ml-auto">{gunPercent.toFixed(0)}%</span>
            </div>
          )}
          {normalizedNft > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: NFT_COLOR }} />
              <span className="text-[11px] text-white/70">NFTs</span>
              <span className="text-[10px] text-white/40 ml-auto">{nftPercent.toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export types for backwards compatibility
export type { CompositionChartProps as WaffleChartProps };
export interface WaffleCollection {
  name: string;
  percentOfNfts: number;
  color: string;
  valueUsd: number;
  count: number;
}
