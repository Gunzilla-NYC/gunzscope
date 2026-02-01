'use client';

import { useMemo, useState, useRef, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface WaffleCollection {
  name: string;
  percentOfNfts: number;
  color: string;
  valueUsd: number;
  count: number;
}

interface WaffleChartProps {
  gunPercent: number;
  nftPercent: number;
  gunValueUsd?: number;
  nftValueUsd?: number;
  nftCount?: number;
  collections?: WaffleCollection[]; // Optional, for future use
  size?: number;
  showLegend?: boolean;
  className?: string;
}

interface CellData {
  type: 'gun' | 'nft' | 'empty';
  color: string;
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
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const GUN_COLOR = '#64ffff';
const NFT_COLOR = '#96aaff';

// =============================================================================
// Component
// =============================================================================

export default function WaffleChart({
  gunPercent,
  nftPercent,
  gunValueUsd = 0,
  nftValueUsd = 0,
  nftCount,
  collections = [],
  size = 160,
  showLegend = false,
  className = '',
}: WaffleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  // Calculate total NFT count from collections if not provided directly
  const totalNftCount = nftCount ?? collections.reduce((sum, c) => sum + c.count, 0);

  // Calculate cell assignments - simplified to just GUN and NFT colors
  const cells = useMemo(() => {
    const result: CellData[] = [];

    // GUN cells (rounded)
    const gunCells = Math.round(gunPercent);
    for (let i = 0; i < gunCells && result.length < TOTAL_CELLS; i++) {
      result.push({ type: 'gun', color: GUN_COLOR });
    }

    // NFT cells - all same color
    const nftCells = Math.round(nftPercent);
    for (let i = 0; i < nftCells && result.length < TOTAL_CELLS; i++) {
      result.push({ type: 'nft', color: NFT_COLOR });
    }

    // Empty cells
    while (result.length < TOTAL_CELLS) {
      result.push({ type: 'empty', color: 'transparent' });
    }

    return result;
  }, [gunPercent, nftPercent]);

  // Tooltip handlers
  const handleCellHover = (
    e: React.MouseEvent,
    cell: CellData
  ) => {
    if (cell.type === 'empty') {
      setTooltip(prev => ({ ...prev, visible: false, content: null }));
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - 50;

    if (cell.type === 'gun') {
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
          count: totalNftCount > 0 ? totalNftCount : undefined,
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

  // Close tooltip on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [tooltip.visible]);

  return (
    <div className={`${className}`} ref={containerRef}>
      {/* Waffle Grid */}
      <div
        data-testid="waffle-grid"
        className="grid relative"
        style={{
          width: size,
          height: size,
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: 2,
        }}
      >
        {cells.map((cell, idx) => (
          <div
            key={idx}
            data-testid={`waffle-cell-${cell.type}`}
            className="rounded-sm transition-all duration-200 hover:scale-110 hover:z-10 cursor-pointer waffle-cell-animated"
            style={{
              backgroundColor: cell.type === 'empty' ? 'rgba(255,255,255,0.05)' : cell.color,
              aspectRatio: '1',
              animationDelay: `${idx * 8}ms`,
            }}
            onMouseEnter={(e) => handleCellHover(e, cell)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        ))}

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
              {tooltip.content.count !== undefined && (
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

      {/* Legend - simplified to just GUN and NFTs */}
      {showLegend && (
        <div data-testid="waffle-legend" className="mt-3 space-y-1.5">
          {/* GUN legend item */}
          {gunPercent > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: GUN_COLOR }} />
              <span className="text-[11px] text-white/70">GUN</span>
              <span className="text-[10px] text-white/40 ml-auto">{gunPercent.toFixed(0)}%</span>
            </div>
          )}

          {/* NFT legend item */}
          {nftPercent > 0 && (
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
