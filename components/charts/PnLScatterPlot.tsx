'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleSqrt, scaleLog } from '@visx/scale';
import { AxisBottom } from '@visx/axis';
import { GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { Zoom } from '@visx/zoom';
import type { TransformMatrix } from '@visx/zoom/lib/types';

import { NFT } from '@/lib/types';
import { chartTheme } from './theme';
import { useProximityLock, LockPoint } from './useProximityLock';
import { RARITY_COLORS } from '@/components/nft-gallery/utils';
import { formatGun, HUD_KEYFRAMES, GlowFilterDef, HudLockOverlay } from './utils';
import {
  type ChartZoomHandle,
  type ZoomScaleMethod,
  computeZoomedDomain,
  makeConstrainZoom,
  useShiftWheelZoom,
  ZOOM_SCALE_MIN,
  ZOOM_SCALE_MAX,
} from './useChartZoom';

interface PnLScatterPlotProps {
  nfts: NFT[];
  gunPrice?: number;
  /** When true, renders only the chart body (no header, no border, always visible). */
  embedded?: boolean;
  /** Ref for imperative zoom control from parent (zoomTo, reset, getScale). */
  zoomRef?: React.RefObject<ChartZoomHandle | null>;
  /** Called when zoom scale changes (for displaying current level in parent). */
  onZoomChange?: (scale: number) => void;
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
  /** True when NFT has no market valuation — positioned via GUN appreciation P&L */
  noMarketData?: boolean;
}

const MARGIN = { top: 40, right: 20, bottom: 38, left: 58 };
const CHART_HEIGHT = 270;

/** Snap a value to the nearest 1-2-5 sequence number (matches AcquisitionTimeline). */
function snapToNice125(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const mag = Math.pow(10, exp);
  const norm = value / mag;
  const candidates = [1, 2, 5, 10];
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const dist = Math.abs(Math.log10(norm) - Math.log10(c));
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return parseFloat((best * mag).toPrecision(3));
}

/* ------------------------------------------------------------------ */
/*  ScatterChartZoomed — inner component (receives zoom state)        */
/* ------------------------------------------------------------------ */

function ScatterChartZoomed({
  data, width, height,
  onLockedDatumChange, onZoomChange,
  seenIdsRef,
  transformMatrix, isDragging,
  dragStart, dragMove, dragEnd,
}: {
  data: ScatterDatum[];
  width: number;
  height: number;
  onLockedDatumChange?: (datum: ScatterDatum | null) => void;
  onZoomChange?: (scale: number) => void;
  seenIdsRef: React.RefObject<Set<string>>;
  transformMatrix: TransformMatrix;
  isDragging: boolean;
  dragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  dragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  dragEnd: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  /* --- Base scales (full data extent → pixel range) --- */

  const maxVal = useMemo(() => {
    let m = 0;
    for (const d of data) {
      if (d.cost > m) m = d.cost;
      if (d.floor > m) m = d.floor;
    }
    return m * 1.5 || 100;
  }, [data]);

  const minVal = useMemo(() => {
    let m = Infinity;
    for (const d of data) {
      if (d.cost > 0 && d.cost < m) m = d.cost;
      if (d.floor > 0 && d.floor < m) m = d.floor;
    }
    return m === Infinity ? 1 : m;
  }, [data]);

  // Domain min: pad 30% below lowest data in log space (matches AcquisitionTimeline)
  const domainMin = useMemo(() => Math.max(0.5, minVal / 1.3), [minVal]);

  const baseXScale = useMemo(
    () => scaleLog<number>({ domain: [domainMin, maxVal], range: [0, innerWidth], base: 10, clamp: true }),
    [domainMin, maxVal, innerWidth],
  );

  const baseYScale = useMemo(
    () => scaleLog<number>({ domain: [domainMin, maxVal], range: [innerHeight, 0], base: 10, clamp: true }),
    [domainMin, maxVal, innerHeight],
  );

  const sizeScale = useMemo(
    () => scaleSqrt<number>({ domain: [1, Math.max(5, ...data.map(d => d.quantity))], range: [5, 16] }),
    [data],
  );

  /* --- Zoomed scales from transform matrix --- */

  const { scaleX, scaleY, translateX, translateY } = transformMatrix;

  const xScale = useMemo(() => {
    const [d0, d1] = computeZoomedDomain(baseXScale, scaleX, translateX, innerWidth, false);
    return scaleLog<number>({ domain: [Math.max(domainMin, d0 as number), Math.max(domainMin * 1.01, d1 as number)], range: [0, innerWidth], base: 10, clamp: true });
  }, [baseXScale, scaleX, translateX, innerWidth, domainMin]);

  const yScale = useMemo(() => {
    const [d0, d1] = computeZoomedDomain(baseYScale, scaleY, translateY, innerHeight, true);
    return scaleLog<number>({ domain: [Math.max(domainMin, d0 as number), Math.max(domainMin * 1.01, d1 as number)], range: [innerHeight, 0], base: 10, clamp: true });
  }, [baseYScale, scaleY, translateY, innerHeight, domainMin]);

  // Report zoom level to parent
  useEffect(() => {
    onZoomChange?.(scaleX);
  }, [scaleX, onZoomChange]);

  /* --- Tick values from zoomed domains --- */

  const zoomedMaxX = (xScale.domain() as [number, number])[1];
  const zoomedMaxY = (yScale.domain() as [number, number])[1];

  const xTickValues = useMemo(() => {
    const count = 5;
    const bottomTick = snapToNice125(Math.max(1, minVal));
    const logMin = Math.log10(bottomTick);
    const logMax = Math.log10(zoomedMaxX);
    if (logMax <= logMin) return [bottomTick];

    const step = (logMax - logMin) / (count - 1);
    const ticks: number[] = [];
    for (let i = 0; i < count; i++) {
      const snapped = snapToNice125(Math.pow(10, logMin + i * step));
      if (!ticks.includes(snapped)) ticks.push(snapped);
    }
    return ticks;
  }, [zoomedMaxX, minVal]);

  const yTickValues = useMemo(() => {
    const count = 5;
    // Use log-space tick distribution (matches AcquisitionTimeline)
    const bottomTick = snapToNice125(Math.max(1, minVal));
    const logMin = Math.log10(bottomTick);
    const logMax = Math.log10(zoomedMaxY);
    if (logMax <= logMin) return [bottomTick];

    const step = (logMax - logMin) / (count - 1);
    const ticks: number[] = [];
    for (let i = 0; i < count; i++) {
      const snapped = snapToNice125(Math.pow(10, logMin + i * step));
      if (!ticks.includes(snapped)) ticks.push(snapped);
    }
    return ticks;
  }, [zoomedMaxY, minVal]);

  /* --- Static gradient defs --- */

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
        <linearGradient id="stem-profit" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={chartTheme.colors.profit} stopOpacity={0} />
          <stop offset="100%" stopColor={chartTheme.colors.profit} stopOpacity={0.4} />
        </linearGradient>
        <linearGradient id="stem-loss" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={chartTheme.colors.loss} stopOpacity={0} />
          <stop offset="100%" stopColor={chartTheme.colors.loss} stopOpacity={0.4} />
        </linearGradient>
        {/* GUN Δ — hollow dots reuse profit/loss colors with dashed stems */}
        <linearGradient id="stem-gun-delta-profit" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={chartTheme.colors.profit} stopOpacity={0} />
          <stop offset="100%" stopColor={chartTheme.colors.profit} stopOpacity={0.3} />
        </linearGradient>
        <linearGradient id="stem-gun-delta-loss" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={chartTheme.colors.loss} stopOpacity={0} />
          <stop offset="100%" stopColor={chartTheme.colors.loss} stopOpacity={0.3} />
        </linearGradient>
      </>
    ),
    [],
  );

  /* --- Proximity lock --- */

  const lockPoints: LockPoint[] = useMemo(
    () => data.map(d => ({ id: d.id, x: xScale(d.cost), y: yScale(d.floor) })),
    [data, xScale, yScale],
  );

  const {
    lockedId, lockedPoint,
    handleMouseMove: proximityMouseMove,
    handleMouseLeave: proximityMouseLeave,
  } = useProximityLock(
    lockPoints,
    svgRef,
    { left: MARGIN.left, top: MARGIN.top },
    40,
  );

  /* --- Dot animation tracking --- */

  const newIds = useMemo(() => {
    const fresh = new Set<string>();
    for (const d of data) {
      if (!seenIdsRef.current.has(d.id)) fresh.add(d.id);
    }
    return fresh;
  }, [data, seenIdsRef]);

  // Shuffle new IDs so dots appear in random positions (night-sky effect)
  const randomDelayMap = useMemo(() => {
    const ids = Array.from(newIds);
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const map = new Map<string, number>();
    for (let i = 0; i < ids.length; i++) {
      map.set(ids[i], ids.length > 1 ? (i / (ids.length - 1)) * 8 : 0);
    }
    return map;
  }, [newIds]);

  useEffect(() => {
    for (const d of data) seenIdsRef.current.add(d.id);
  }, [data, seenIdsRef]);

  const lockedDatum = useMemo(
    () => lockedId ? data.find(d => d.id === lockedId) ?? null : null,
    [lockedId, data],
  );

  useEffect(() => {
    onLockedDatumChange?.(lockedDatum);
  }, [lockedDatum, onLockedDatumChange]);

  /* --- Combined mouse handlers (drag + proximity) --- */

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (scaleX > 1.01) dragStart(e);
  }, [scaleX, dragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      dragMove(e);
    } else {
      proximityMouseMove(e);
    }
  }, [isDragging, dragMove, proximityMouseMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) dragEnd();
  }, [isDragging, dragEnd]);

  const handleMouseLeave = useCallback(() => {
    dragEnd();
    proximityMouseLeave();
  }, [dragEnd, proximityMouseLeave]);

  const cursor = isDragging
    ? 'grabbing'
    : scaleX > 1.01
      ? 'grab'
      : lockedId
        ? 'crosshair'
        : 'default';

  /* --- Break-even line extent (from zoomed scales) --- */

  const breakEvenMax = Math.max(zoomedMaxX, zoomedMaxY);

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor }}
      >
        <defs>
          <style>{HUD_KEYFRAMES}{`
            @keyframes star-appear {
              0%   { opacity: 0; transform: scale(0); }
              65%  { opacity: 1; transform: scale(1.12); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <GlowFilterDef id="scatter-glow" stdDeviation={3} />
          {staticDefs}
          <clipPath id="scatter-data-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Background zones — fill viewport, outside clip */}
          <polygon
            points={`0,0 ${innerWidth},0 0,${innerHeight}`}
            fill="url(#zone-profit-glow)"
          />
          <polygon
            points={`0,${innerHeight} ${innerWidth},0 ${innerWidth},${innerHeight}`}
            fill="url(#zone-loss-glow)"
          />

          {/* Zone labels — fixed viewport position */}
          <text
            x={innerWidth * 0.06} y={innerHeight * 0.18}
            fill={chartTheme.colors.profit} fillOpacity={0.20}
            fontSize={9} fontFamily={chartTheme.fonts.mono}
            textAnchor="start" letterSpacing="0.15em"
          >
            PROFIT
          </text>
          <text
            x={innerWidth * 0.72} y={innerHeight * 0.88}
            fill={chartTheme.colors.loss} fillOpacity={0.20}
            fontSize={9} fontFamily={chartTheme.fonts.mono}
            textAnchor="start" letterSpacing="0.15em"
          >
            LOSS
          </text>

          {/* Clipped data area — grid, diagonal, dots, HUD */}
          <g clipPath="url(#scatter-data-clip)">
            <GridColumns
              scale={xScale}
              height={innerHeight}
              tickValues={xTickValues}
              stroke={chartTheme.colors.grid}
            />

            {/* Break-even diagonal (zoomed) */}
            <Line
              from={{ x: xScale(domainMin), y: yScale(domainMin) }}
              to={{ x: xScale(breakEvenMax), y: yScale(breakEvenMax) }}
              stroke="url(#breakeven-gradient)"
              strokeWidth={1}
              strokeDasharray="8 5"
            />
            <text
              x={xScale(breakEvenMax * 0.45)}
              y={yScale(breakEvenMax * 0.45) - 6}
              fill="rgba(255,255,255,0.18)"
              fontSize={8}
              fontFamily={chartTheme.fonts.mono}
              textAnchor="middle"
              letterSpacing="0.15em"
              transform={`rotate(-${Math.atan(innerHeight / innerWidth) * (180 / Math.PI)}, ${xScale(breakEvenMax * 0.45)}, ${yScale(breakEvenMax * 0.45) - 6})`}
            >
              BREAK EVEN
            </text>

            {/* Data dots */}
            {data.map((d) => {
              const cx = xScale(d.cost);
              const cy = yScale(d.floor);
              const isProfit = d.floor >= d.cost;
              const isLocked = lockedId === d.id;
              const r = sizeScale(d.quantity);
              const isNew = newIds.has(d.id);
              const staggerDelay = randomDelayMap.get(d.id) ?? 0;

              // GUN Δ dots: hollow green/red outline, fixed size, one per individual NFT
              if (d.noMarketData) {
                const hr = 4; // fixed radius for all hollow dots
                const dotColor = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;
                const stemGrad = isProfit ? 'url(#stem-gun-delta-profit)' : 'url(#stem-gun-delta-loss)';
                const highlightGrad = isProfit ? 'url(#dot-highlight-profit)' : 'url(#dot-highlight-loss)';
                return (
                  <g
                    key={d.id}
                    style={isNew ? {
                      animation: `star-appear 2.5s cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay.toFixed(2)}s both`,
                      transformOrigin: `${cx}px ${cy}px`,
                    } : undefined}
                  >
                    <line
                      x1={cx} y1={innerHeight} x2={cx} y2={cy}
                      stroke={stemGrad}
                      strokeWidth={isLocked ? 2 : 1}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                      style={{ transition: 'stroke-width 200ms ease' }}
                    />
                    {/* Outer glow */}
                    <circle
                      cx={cx} cy={cy}
                      r={isLocked ? hr + 10 : hr + 4}
                      fill={dotColor}
                      fillOpacity={isLocked ? 0.12 : 0.04}
                      pointerEvents="none"
                      style={{ transition: 'r 250ms ease, fill-opacity 250ms ease' }}
                    />
                    {/* Hollow circle — stroke only */}
                    <Circle
                      cx={cx} cy={cy}
                      r={isLocked ? hr + 2 : hr}
                      fill="none"
                      stroke={dotColor}
                      strokeWidth={isLocked ? 2 : 1.5}
                      strokeOpacity={isLocked ? 0.95 : 0.6}
                      filter={isLocked ? 'url(#scatter-glow)' : undefined}
                      pointerEvents="none"
                      data-dot=""
                      style={{ transition: 'r 250ms ease, stroke-opacity 250ms ease, stroke-width 250ms ease' }}
                    />
                    {/* Inner highlight */}
                    <circle
                      cx={cx} cy={cy}
                      r={isLocked ? hr + 1 : hr - 1}
                      fill={highlightGrad}
                      fillOpacity={isLocked ? 0.3 : 0.1}
                      pointerEvents="none"
                      style={{ transition: 'r 250ms ease, fill-opacity 250ms ease' }}
                    />
                  </g>
                );
              }

              // Market-valued dots: filled green/red
              const color = isProfit ? chartTheme.colors.profit : chartTheme.colors.loss;
              const highlightId = isProfit ? 'dot-highlight-profit' : 'dot-highlight-loss';
              const stemId = isProfit ? 'stem-profit' : 'stem-loss';

              return (
                <g
                  key={d.id}
                  style={isNew ? {
                    animation: `star-appear 2.5s cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay.toFixed(2)}s both`,
                    transformOrigin: `${cx}px ${cy}px`,
                  } : undefined}
                >
                  <line
                    x1={cx} y1={innerHeight} x2={cx} y2={cy}
                    stroke={`url(#${stemId})`}
                    strokeWidth={isLocked ? 2 : 1}
                    pointerEvents="none"
                    style={{ transition: 'stroke-width 200ms ease' }}
                  />
                  <circle
                    cx={cx} cy={cy}
                    r={isLocked ? r + 10 : r + 4}
                    fill={color}
                    fillOpacity={isLocked ? 0.15 : 0.06}
                    pointerEvents="none"
                    style={{ transition: 'r 250ms ease, fill-opacity 250ms ease' }}
                  />
                  <Circle
                    cx={cx} cy={cy}
                    r={isLocked ? r + 2 : r}
                    fill={color}
                    fillOpacity={isLocked ? 0.95 : 0.7}
                    stroke={isLocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isLocked ? 1.5 : 0.5}
                    filter={isLocked ? 'url(#scatter-glow)' : undefined}
                    pointerEvents="none"
                    data-dot=""
                    style={{ transition: 'r 250ms ease, fill-opacity 250ms ease, stroke 250ms ease, stroke-width 250ms ease' }}
                  />
                  <circle
                    cx={cx} cy={cy}
                    r={isLocked ? r + 1 : r - 1}
                    fill={`url(#${highlightId})`}
                    fillOpacity={isLocked ? 0.4 : 0.2}
                    pointerEvents="none"
                    style={{ transition: 'r 250ms ease, fill-opacity 250ms ease, stroke 250ms ease, stroke-width 250ms ease' }}
                  />
                </g>
              );
            })}

            {/* HUD lock-on overlay */}
            {lockedId && lockedPoint && lockedDatum && (() => {
              const color = lockedDatum.floor >= lockedDatum.cost ? chartTheme.colors.profit : chartTheme.colors.loss;
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
          </g>

          {/* Fixed axes — rendered outside clipPath */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            tickValues={xTickValues}
            tickFormat={(v) => formatGun(v as number)}
            stroke={chartTheme.colors.axis}
            tickStroke={chartTheme.colors.axis}
            tickLabelProps={{
              fill: chartTheme.colors.axisLabel,
              fontSize: 10,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
          />

          {/* Y-axis labels — manual rendering to match AcquisitionTimeline exactly */}
          <text
            x={-8} y={-22}
            fill="rgba(255,255,255,0.3)"
            fontSize={10}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="end"
          >
            GUN
          </text>
          {yTickValues.map((val, i) => (
            <text
              key={i}
              x={-8}
              y={yScale(val)}
              fill={chartTheme.colors.axisLabel}
              fontSize={10}
              fontFamily={chartTheme.fonts.mono}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatGun(val)}
            </text>
          ))}
        </Group>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PnLScatterPlot — outer component                                  */
/* ------------------------------------------------------------------ */

export default function PnLScatterPlot({ nfts, gunPrice, embedded, zoomRef, onZoomChange }: PnLScatterPlotProps) {
  const [expanded, setExpanded] = useState(false);
  const [lockedDatum, setLockedDatum] = useState<ScatterDatum | null>(null);

  const scatterData = useMemo<ScatterDatum[]>(() => {
    const result: ScatterDatum[] = [];
    for (const nft of nfts) {
      if (nft.purchasePriceGun == null || nft.purchasePriceGun <= 0) continue;
      const cost = nft.purchasePriceGun;
      const marketValue = nft.currentLowestListing ?? nft.comparableSalesMedian ?? nft.rarityFloor ?? nft.floorPrice;

      if (marketValue != null && marketValue > 0) {
        // Market-valued: filled dot
        result.push({
          id: nft.tokenId, name: nft.name, cost,
          floor: marketValue, quantity: nft.quantity ?? 1,
          venue: nft.acquisitionVenue ?? 'unknown',
          collection: nft.collection,
          quality: nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '',
        });
      } else if (
        gunPrice && gunPrice > 0
        && nft.purchasePriceUsd && nft.purchasePriceUsd > 0
      ) {
        // GUN Δ: hollow dots — one per individual NFT (not grouped)
        const historicalGunUsd = nft.purchasePriceUsd / cost;
        const syntheticFloor = cost * (gunPrice / historicalGunUsd);
        const qty = nft.quantity ?? 1;
        for (let i = 0; i < qty; i++) {
          // Small deterministic jitter so stacked dots don't overlap perfectly
          const jitter = qty > 1 ? (i - (qty - 1) / 2) * cost * 0.02 : 0;
          result.push({
            id: qty > 1 ? `${nft.tokenId}:${i}` : nft.tokenId,
            name: nft.name, cost: cost + jitter,
            floor: syntheticFloor, quantity: 1,
            venue: nft.acquisitionVenue ?? 'unknown',
            collection: nft.collection,
            quality: nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '',
            noMarketData: true,
          });
        }
      }
    }
    return result;
  }, [nfts, gunPrice]);

  const stats = useMemo(() => {
    let profitable = 0;
    let losing = 0;
    let gunDelta = 0;
    for (const d of scatterData) {
      if (d.noMarketData) { gunDelta++; continue; }
      if (d.floor >= d.cost) profitable++;
      else losing++;
    }
    return { profitable, losing, gunDelta, total: scatterData.length };
  }, [scatterData]);

  const hasChartData = scatterData.length >= 2;
  const chartHeight = CHART_HEIGHT;

  // Stable ref for tracking seen dot IDs — survives ParentSize remounts
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Zoom imperative control refs
  const zoomObjRef = useRef<ZoomScaleMethod & {
    transformMatrix: TransformMatrix;
    reset: () => void;
    setTransformMatrix: (m: TransformMatrix) => void;
  } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const innerDimsRef = useRef({ width: 0, height: 0 });

  // Shift+wheel zoom
  useShiftWheelZoom(svgContainerRef, zoomObjRef, { left: MARGIN.left, top: MARGIN.top });

  // Expose imperative handle
  useEffect(() => {
    if (!zoomRef) return;
    zoomRef.current = {
      zoomTo: (level: number) => {
        const zoom = zoomObjRef.current;
        if (!zoom) return;
        const { width, height } = innerDimsRef.current;
        zoom.setTransformMatrix({
          scaleX: level, scaleY: level,
          translateX: -(level - 1) * width / 2,
          translateY: -(level - 1) * height / 2,
          skewX: 0, skewY: 0,
        });
      },
      reset: () => zoomObjRef.current?.reset(),
      getScale: () => zoomObjRef.current?.transformMatrix.scaleX ?? 1,
    };
  }, [zoomRef]);

  // Constrain function — reads fresh inner dimensions from ref
  const constrain = useCallback((transform: TransformMatrix, prev: TransformMatrix) => {
    const { width, height } = innerDimsRef.current;
    if (width <= 0 || height <= 0) return prev;
    return makeConstrainZoom(width, height, ZOOM_SCALE_MIN, ZOOM_SCALE_MAX)(transform, prev);
  }, []);

  const chartBody = (
    <div className="px-4 pb-3" ref={svgContainerRef}>
      {hasChartData ? (
        <>
          <ParentSize debounceTime={100}>
            {({ width: rawWidth }: { width: number }) => {
              const w = Math.floor(rawWidth);
              if (w <= 0) return null;

              const iW = w - MARGIN.left - MARGIN.right;
              const iH = chartHeight - MARGIN.top - MARGIN.bottom;
              innerDimsRef.current = { width: iW, height: iH };

              return (
                <Zoom<SVGSVGElement>
                  width={w}
                  height={chartHeight}
                  scaleXMin={ZOOM_SCALE_MIN}
                  scaleXMax={ZOOM_SCALE_MAX}
                  scaleYMin={ZOOM_SCALE_MIN}
                  scaleYMax={ZOOM_SCALE_MAX}
                  constrain={constrain}
                >
                  {(zoom) => {
                    zoomObjRef.current = zoom;
                    return (
                      <ScatterChartZoomed
                        data={scatterData}
                        width={w}
                        height={chartHeight}
                        onLockedDatumChange={setLockedDatum}
                        onZoomChange={onZoomChange}
                        seenIdsRef={seenIdsRef}
                        transformMatrix={zoom.transformMatrix}
                        isDragging={zoom.isDragging}
                        dragStart={zoom.dragStart}
                        dragMove={zoom.dragMove}
                        dragEnd={zoom.dragEnd}
                      />
                    );
                  }}
                </Zoom>
              );
            }}
          </ParentSize>

          {/* Legend + locked item data */}
          <div className="flex items-center gap-2.5 mt-2 h-[28px]">
            {/* Market-based group */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chartTheme.colors.profit, boxShadow: `0 0 4px ${chartTheme.colors.profit}40` }} />
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Profit</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chartTheme.colors.loss, boxShadow: `0 0 4px ${chartTheme.colors.loss}40` }} />
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Loss</span>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--gs-gray-2)]">market</span>
            </div>
            {/* Divider */}
            <div className="w-px h-3 bg-white/10" />
            {/* GUN Δ group */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ border: `1.5px solid ${chartTheme.colors.profit}`, boxShadow: `0 0 4px ${chartTheme.colors.profit}40` }} />
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Profit</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ border: `1.5px solid ${chartTheme.colors.loss}`, boxShadow: `0 0 4px ${chartTheme.colors.loss}40` }} />
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Loss</span>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--gs-gray-2)]">gun&nbsp;&#916;</span>
            </div>
            {/* Size hint */}
            <div className="w-px h-3 bg-white/10" />
            <span className="font-mono text-micro text-[var(--gs-gray-2)]">
              Size&nbsp;=&nbsp;qty
            </span>

            {lockedDatum && (() => {
              const pnl = lockedDatum.floor - lockedDatum.cost;
              const pnlPct = lockedDatum.cost > 0 ? (pnl / lockedDatum.cost) * 100 : 0;
              const isProfit = pnl >= 0;
              const isGunDelta = !!lockedDatum.noMarketData;
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
                    {isGunDelta ? 'GUN \u0394' : 'Val'} {formatGun(lockedDatum.floor)}
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
          Need at least 2 NFTs with cost and value data
        </p>
      )}
    </div>
  );

  if (embedded) return chartBody;

  return (
    <div className="border-t border-white/[0.06]">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">
          NFT Cost vs Value
        </p>
        <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
          {hasChartData ? `${stats.total} items` : `${scatterData.length} with cost`}
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
              {stats.gunDelta > 0 && (
                <span className="font-mono text-micro tabular-nums px-1.5 py-0.5 text-[var(--gs-gray-3)]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {stats.gunDelta} &#916;
                </span>
              )}
            </>
          ) : (
            <span className="font-mono text-micro text-[var(--gs-gray-3)]">needs value data</span>
          )}
          <span className="font-mono text-micro text-[var(--gs-gray-3)] ml-1">
            {expanded ? '\u25B4' : '\u25BE'}
          </span>
        </span>
      </button>

      {expanded && chartBody}
    </div>
  );
}
