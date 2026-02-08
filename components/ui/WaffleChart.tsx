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
  isLoading?: boolean;
  // Cost basis & P/L
  gunCostBasis?: number | null;
  nftCostBasis?: number | null;
  gunPnl?: number | null;
  nftPnl?: number | null;
  // Total GUN spent on NFTs
  totalGunSpent?: number;
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

const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE; // 100 cells = 100%
const GUN_COLOR = '#A6F700'; // var(--gs-lime)
const NFT_COLOR = '#6D5BFF'; // var(--gs-purple)

// =============================================================================
// Component
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
  isLoading = false,
  gunCostBasis,
  nftCostBasis,
  gunPnl,
  nftPnl,
  totalGunSpent,
}: CompositionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  // Calculate cell assignments - each cell = 1%
  const { gunCells, nftCells, cells } = useMemo(() => {
    // Round to whole cells (each cell = 1%)
    const gun = Math.round(gunPercent);
    const nft = Math.round(nftPercent);

    // Build cell array
    const cellArray: Array<'gun' | 'nft' | 'empty'> = [];

    for (let i = 0; i < gun && cellArray.length < TOTAL_CELLS; i++) {
      cellArray.push('gun');
    }
    for (let i = 0; i < nft && cellArray.length < TOTAL_CELLS; i++) {
      cellArray.push('nft');
    }
    while (cellArray.length < TOTAL_CELLS) {
      cellArray.push('empty');
    }

    return { gunCells: gun, nftCells: nft, cells: cellArray };
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

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div
          data-testid="waffle-grid"
          className="rounded-lg overflow-hidden"
          style={{ width: size, height: size }}
        >
          <div
            data-testid="waffle-loading"
            className="w-full h-full bg-white/5 animate-pulse flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-white/20 border-t-[var(--gs-lime)] rounded-full animate-spin" />
              <span className="text-caption text-white/40 font-mono">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (gunCells === 0 && nftCells === 0) {
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
      {/* Grid - seamless NFT cells, bordered GUN cells */}
      <div
        data-testid="waffle-grid"
        className="overflow-hidden relative"
        style={{
          width: size,
          height: size,
          borderRadius: '0.1rem',
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        }}
      >
        {cells.map((cellType, idx) => {
          const isGun = cellType === 'gun';
          const isNft = cellType === 'nft';
          const isEmpty = cellType === 'empty';

          // Calculate adjacency for NFT cells next to GUN
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          const leftNeighborIdx = col > 0 ? idx - 1 : -1;
          const topNeighborIdx = row > 0 ? idx - GRID_SIZE : -1;

          // Check adjacency for boundary detection
          const isLeftEdge = col === 0;
          const isRightEdge = col === GRID_SIZE - 1;
          const rightNeighborIdx = col < GRID_SIZE - 1 ? idx + 1 : -1;
          const bottomNeighborIdx = row < GRID_SIZE - 1 ? idx + GRID_SIZE : -1;

          const hasGunToLeft = leftNeighborIdx >= 0 && cells[leftNeighborIdx] === 'gun';
          const hasGunAbove = topNeighborIdx >= 0 && cells[topNeighborIdx] === 'gun';
          const hasNftToRight = rightNeighborIdx >= 0 && cells[rightNeighborIdx] === 'nft';
          const hasNftBelow = bottomNeighborIdx >= 0 && cells[bottomNeighborIdx] === 'nft';

          let borderRadius = '0';

          // Only round GUN (teal) cell corners - NFT stays sharp for clean fit
          if (isGun) {
            const hasGunToRight = rightNeighborIdx >= 0 && cells[rightNeighborIdx] === 'gun';
            const hasGunBelow = bottomNeighborIdx >= 0 && cells[bottomNeighborIdx] === 'gun';

            // Determine which corners of this GUN cell touch NFT
            const nftToRight = hasNftToRight;
            const nftBelow = hasNftBelow;
            const nftAtBottomRight = !hasGunToRight && !hasGunBelow && (nftToRight || nftBelow);

            // Bottom-right corner: NFT is to right AND/OR below (L-corner or step)
            if (nftToRight && nftBelow) {
              borderRadius = '0 0 0.1rem 0'; // bottom-right only
            }
            // Right edge with NFT below
            else if (isRightEdge && nftBelow) {
              borderRadius = '0 0 0.1rem 0'; // bottom-right
            }
            // Left edge with NFT below (bottom-left corner)
            else if (isLeftEdge && nftBelow) {
              borderRadius = '0 0 0 0.1rem'; // bottom-left
            }
          }

          // Margin creates separation at the boundary
          let cellMargin = '0';
          if (isNft && (hasGunToLeft || hasGunAbove)) {
            const mt = hasGunAbove ? '1px' : '0';
            const ml = hasGunToLeft ? '1px' : '0';
            cellMargin = `${mt} 0 0 ${ml}`;
          }

          return (
            <div
              key={idx}
              data-testid={`waffle-cell-${cellType}`}
              className="transition-opacity duration-200"
              style={{
                backgroundColor: isGun ? GUN_COLOR : isNft ? NFT_COLOR : 'rgba(255,255,255,0.05)',
                borderRadius: borderRadius,
                margin: cellMargin,
                opacity: 0,
                animation: `nft-card-fade-in 300ms ease-out ${idx * 10}ms forwards`,
              }}
              onMouseEnter={(e) => {
                if (!isEmpty) handleBlockHover(e, cellType as 'gun' | 'nft');
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}


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
                <div className="text-white/50 text-caption mt-0.5">
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
        <div data-testid="waffle-legend" className="mt-3 space-y-2">
          {gunCells > 0 && (
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5" style={{ backgroundColor: GUN_COLOR }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-data text-white/70">GUN</span>
                  <span className="text-caption text-white/40">{gunPercent.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {gunValueUsd > 0 && (
                    <span className="text-caption text-white/60">${gunValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                  {gunPnl !== undefined && gunPnl !== null && (
                    <span className={`text-label ${gunPnl >= 0 ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
                      ({gunPnl >= 0 ? '+' : ''}${Math.abs(gunPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {nftCells > 0 && (
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5" style={{ backgroundColor: NFT_COLOR }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-data text-white/70">
                    NFTs{nftCount !== undefined && nftCount > 0 && <span className="text-white/50 ml-1">({nftCount})</span>}
                  </span>
                  <span className="text-caption text-white/40">{nftPercent.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {nftValueUsd > 0 && (
                    <span className="text-caption text-white/60">${nftValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                  {nftPnl !== undefined && nftPnl !== null && (
                    <span className={`text-label ${nftPnl >= 0 ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
                      ({nftPnl >= 0 ? '+' : ''}${Math.abs(nftPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  )}
                </div>
                {totalGunSpent !== undefined && totalGunSpent > 0 && (
                  <div className="text-label text-white/50 mt-0.5">
                    Spent {totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                  </div>
                )}
              </div>
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
