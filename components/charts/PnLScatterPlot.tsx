'use client';

import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Circle, Line } from '@visx/shape';
import { scaleSqrt } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { NFT } from '@/lib/types';
import { chartTheme } from './theme';

interface PnLScatterPlotProps {
  nfts: NFT[];
  gunPrice?: number;
}

interface ScatterDatum {
  id: string;
  name: string;
  cost: number;
  floor: number;
  quantity: number;
  venue: string;
  collection: string;
}

const MARGIN = { top: 20, right: 20, bottom: 38, left: 52 };
const CHART_HEIGHT = 230;

function formatGun(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (val >= 100) return val.toFixed(0);
  if (val >= 10) return val.toFixed(0);
  return val.toFixed(1);
}

function ScatterChart({
  data,
  width,
  height,
}: {
  data: ScatterDatum[];
  width: number;
  height: number;
}) {
  const [tooltip, setTooltip] = useState<{ data: ScatterDatum; x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  // Domain: max of cost and floor so break-even line is diagonal
  const maxVal = useMemo(() => {
    let m = 0;
    for (const d of data) {
      if (d.cost > m) m = d.cost;
      if (d.floor > m) m = d.floor;
    }
    return m * 1.15 || 100;
  }, [data]);

  // sqrt scales — compress high values, give more visual space to small values
  const xScale = useMemo(
    () => scaleSqrt<number>({ domain: [0, maxVal], range: [0, innerWidth] }),
    [maxVal, innerWidth],
  );

  const yScale = useMemo(
    () => scaleSqrt<number>({ domain: [0, maxVal], range: [innerHeight, 0] }),
    [maxVal, innerHeight],
  );

  const sizeScale = useMemo(
    () => scaleSqrt<number>({ domain: [1, Math.max(5, ...data.map(d => d.quantity))], range: [5, 16] }),
    [data],
  );

  // Custom tick values for clean axis labels on sqrt scale
  const tickValues = useMemo(() => {
    const candidates = [0, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000];
    return candidates.filter(v => v <= maxVal * 0.95);
  }, [maxVal]);

  const handleMouseEnter = useCallback(
    (d: ScatterDatum, e: React.MouseEvent) => {
      setHoveredId(d.id);
      setTooltip({ data: d, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <defs>
          {/* Glow filter for hovered dots */}
          <filter id="scatter-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Profit zone (above diagonal) — subtle green tint */}
          <polygon
            points={`0,0 ${innerWidth},0 0,${innerHeight}`}
            fill={chartTheme.colors.profit}
            fillOpacity={0.018}
          />
          {/* Loss zone (below diagonal) — subtle red tint */}
          <polygon
            points={`0,${innerHeight} ${innerWidth},0 ${innerWidth},${innerHeight}`}
            fill={chartTheme.colors.loss}
            fillOpacity={0.018}
          />

          {/* Grid */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            tickValues={tickValues}
            stroke={chartTheme.colors.grid}
          />
          <GridColumns
            scale={xScale}
            height={innerHeight}
            tickValues={tickValues}
            stroke={chartTheme.colors.grid}
          />

          {/* Break-even diagonal */}
          <Line
            from={{ x: xScale(0), y: yScale(0) }}
            to={{ x: xScale(maxVal), y: yScale(maxVal) }}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
            strokeDasharray="8 5"
          />

          {/* Zone labels */}
          <text
            x={innerWidth * 0.06}
            y={innerHeight * 0.18}
            fill={chartTheme.colors.profit}
            fillOpacity={0.12}
            fontSize={9}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="start"
            letterSpacing="0.15em"
          >
            PROFIT
          </text>

          <text
            x={innerWidth * 0.72}
            y={innerHeight * 0.88}
            fill={chartTheme.colors.loss}
            fillOpacity={0.12}
            fontSize={9}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="start"
            letterSpacing="0.15em"
          >
            LOSS
          </text>

          {/* Data dots */}
          {data.map((d) => {
            const cx = xScale(d.cost);
            const cy = yScale(d.floor);
            const isProfit = d.floor >= d.cost;
            const isHovered = hoveredId === d.id;
            const r = sizeScale(d.quantity);
            const color = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;

            return (
              <g key={d.id} style={{ cursor: 'pointer' }}>
                {/* Outer glow ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r + 8 : r + 3}
                  fill={color}
                  fillOpacity={isHovered ? 0.12 : 0.04}
                  style={{ transition: 'r 200ms ease, fill-opacity 200ms ease' }}
                />
                {/* Main dot */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r + 2 : r}
                  fill={color}
                  fillOpacity={isHovered ? 0.95 : 0.65}
                  stroke={isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth={isHovered ? 1.5 : 0.5}
                  filter={isHovered ? 'url(#scatter-glow)' : undefined}
                  style={{ transition: 'all 200ms ease' }}
                  onMouseEnter={(e) => handleMouseEnter(d, e)}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
            );
          })}

          {/* Axes */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            tickValues={tickValues}
            tickFormat={(v) => formatGun(v as number)}
            stroke={chartTheme.colors.axis}
            tickStroke={chartTheme.colors.axis}
            tickLabelProps={{
              fill: chartTheme.colors.text,
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
            label="COST (GUN)"
            labelProps={{
              fill: 'rgba(255,255,255,0.22)',
              fontSize: 8,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
              letterSpacing: '0.12em',
            }}
            labelOffset={18}
          />

          <AxisLeft
            scale={yScale}
            tickValues={tickValues}
            tickFormat={(v) => formatGun(v as number)}
            stroke={chartTheme.colors.axis}
            tickStroke={chartTheme.colors.axis}
            tickLabelProps={{
              fill: chartTheme.colors.text,
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'end' as const,
              dx: -4,
            }}
            label="VALUE (GUN)"
            labelProps={{
              fill: 'rgba(255,255,255,0.22)',
              fontSize: 8,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
              letterSpacing: '0.12em',
            }}
            labelOffset={36}
          />
        </Group>
      </svg>

      {/* Tooltip — portalled to document.body to escape overflow-hidden/clipPath */}
      {tooltip && typeof document !== 'undefined' && (() => {
        const pnl = tooltip.data.floor - tooltip.data.cost;
        const pnlPct = tooltip.data.cost > 0 ? (pnl / tooltip.data.cost) * 100 : 0;
        const isProfit = pnl >= 0;
        const accentColor = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;
        return createPortal(
          <div
            style={{
              position: 'fixed',
              left: tooltip.x + 14,
              top: tooltip.y - 14,
              background: 'rgba(10,10,10,0.97)',
              border: `1px solid ${isProfit ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}`,
              borderLeft: `3px solid ${accentColor}`,
              color: 'white',
              padding: '12px 14px',
              fontFamily: chartTheme.fonts.mono,
              fontSize: '12px',
              lineHeight: '1.5',
              pointerEvents: 'none',
              zIndex: 9999,
              minWidth: 190,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', marginBottom: 4 }}>
              {tooltip.data.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {tooltip.data.collection}
              {tooltip.data.quantity > 1 && <span> &times;{tooltip.data.quantity}</span>}
              <span style={{ marginLeft: 8 }}>{tooltip.data.venue.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Cost</div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{formatGun(tooltip.data.cost)} GUN</div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Value</div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{formatGun(tooltip.data.floor)} GUN</div>
              </div>
            </div>
            <div style={{
              padding: '4px 10px',
              display: 'inline-block',
              background: isProfit ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
              color: accentColor,
              fontWeight: 700,
              fontSize: 13,
            }}>
              {isProfit ? '+' : ''}{pnlPct.toFixed(1)}%
              <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 8, opacity: 0.7 }}>
                {isProfit ? '+' : ''}{formatGun(pnl)} GUN
              </span>
            </div>
          </div>,
          document.body,
        );
      })()}
    </div>
  );
}

export default function PnLScatterPlot({ nfts, gunPrice }: PnLScatterPlotProps) {
  const [expanded, setExpanded] = useState(false);

  const scatterData = useMemo<ScatterDatum[]>(() => {
    return nfts
      .filter(nft => {
        if (nft.purchasePriceGun == null || nft.purchasePriceGun <= 0) return false;
        // Valuation waterfall: listing > comparable sales > rarity floor > collection floor
        const value = nft.currentLowestListing ?? nft.comparableSalesMedian ?? nft.rarityFloor ?? nft.floorPrice;
        return value != null && value > 0;
      })
      .map(nft => ({
        id: nft.tokenId,
        name: nft.name,
        cost: nft.purchasePriceGun!,
        floor: (nft.currentLowestListing ?? nft.comparableSalesMedian ?? nft.rarityFloor ?? nft.floorPrice)!,
        quantity: nft.quantity ?? 1,
        venue: nft.acquisitionVenue ?? 'unknown',
        collection: nft.collection,
      }));
  }, [nfts]);

  // Summary stats
  const stats = useMemo(() => {
    let profitable = 0;
    let losing = 0;
    for (const d of scatterData) {
      if (d.floor >= d.cost) profitable++;
      else losing++;
    }
    return { profitable, losing, total: scatterData.length };
  }, [scatterData]);

  // Count NFTs with cost but no value data (for empty state messaging)
  const withCostOnly = useMemo(() => {
    return nfts.filter(nft => {
      if (nft.purchasePriceGun == null || nft.purchasePriceGun <= 0) return false;
      const value = nft.currentLowestListing ?? nft.comparableSalesMedian ?? nft.rarityFloor ?? nft.floorPrice;
      return !value || value <= 0;
    }).length;
  }, [nfts]);

  const hasChartData = scatterData.length >= 2;

  return (
    <div className="border-t border-white/[0.06]">
      {/* Header */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">
          NFT Cost vs Value
        </p>
        <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 text-[#FF9F43] border border-[#FF9F43]/30 bg-[#FF9F43]/[0.08]">
          Under Active Dev
        </span>
        <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
          {hasChartData ? `${stats.total} items` : `${withCostOnly + scatterData.length} with cost`}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {hasChartData ? (
            <>
              <span className="font-mono text-micro tabular-nums px-1.5 py-0.5 text-[var(--gs-profit)]" style={{ background: 'rgba(0,255,136,0.06)' }}>
                {stats.profitable} {'\u25B2'}
              </span>
              <span className="font-mono text-micro tabular-nums px-1.5 py-0.5 text-[var(--gs-loss)]" style={{ background: 'rgba(255,68,68,0.06)' }}>
                {stats.losing} {'\u25BC'}
              </span>
            </>
          ) : (
            <span className="font-mono text-micro text-[var(--gs-gray-3)]">needs value data</span>
          )}
          <span className="font-mono text-micro text-[var(--gs-gray-3)] ml-1">
            {expanded ? '\u25B4' : '\u25BE'}
          </span>
        </span>
      </button>

      {/* Chart */}
      {expanded && (
        <div className="px-2 pb-3">
          {hasChartData ? (
            <>
              <ParentSize debounceTime={100}>
                {({ width }: { width: number }) =>
                  width > 0 ? (
                    <ScatterChart data={scatterData} width={width} height={CHART_HEIGHT} />
                  ) : null
                }
              </ParentSize>
              {gunPrice && gunPrice > 0 && (
                <p className="font-mono text-micro text-[var(--gs-gray-2)] text-center mt-1.5">
                  Value = listing or estimated market price &middot; 1 GUN = ${gunPrice.toFixed(4)} &middot; sqrt scale
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-caption text-[var(--gs-gray-3)] text-center py-4">
              {withCostOnly > 0
                ? `${withCostOnly} NFTs have cost data but no value estimate yet`
                : 'Need at least 2 NFTs with both cost and value data'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
