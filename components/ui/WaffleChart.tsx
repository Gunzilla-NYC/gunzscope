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
  collections: WaffleCollection[];
  size?: number;
  showLegend?: boolean;
  className?: string;
}

interface CellData {
  type: 'gun' | 'nft' | 'empty';
  collection?: string;
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

// Color palette for collections (up to 8 distinct colors)
const COLLECTION_COLORS = [
  '#96aaff', // Primary purple (NFT default)
  '#c4b5fd', // Violet
  '#f0abfc', // Fuchsia
  '#f9a8d4', // Pink
  '#a5b4fc', // Indigo
  '#93c5fd', // Blue
  '#7dd3fc', // Sky
  '#5eead4', // Teal
];

// =============================================================================
// Component
// =============================================================================

export default function WaffleChart({
  gunPercent,
  nftPercent,
  gunValueUsd = 0,
  nftValueUsd = 0,
  collections,
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

  // Calculate cell assignments
  const cells = useMemo(() => {
    const result: CellData[] = [];

    // GUN cells (rounded)
    const gunCells = Math.round(gunPercent);
    for (let i = 0; i < gunCells && result.length < TOTAL_CELLS; i++) {
      result.push({ type: 'gun', color: GUN_COLOR });
    }

    // NFT cells distributed by collection
    const nftCells = Math.round(nftPercent);
    if (nftCells > 0 && collections.length > 0) {
      // Distribute NFT cells proportionally across collections
      let remainingNftCells = nftCells;

      // First pass: allocate cells to each collection
      const collectionCells: Array<{ name: string; color: string; cells: number }> = [];

      collections.forEach((coll, idx) => {
        const collCells = Math.round((coll.percentOfNfts / 100) * nftCells);
        collectionCells.push({
          name: coll.name,
          color: coll.color || COLLECTION_COLORS[idx % COLLECTION_COLORS.length],
          cells: collCells,
        });
      });

      // Adjust for rounding errors - ensure total matches nftCells
      const totalAllocated = collectionCells.reduce((sum, c) => sum + c.cells, 0);
      if (totalAllocated !== nftCells && collectionCells.length > 0) {
        // Add or remove from the largest collection
        collectionCells[0].cells += nftCells - totalAllocated;
      }

      // Add cells for each collection
      for (const coll of collectionCells) {
        for (let i = 0; i < coll.cells && result.length < TOTAL_CELLS; i++) {
          result.push({
            type: 'nft',
            collection: coll.name,
            color: coll.color,
          });
          remainingNftCells--;
        }
      }

      // Fill any remaining NFT cells with default color
      for (let i = 0; i < remainingNftCells && result.length < TOTAL_CELLS; i++) {
        result.push({ type: 'nft', color: COLLECTION_COLORS[0] });
      }
    } else {
      // No collections, just fill with default NFT color
      for (let i = 0; i < nftCells && result.length < TOTAL_CELLS; i++) {
        result.push({ type: 'nft', color: COLLECTION_COLORS[0] });
      }
    }

    // Empty cells
    while (result.length < TOTAL_CELLS) {
      result.push({ type: 'empty', color: 'transparent' });
    }

    return result;
  }, [gunPercent, nftPercent, collections]);

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
      const coll = collections.find(c => c.name === cell.collection);
      setTooltip({
        visible: true,
        x,
        y,
        content: {
          type: 'nft',
          label: coll?.name || 'NFTs',
          valueUsd: coll?.valueUsd || nftValueUsd,
          percent: coll ? (coll.percentOfNfts / 100) * nftPercent : nftPercent,
          count: coll?.count,
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
            data-testid={`waffle-cell-${cell.type}${cell.collection ? `-${cell.collection}` : ''}`}
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

      {/* Legend */}
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

          {/* Collection legend items (max 5) */}
          {collections.slice(0, 5).map((coll, idx) => (
            <div key={coll.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: coll.color || COLLECTION_COLORS[idx % COLLECTION_COLORS.length] }}
              />
              <span className="text-[11px] text-white/70 truncate max-w-[100px]">{coll.name}</span>
              <span className="text-[10px] text-white/40 ml-auto">
                {((coll.percentOfNfts / 100) * nftPercent).toFixed(0)}%
              </span>
            </div>
          ))}

          {/* "+N more" if more than 5 collections */}
          {collections.length > 5 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-white/20" />
              <span className="text-[11px] text-white/50 italic">
                +{collections.length - 5} more
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
