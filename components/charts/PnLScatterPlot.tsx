'use client';

import { useState, useCallback, useMemo } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleLinear, scaleSqrt } from '@visx/scale';
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

const MARGIN = { top: 16, right: 16, bottom: 32, left: 48 };
const CHART_HEIGHT = 200;

function formatGun(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (val >= 100) return val.toFixed(0);
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
    return m * 1.1 || 100; // 10% padding
  }, [data]);

  const xScale = useMemo(
    () => scaleLinear<number>({ domain: [0, maxVal], range: [0, innerWidth], nice: true }),
    [maxVal, innerWidth],
  );

  const yScale = useMemo(
    () => scaleLinear<number>({ domain: [0, maxVal], range: [innerHeight, 0], nice: true }),
    [maxVal, innerHeight],
  );

  const sizeScale = useMemo(
    () => scaleSqrt<number>({ domain: [1, Math.max(5, ...data.map(d => d.quantity))], range: [4, 14] }),
    [data],
  );

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
        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Grid */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            numTicks={4}
            stroke={chartTheme.colors.grid}
          />
          <GridColumns
            scale={xScale}
            height={innerHeight}
            numTicks={4}
            stroke={chartTheme.colors.grid}
          />

          {/* Break-even diagonal */}
          <Line
            from={{ x: xScale(0), y: yScale(0) }}
            to={{ x: xScale(maxVal), y: yScale(maxVal) }}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            strokeDasharray="6 4"
          />

          {/* Profit zone label */}
          <text
            x={xScale(maxVal * 0.15)}
            y={yScale(maxVal * 0.55)}
            fill={chartTheme.colors.profit}
            fillOpacity={0.15}
            fontSize={10}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="start"
          >
            PROFIT
          </text>

          {/* Loss zone label */}
          <text
            x={xScale(maxVal * 0.55)}
            y={yScale(maxVal * 0.15)}
            fill={chartTheme.colors.loss}
            fillOpacity={0.15}
            fontSize={10}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="start"
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

            return (
              <Circle
                key={d.id}
                cx={cx}
                cy={cy}
                r={isHovered ? r + 2 : r}
                fill={isProfit ? chartTheme.colors.profit : chartTheme.colors.loss}
                fillOpacity={isHovered ? 0.9 : 0.6}
                stroke={isHovered ? 'white' : 'none'}
                strokeWidth={isHovered ? 1.5 : 0}
                style={{ cursor: 'pointer', transition: 'r 150ms, fill-opacity 150ms' }}
                onMouseEnter={() => handleMouseEnter(d, cx, cy)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Axes */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            numTicks={4}
            tickFormat={(v) => formatGun(v as number)}
            stroke={chartTheme.colors.axis}
            tickStroke={chartTheme.colors.axis}
            tickLabelProps={{
              fill: chartTheme.colors.text,
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
            label="Cost (GUN)"
            labelProps={{
              fill: chartTheme.colors.text,
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
            labelOffset={14}
          />

          <AxisLeft
            scale={yScale}
            numTicks={4}
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
            label="Floor (GUN)"
            labelProps={{
              fill: chartTheme.colors.text,
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
            labelOffset={32}
          />
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            background: 'rgba(22,22,22,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            padding: '8px 10px',
            fontFamily: chartTheme.fonts.mono,
            fontSize: '10px',
            lineHeight: '1.5',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 11 }}>
            {tooltipData.name}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>
            {tooltipData.collection}
            {tooltipData.quantity > 1 && <span> &times; {tooltipData.quantity}</span>}
          </div>
          <div style={{ marginTop: 4, display: 'flex', gap: 12 }}>
            <span>Cost: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{tooltipData.cost.toFixed(1)} GUN</span></span>
            <span>Floor: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{tooltipData.floor.toFixed(1)} GUN</span></span>
          </div>
          <div style={{
            marginTop: 2,
            color: tooltipData.floor >= tooltipData.cost ? chartTheme.colors.profit : chartTheme.colors.loss,
            fontWeight: 600,
          }}>
            {tooltipData.floor >= tooltipData.cost ? '+' : ''}
            {(((tooltipData.floor - tooltipData.cost) / tooltipData.cost) * 100).toFixed(1)}% P&L
          </div>
          <div style={{ marginTop: 2, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontSize: 8, letterSpacing: '0.05em' }}>
            {tooltipData.venue.replace(/_/g, ' ')}
          </div>
        </TooltipWithBounds>
      )}
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
      {/* Header (always visible, clickable) */}
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
        <span className="ml-auto flex items-center gap-1.5">
          {hasChartData ? (
            <>
              <span className="font-mono text-micro text-[var(--gs-profit)] tabular-nums">{stats.profitable} {'\u25B2'}</span>
              <span className="font-mono text-micro text-[var(--gs-loss)] tabular-nums">{stats.losing} {'\u25BC'}</span>
            </>
          ) : (
            <span className="font-mono text-micro text-[var(--gs-gray-3)]">needs floor prices</span>
          )}
          <span className="font-mono text-micro text-[var(--gs-gray-3)] ml-1">
            {expanded ? '\u25B4' : '\u25BE'}
          </span>
        </span>
      </button>

      {/* Chart (expanded only) */}
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
                <p className="font-mono text-micro text-[var(--gs-gray-2)] text-center mt-1">
                  Value = per&#8209;item listing or collection floor &middot; 1 GUN = ${gunPrice.toFixed(4)}
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-caption text-[var(--gs-gray-3)] text-center py-4">
              {withCostOnly > 0
                ? `${withCostOnly} NFTs have cost data but no floor price yet`
                : 'Need at least 2 NFTs with both cost and floor price'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
