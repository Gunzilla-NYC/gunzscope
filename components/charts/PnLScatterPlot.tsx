'use client';

import { useState, useMemo, useRef } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleSqrt } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { NFT } from '@/lib/types';
import { chartTheme } from './theme';
import { useProximityLock, LockPoint } from './useProximityLock';
import { useGrabScroll } from './useGrabScroll';

interface PnLScatterPlotProps {
  nfts: NFT[];
  gunPrice?: number;
  /** When true, renders only the chart body (no header, no border, always visible). */
  embedded?: boolean;
  /** Zoom level (1 = 100%, 2 = 200% width). Only used in embedded mode. */
  zoomLevel?: number;
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

const MARGIN = { top: 20, right: 20, bottom: 38, left: 58 };
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
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Build lock-on points from data (in group coordinate space)
  const lockPoints: LockPoint[] = useMemo(
    () => data.map(d => ({ id: d.id, x: xScale(d.cost), y: yScale(d.floor) })),
    [data, xScale, yScale],
  );

  const { lockedId, lockedPoint, handleMouseMove, handleMouseLeave } = useProximityLock(
    lockPoints,
    svgRef,
    { left: MARGIN.left, top: MARGIN.top },
    40,
  );

  // Lookup the locked datum for tooltip
  const lockedDatum = useMemo(
    () => lockedId ? data.find(d => d.id === lockedId) ?? null : null,
    [lockedId, data],
  );

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: lockedId ? 'crosshair' : 'default' }}
      >
        <defs>
          <style>{`
            @keyframes scatter-scan-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes scatter-lock-pulse { 0% { r: 0; opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0.5; } }
          `}</style>
          {/* Glow filter for locked dots */}
          <filter id="scatter-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Zone radial gradients */}
          <radialGradient id="zone-profit-glow" cx="15%" cy="15%" r="85%">
            <stop offset="0%" stopColor={chartTheme.colors.profit} stopOpacity={0.04} />
            <stop offset="100%" stopColor={chartTheme.colors.profit} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="zone-loss-glow" cx="85%" cy="85%" r="85%">
            <stop offset="0%" stopColor={chartTheme.colors.loss} stopOpacity={0.04} />
            <stop offset="100%" stopColor={chartTheme.colors.loss} stopOpacity={0} />
          </radialGradient>
          {/* Break-even line gradient — brighter at center */}
          <linearGradient id="breakeven-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity={0.04} />
            <stop offset="50%" stopColor="white" stopOpacity={0.15} />
            <stop offset="100%" stopColor="white" stopOpacity={0.04} />
          </linearGradient>
          {/* Dot inner highlight gradient */}
          <radialGradient id="dot-highlight-profit" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartTheme.colors.profit} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="dot-highlight-loss" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartTheme.colors.loss} stopOpacity={0} />
          </radialGradient>
        </defs>

        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Profit zone (above diagonal) — radial glow from top-left */}
          <polygon
            points={`0,0 ${innerWidth},0 0,${innerHeight}`}
            fill="url(#zone-profit-glow)"
          />
          {/* Loss zone (below diagonal) — radial glow from bottom-right */}
          <polygon
            points={`0,${innerHeight} ${innerWidth},0 ${innerWidth},${innerHeight}`}
            fill="url(#zone-loss-glow)"
          />

          {/* Grid */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            tickValues={tickValues}
            stroke={chartTheme.colors.gridStrong}
          />
          <GridColumns
            scale={xScale}
            height={innerHeight}
            tickValues={tickValues}
            stroke={chartTheme.colors.gridStrong}
          />

          {/* Break-even diagonal */}
          <Line
            from={{ x: xScale(0), y: yScale(0) }}
            to={{ x: xScale(maxVal), y: yScale(maxVal) }}
            stroke="url(#breakeven-gradient)"
            strokeWidth={1}
            strokeDasharray="8 5"
          />
          {/* Break-even label at midpoint */}
          <text
            x={xScale(maxVal * 0.45)}
            y={yScale(maxVal * 0.45) - 6}
            fill="rgba(255,255,255,0.18)"
            fontSize={8}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="middle"
            letterSpacing="0.15em"
            transform={`rotate(-${Math.atan(innerHeight / innerWidth) * (180 / Math.PI)}, ${xScale(maxVal * 0.45)}, ${yScale(maxVal * 0.45) - 6})`}
          >
            BREAK EVEN
          </text>

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
            const isLocked = lockedId === d.id;
            const r = sizeScale(d.quantity);
            const color = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;
            const highlightId = isProfit ? 'dot-highlight-profit' : 'dot-highlight-loss';

            return (
              <g key={d.id}>
                {/* Outer ambient glow */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLocked ? r + 10 : r + 4}
                  fill={color}
                  fillOpacity={isLocked ? 0.15 : 0.06}
                  pointerEvents="none"
                  style={{ transition: 'r 250ms ease, fill-opacity 250ms ease' }}
                />
                {/* Main dot */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isLocked ? r + 2 : r}
                  fill={color}
                  fillOpacity={isLocked ? 0.95 : 0.7}
                  stroke={isLocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={isLocked ? 1.5 : 0.5}
                  filter={isLocked ? 'url(#scatter-glow)' : undefined}
                  pointerEvents="none"
                  style={{ transition: 'all 250ms ease' }}
                />
                {/* Inner highlight for depth */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLocked ? r + 1 : r - 1}
                  fill={`url(#${highlightId})`}
                  fillOpacity={isLocked ? 0.4 : 0.2}
                  pointerEvents="none"
                  style={{ transition: 'all 250ms ease' }}
                />
              </g>
            );
          })}

          {/* HUD lock-on overlay — rendered above all dots */}
          {lockedId && lockedPoint && lockedDatum && (() => {
            const isProfit = lockedDatum.floor >= lockedDatum.cost;
            const color = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;
            const r = sizeScale(lockedDatum.quantity);
            return (
              <g pointerEvents="none">
                {/* Crosshair guide lines to axes */}
                <line
                  x1={lockedPoint.x}
                  y1={lockedPoint.y}
                  x2={lockedPoint.x}
                  y2={innerHeight}
                  stroke={color}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <line
                  x1={lockedPoint.x}
                  y1={lockedPoint.y}
                  x2={0}
                  y2={lockedPoint.y}
                  stroke={color}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {/* Scanning ring — dashed, slowly rotates */}
                <circle
                  cx={lockedPoint.x}
                  cy={lockedPoint.y}
                  r={r + 16}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.3}
                  strokeWidth={1}
                  strokeDasharray="4 6"
                  style={{ transformOrigin: `${lockedPoint.x}px ${lockedPoint.y}px`, animation: 'scatter-scan-spin 4s linear infinite' }}
                />
                {/* Lock ring — solid, pulses on acquire */}
                <circle
                  cx={lockedPoint.x}
                  cy={lockedPoint.y}
                  r={r + 10}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  style={{ animation: 'scatter-lock-pulse 600ms ease-out' }}
                />
              </g>
            );
          })()}

          {/* Axes */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            tickValues={tickValues}
            tickFormat={(v) => formatGun(v as number)}
            stroke={chartTheme.colors.axis}
            tickStroke={chartTheme.colors.axis}
            tickLabelProps={{
              fill: chartTheme.colors.axisLabel,
              fontSize: 10,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
            label="COST (GUN)"
            labelProps={{
              fill: 'rgba(255,255,255,0.3)',
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
              letterSpacing: '0.15em',
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
              fill: chartTheme.colors.axisLabel,
              fontSize: 10,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'end' as const,
              dx: -6,
            }}
            label="VALUE (GUN)"
            labelProps={{
              fill: 'rgba(255,255,255,0.3)',
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
              letterSpacing: '0.15em',
            }}
            labelOffset={40}
          />
        </Group>
      </svg>

      {/* Data strip — fixed at top-right of chart, no floating tooltip */}
      {lockedDatum && (() => {
        const pnl = lockedDatum.floor - lockedDatum.cost;
        const pnlPct = lockedDatum.cost > 0 ? (pnl / lockedDatum.cost) * 100 : 0;
        const isProfit = pnl >= 0;
        const accentColor = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;
        return (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'rgba(10,10,10,0.92)',
              borderLeft: `2px solid ${accentColor}40`,
              borderBottom: `1px solid ${accentColor}20`,
              color: 'white',
              fontFamily: chartTheme.fonts.mono,
              fontSize: '11px',
              lineHeight: '1.4',
              pointerEvents: 'none',
              zIndex: 10,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lockedDatum.name}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
              Cost {formatGun(lockedDatum.cost)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
              Val {formatGun(lockedDatum.floor)}
            </span>
            <span
              style={{
                color: accentColor,
                fontWeight: 700,
                fontSize: 11,
                padding: '1px 6px',
                background: isProfit ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
              }}
            >
              {isProfit ? '+' : ''}{pnlPct.toFixed(1)}%
            </span>
          </div>
        );
      })()}
    </div>
  );
}

export default function PnLScatterPlot({ nfts, gunPrice, embedded, zoomLevel = 1 }: PnLScatterPlotProps) {
  const [expanded, setExpanded] = useState(false);
  const grabScrollRef = useGrabScroll(zoomLevel > 1);

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

  const chartHeight = Math.round(CHART_HEIGHT * Math.min(zoomLevel, 1.5));

  // Embedded mode: render chart body only (no header, no collapsible)
  const chartBody = (
    <div className="px-4 pb-3">
      {hasChartData ? (
        <>
          <div
            ref={grabScrollRef}
            className="overflow-x-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            <div style={{ width: `${100 * zoomLevel}%`, minWidth: '100%' }}>
              <ParentSize debounceTime={100}>
                {({ width }: { width: number }) =>
                  width > 0 ? (
                    <ScatterChart data={scatterData} width={width} height={chartHeight} />
                  ) : null
                }
              </ParentSize>
            </div>
          </div>
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
  );

  if (embedded) return chartBody;

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
      {expanded && chartBody}
    </div>
  );
}
