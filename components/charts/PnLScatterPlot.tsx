'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleSqrt } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { NFT } from '@/lib/types';
import { chartTheme } from './theme';
import { useProximityLock, LockPoint } from './useProximityLock';
import { useGrabScroll } from './useGrabScroll';
import { RARITY_COLORS } from '@/components/nft-gallery/utils';
import { formatGun, generateSmartTicks, HUD_KEYFRAMES, GlowFilterDef, HudLockOverlay } from './utils';

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
  quality: string;
}

const MARGIN = { top: 20, right: 20, bottom: 38, left: 58 };
const CHART_HEIGHT = 270;

function ScatterChart({
  data,
  width,
  height,
  onLockedDatumChange,
}: {
  data: ScatterDatum[];
  width: number;
  height: number;
  onLockedDatumChange?: (datum: ScatterDatum | null) => void;
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

  // X-axis ticks — standard smart ticks (horizontal labels don't crowd)
  const tickValues = useMemo(() => generateSmartTicks(maxVal, 6, true), [maxVal]);

  // Y-axis ticks — evenly spaced in sqrt-space so labels don't bunch
  const NICE_NUMBERS = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const yTickValues = useMemo(() => {
    const count = 5;
    const sqrtMax = Math.sqrt(maxVal * 0.92);
    const ticks: number[] = [];
    for (let i = 0; i < count; i++) {
      const sqrtVal = (sqrtMax * i) / (count - 1);
      const raw = sqrtVal * sqrtVal;
      const snapped = NICE_NUMBERS.reduce((best, n) =>
        Math.abs(n - raw) < Math.abs(best - raw) ? n : best,
      );
      if (!ticks.includes(snapped)) ticks.push(snapped);
    }
    return ticks;
  }, [maxVal]);

  // Memoize all static gradient defs — never changes
  const staticDefs = useMemo(
    () => (
      <>
        <radialGradient id="zone-profit-glow" cx="15%" cy="15%" r="85%">
          <stop offset="0%" stopColor={chartTheme.colors.profit} stopOpacity={0.08} />
          <stop offset="100%" stopColor={chartTheme.colors.profit} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="zone-loss-glow" cx="85%" cy="85%" r="85%">
          <stop offset="0%" stopColor={chartTheme.colors.loss} stopOpacity={0.06} />
          <stop offset="100%" stopColor={chartTheme.colors.loss} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="breakeven-gradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity={0.04} />
          <stop offset="50%" stopColor="white" stopOpacity={0.15} />
          <stop offset="100%" stopColor="white" stopOpacity={0.04} />
        </linearGradient>
        <radialGradient id="dot-highlight-profit" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity={0.3} />
          <stop offset="100%" stopColor={chartTheme.colors.profit} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="dot-highlight-loss" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity={0.3} />
          <stop offset="100%" stopColor={chartTheme.colors.loss} stopOpacity={0} />
        </radialGradient>
        {/* Stem gradients — fade from baseline up to dot */}
        <linearGradient id="stem-profit" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={chartTheme.colors.profit} stopOpacity={0} />
          <stop offset="100%" stopColor={chartTheme.colors.profit} stopOpacity={0.4} />
        </linearGradient>
        <linearGradient id="stem-loss" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={chartTheme.colors.loss} stopOpacity={0} />
          <stop offset="100%" stopColor={chartTheme.colors.loss} stopOpacity={0.4} />
        </linearGradient>
      </>
    ),
    [],
  );

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

  // Report locked datum to parent for the combined info row
  useEffect(() => {
    onLockedDatumChange?.(lockedDatum);
  }, [lockedDatum, onLockedDatumChange]);

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
          <style>{HUD_KEYFRAMES}</style>
          <GlowFilterDef id="scatter-glow" stdDeviation={3} />
          {staticDefs}
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

          {/* Grid — columns only (matches Timeline's lighter feel) */}
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
            fillOpacity={0.20}
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
            fillOpacity={0.20}
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
            const stemId = isProfit ? 'stem-profit' : 'stem-loss';

            return (
              <g key={d.id}>
                {/* Gradient stem from baseline to dot */}
                <line
                  x1={cx}
                  y1={innerHeight}
                  x2={cx}
                  y2={cy}
                  stroke={`url(#${stemId})`}
                  strokeWidth={isLocked ? 2 : 1}
                  pointerEvents="none"
                  style={{ transition: 'stroke-width 200ms ease' }}
                />
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
              <HudLockOverlay
                point={lockedPoint}
                color={color}
                scanRadius={r + 16}
                lockRadius={r + 10}
                yExtent={innerHeight}
              />
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
            tickValues={yTickValues}
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
    </div>
  );
}

export default function PnLScatterPlot({ nfts, gunPrice, embedded, zoomLevel = 1 }: PnLScatterPlotProps) {
  const [expanded, setExpanded] = useState(false);
  const [lockedDatum, setLockedDatum] = useState<ScatterDatum | null>(null);
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
        quality: nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '',
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

  const chartHeight = CHART_HEIGHT;

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
                {({ width: rawWidth }: { width: number }) => {
                  const width = Math.floor(rawWidth);
                  return width > 0 ? (
                    <ScatterChart data={scatterData} width={width} height={chartHeight} onLockedDatumChange={setLockedDatum} />
                  ) : null;
                }}
              </ParentSize>
            </div>
          </div>
          {/* Legend + locked item data — single inline row */}
          <div className="flex items-center gap-3 mt-2 h-[28px]">
            {/* P&L legend (left) */}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chartTheme.colors.profit, boxShadow: `0 0 4px ${chartTheme.colors.profit}40` }} />
              <span className="font-mono text-micro text-[var(--gs-gray-3)]">Profit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chartTheme.colors.loss, boxShadow: `0 0 4px ${chartTheme.colors.loss}40` }} />
              <span className="font-mono text-micro text-[var(--gs-gray-3)]">Loss</span>
            </div>
            <span className="font-mono text-micro text-[var(--gs-gray-2)]">
              Size&nbsp;=&nbsp;qty
            </span>

            {/* Locked item data (right) — bordered pill matching Timeline style */}
            {lockedDatum && (() => {
              const pnl = lockedDatum.floor - lockedDatum.cost;
              const pnlPct = lockedDatum.cost > 0 ? (pnl / lockedDatum.cost) * 100 : 0;
              const isProfit = pnl >= 0;
              const accentColor = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;
              const qualityCol = RARITY_COLORS[lockedDatum.quality] || '#888888';
              return (
                <div
                  className="ml-auto flex items-center gap-2.5 font-mono"
                  style={{
                    fontSize: 11,
                    background: 'rgba(255,255,255,0.03)',
                    borderWidth: '1px 1px 1px 2px',
                    borderStyle: 'solid',
                    borderColor: `rgba(255,255,255,0.06) rgba(255,255,255,0.06) rgba(255,255,255,0.06) ${qualityCol}`,
                    padding: '4px 10px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: 200,
                      fontWeight: 700,
                      fontSize: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'white',
                    }}
                  >
                    {lockedDatum.name}
                    {lockedDatum.quantity > 1 && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: 10 }}> &times;{lockedDatum.quantity}</span>}
                  </span>
                  <span style={{ display: 'inline-block', minWidth: 62, color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    Cost {formatGun(lockedDatum.cost)}
                  </span>
                  <span style={{ display: 'inline-block', minWidth: 56, color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
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
