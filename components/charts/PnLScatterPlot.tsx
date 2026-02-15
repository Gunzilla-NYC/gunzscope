'use client';

import { useState, useCallback, useMemo } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleSqrt } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
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
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } =
    useTooltip<ScatterDatum>();

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
    (d: ScatterDatum, cx: number, cy: number) => {
      setHoveredId(d.id);
      showTooltip({
        tooltipData: d,
        tooltipLeft: cx + MARGIN.left,
        tooltipTop: cy + MARGIN.top,
      });
    },
    [showTooltip],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    hideTooltip();
  }, [hideTooltip]);

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
                  onMouseEnter={() => handleMouseEnter(d, cx, cy)}
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

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (() => {
        const pnl = tooltipData.floor - tooltipData.cost;
        const pnlPct = tooltipData.cost > 0 ? (pnl / tooltipData.cost) * 100 : 0;
        const isProfit = pnl >= 0;
        return (
          <TooltipWithBounds
            left={tooltipLeft}
            top={tooltipTop}
            style={{
              background: 'rgba(14,14,14,0.96)',
              border: `1px solid ${isProfit ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,68,0.15)'}`,
              color: 'white',
              padding: '10px 12px',
              fontFamily: chartTheme.fonts.mono,
              fontSize: '10px',
              lineHeight: '1.6',
              pointerEvents: 'none',
              zIndex: 30,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 11, letterSpacing: '0.02em' }}>
              {tooltipData.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 1, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tooltipData.collection}
              {tooltipData.quantity > 1 && <span> &times;{tooltipData.quantity}</span>}
              <span style={{ marginLeft: 6 }}>{tooltipData.venue.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Cost <span style={{ color: 'rgba(255,255,255,0.8)' }}>{formatGun(tooltipData.cost)}</span></span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Value <span style={{ color: 'rgba(255,255,255,0.8)' }}>{formatGun(tooltipData.floor)}</span></span>
            </div>
            <div style={{
              padding: '3px 8px',
              display: 'inline-block',
              background: isProfit ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.08)',
              color: isProfit ? chartTheme.colors.profit : chartTheme.colors.loss,
              fontWeight: 600,
              fontSize: 11,
            }}>
              {isProfit ? '+' : ''}{pnlPct.toFixed(1)}%
              <span style={{ fontWeight: 400, fontSize: 9, marginLeft: 6, opacity: 0.6 }}>
                {isProfit ? '+' : ''}{formatGun(pnl)} GUN
              </span>
            </div>
          </TooltipWithBounds>
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
