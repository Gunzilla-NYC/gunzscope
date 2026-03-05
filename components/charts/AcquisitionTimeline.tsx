'use client';

import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { Line } from '@visx/shape';
import { scaleLog, scaleTime } from '@visx/scale';
import { AxisBottom } from '@visx/axis';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { Zoom } from '@visx/zoom';
import type { TransformMatrix } from '@visx/zoom/lib/types';

import { NFT } from '@/lib/types';
import { chartTheme } from './theme';
import { useProximityLock, LockPoint } from './useProximityLock';
import { formatGun } from './utils';
import {
  type ChartZoomHandle,
  type ZoomScaleMethod,
  computeZoomedDomain,
  makeConstrainZoom,
  useShiftWheelZoom,
  ZOOM_SCALE_MIN,
  ZOOM_SCALE_MAX,
} from './useChartZoom';

interface AcquisitionTimelineProps {
  nfts: NFT[];
  gunPrice?: number;
  /** When true, renders only the chart body (no header, no border, always visible). */
  embedded?: boolean;
  /** Ref for imperative zoom control from parent (zoomTo, reset, getScale). */
  zoomRef?: React.RefObject<ChartZoomHandle | null>;
  /** Called when zoom scale changes (for displaying current level in parent). */
  onZoomChange?: (scale: number) => void;
}

interface TimelineDatum {
  id: string;
  name: string;
  date: Date;
  costGun: number;
  venue: string;
  quantity: number;
  quality: string;
  currentValueUsd: number; // Market exit value in USD (for radius scaling)
  pnlPct: number | null;  // P&L percentage vs purchase price (null if no market data)
}

const MARGIN = { top: 14, right: 16, bottom: 32, left: 16 };
/** Embedded mode uses the same dimensions as PnLScatterPlot for seamless crossfade. */
const MARGIN_EMBEDDED = { top: 16, right: 24, bottom: 32, left: 40 };
const CHART_HEIGHT = 240;
const CHART_HEIGHT_EMBEDDED = 270;

const VENUE_COLORS: Record<string, string> = {
  decode: chartTheme.colors.lime,
  mint: chartTheme.colors.lime,
  system_mint: chartTheme.colors.lime,
  opensea: chartTheme.colors.purple,
  in_game_marketplace: '#FF9F43',
  otg_marketplace: '#FF9F43',
  transfer: '#4CC9F0',
  unknown: 'rgba(255,255,255,0.25)',
};

function venueColor(venue: string): string {
  return VENUE_COLORS[venue] ?? VENUE_COLORS.unknown;
}

function venueLabel(venue: string): string {
  switch (venue) {
    case 'decode': return 'Hex Decode';
    case 'mint': case 'system_mint': return 'Mint';
    case 'opensea': return 'OpenSea';
    case 'in_game_marketplace': case 'otg_marketplace': return 'Marketplace';
    case 'transfer': return 'Transfer';
    default: return venue.replace(/_/g, ' ');
  }
}

/** Deterministic ±3px horizontal jitter seeded by array index */
function jitterX(index: number): number {
  return ((index * 2654435761) >>> 0) % 7 - 3;
}

/** Map venue key to stem gradient URL */
function stemGradient(venue: string): string {
  switch (venue) {
    case 'decode': case 'mint': case 'system_mint': return 'url(#stemGrad-lime)';
    case 'opensea': return 'url(#stemGrad-opensea)';
    case 'in_game_marketplace': case 'otg_marketplace': return 'url(#stemGrad-marketplace)';
    case 'transfer': return 'url(#stemGrad-transfer)';
    default: return 'url(#stemGrad-unknown)';
  }
}

/**
 * Generate ~targetCount ticks evenly spaced in log10 space, snapped to 1-2-5 numbers.
 * Ensures the lowest data value always has a nearby tick.
 */
function generateEvenLogTicks(
  domainMax: number, minDataValue: number, targetCount = 5,
): number[] {
  // Bottom tick starts at the lowest data value (snapped), not the padded domain edge
  const bottomTick = snapToNice125(Math.max(1, minDataValue));
  const logMin = Math.log10(bottomTick);
  const logMax = Math.log10(domainMax);
  if (logMax <= logMin) return [bottomTick];

  const step = (logMax - logMin) / (targetCount - 1);
  const raw: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    raw.push(Math.pow(10, logMin + i * step));
  }

  // Snap each to nearest 1-2-5 nice number
  const snapped = raw.map(snapToNice125);

  // Deduplicate (adjacent snaps may collapse) and sort
  const unique = [...new Set(snapped)].sort((a, b) => a - b);

  return unique;
}

/** Snap a value to the nearest 1-2-5 sequence number at its order of magnitude. */
function snapToNice125(value: number): number {
  const exp = Math.floor(Math.log10(value));
  const mag = Math.pow(10, exp);
  const norm = value / mag; // 1 <= norm < 10

  // Compare in log-space for proportional distance
  const candidates = [1, 2, 5, 10];
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const dist = Math.abs(Math.log10(norm) - Math.log10(c));
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }

  const result = best * mag;
  // Clean up floating point (e.g. 200.00000001 → 200)
  const rounded = parseFloat(result.toPrecision(3));
  return rounded;
}

/* ------------------------------------------------------------------ */
/*  TimelineChartZoomed — inner component (receives zoom state)       */
/* ------------------------------------------------------------------ */

const TimelineChartZoomed = memo(function TimelineChartZoomed({
  data, width, height, margin,
  seenIdsRef, onZoomChange,
  transformMatrix, isDragging,
  dragStart, dragMove, dragEnd,
}: {
  data: TimelineDatum[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  seenIdsRef: React.RefObject<Set<string>>;
  onZoomChange?: (scale: number) => void;
  transformMatrix: TransformMatrix;
  isDragging: boolean;
  dragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  dragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  dragEnd: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  /* --- Base scales (full data extent → pixel range) --- */

  const dateExtent = useMemo(() => {
    const dates = data.map(d => d.date.getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    // Minimum 12h padding so same-day acquisitions still show a meaningful date axis
    const pad = Math.max((max - min) * 0.15, 12 * 60 * 60 * 1000);
    return [new Date(min - pad), new Date(max + pad)] as [Date, Date];
  }, [data]);

  const maxCost = useMemo(() => Math.max(...data.map(d => d.costGun), 1), [data]);
  const minCost = useMemo(() => Math.min(...data.map(d => d.costGun)), [data]);

  // Dynamic Y-domain: pad 30% below the lowest dot on a log scale, floor at 0.5 (log can't handle ≤0)
  const yDomainMin = useMemo(() => Math.max(0.5, minCost / 1.3), [minCost]);

  const baseXScale = useMemo(
    () => scaleTime<number>({ domain: dateExtent, range: [0, innerWidth] }),
    [dateExtent, innerWidth],
  );

  const baseYScale = useMemo(
    () => scaleLog<number>({ domain: [yDomainMin, maxCost * 1.5], range: [innerHeight, 0], base: 10, clamp: true }),
    [yDomainMin, maxCost, innerHeight],
  );

  /* --- Zoomed scales from transform matrix --- */

  const { scaleX, scaleY, translateX, translateY } = transformMatrix;

  const xScale = useMemo(() => {
    const [d0, d1] = computeZoomedDomain(baseXScale, scaleX, translateX, innerWidth, false);
    return scaleTime<number>({ domain: [d0, d1], range: [0, innerWidth] });
  }, [baseXScale, scaleX, translateX, innerWidth]);

  const yScale = useMemo(() => {
    const [d0, d1] = computeZoomedDomain(baseYScale, scaleY, translateY, innerHeight, true);
    return scaleLog<number>({
      domain: [Math.max(yDomainMin, d0 as number), Math.max(yDomainMin * 1.01, d1 as number)],
      range: [innerHeight, 0],
      base: 10,
      clamp: true,
    });
  }, [baseYScale, scaleY, translateY, innerHeight, yDomainMin]);

  // Date range in days (from zoomed domain — affects tick formatting)
  const rangeDays = useMemo(() => {
    const domain = xScale.domain();
    return ((domain[1] as Date).getTime() - (domain[0] as Date).getTime()) / (1000 * 60 * 60 * 24);
  }, [xScale]);

  // Report zoom level to parent
  useEffect(() => {
    onZoomChange?.(scaleX);
  }, [scaleX, onZoomChange]);

  /* --- Proximity lock --- */

  const lockPoints: LockPoint[] = useMemo(
    () => data.map((d, i) => ({
      id: d.id,
      x: xScale(d.date) + jitterX(i),
      y: Math.min(yScale(d.costGun), innerHeight - 4),
    })),
    [data, xScale, yScale, innerHeight],
  );

  const {
    lockedId, lockedPoint,
    handleMouseMove: proximityMouseMove,
    handleMouseLeave: proximityMouseLeave,
  } = useProximityLock(
    lockPoints,
    svgRef,
    { left: margin.left, top: margin.top },
    40,
  );

  /* --- Dot animation tracking --- */

  const newIds = useMemo(() => {
    const fresh = new Set<string>();
    for (const d of data) {
      if (!seenIdsRef.current.has(d.id)) fresh.add(d.id);
    }
    return fresh;
  }, [data]);

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
  }, [data]);

  const lockedDatum = useMemo(
    () => lockedId ? data.find(d => d.id === lockedId) ?? null : null,
    [lockedId, data],
  );

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

  /* --- Y-axis tick labels (filtered to zoomed domain) --- */

  const yDomain = yScale.domain() as [number, number];
  const yTickValues = useMemo(
    () => generateEvenLogTicks(yDomain[1], minCost, 5),
    [yDomain[1], minCost],
  );

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
          <style>{`
            @keyframes star-appear {
              0%   { opacity: 0; transform: scale(0); }
              65%  { opacity: 1; transform: scale(1.12); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <clipPath id="timeline-data-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
          {/* Stem gradients — userSpaceOnUse so they work on zero-width <line> elements */}
          {/* y1 = baseline (bottom, full margin offset), y2 = top of chart area */}
          <linearGradient id="stemGrad-lime" gradientUnits="userSpaceOnUse" x1="0" y1={margin.top + innerHeight} x2="0" y2={margin.top}>
            <stop offset="0%" stopColor={chartTheme.colors.lime} stopOpacity={0.10} />
            <stop offset="100%" stopColor={chartTheme.colors.lime} stopOpacity={1} />
          </linearGradient>
          <linearGradient id="stemGrad-opensea" gradientUnits="userSpaceOnUse" x1="0" y1={margin.top + innerHeight} x2="0" y2={margin.top}>
            <stop offset="0%" stopColor="#6D5BFF" stopOpacity={0.10} />
            <stop offset="100%" stopColor="#6D5BFF" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="stemGrad-marketplace" gradientUnits="userSpaceOnUse" x1="0" y1={margin.top + innerHeight} x2="0" y2={margin.top}>
            <stop offset="0%" stopColor="#FF9F43" stopOpacity={0.10} />
            <stop offset="100%" stopColor="#FF9F43" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="stemGrad-transfer" gradientUnits="userSpaceOnUse" x1="0" y1={margin.top + innerHeight} x2="0" y2={margin.top}>
            <stop offset="0%" stopColor="#4CC9F0" stopOpacity={0.10} />
            <stop offset="100%" stopColor="#4CC9F0" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="stemGrad-unknown" gradientUnits="userSpaceOnUse" x1="0" y1={margin.top + innerHeight} x2="0" y2={margin.top}>
            <stop offset="0%" stopColor="white" stopOpacity={0.06} />
            <stop offset="100%" stopColor="white" stopOpacity={0.10} />
          </linearGradient>
        </defs>

        <Group left={margin.left} top={margin.top}>
          {/* Clipped data area — baseline, dots, HUD overlay */}
          <g clipPath="url(#timeline-data-clip)">
            {/* Baseline */}
            <Line
              from={{ x: 0, y: innerHeight }}
              to={{ x: innerWidth, y: innerHeight }}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />

            {/* Data points — lollipop chart */}
            {data.map((d, i) => {
              const cx = xScale(d.date) + jitterX(i);
              const rawCy = yScale(d.costGun);
              // Min stem height 4px even if dot sits near baseline
              const cy = Math.min(rawCy, innerHeight - 4);
              const isLocked = lockedId === d.id;
              const color = venueColor(d.venue);
              const isNew = newIds.has(d.id);
              const staggerDelay = randomDelayMap.get(d.id) ?? 0;
              const isLoss = d.pnlPct !== null && d.pnlPct < 0;

              return (
                <g
                  key={d.id}
                  style={isNew ? {
                    animation: `star-appear 2.5s cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay.toFixed(2)}s both`,
                    transformOrigin: `${cx}px ${cy}px`,
                  } : undefined}
                >
                  {/* Stem — 1px gradient from baseline to dot */}
                  <line
                    x1={cx} y1={innerHeight} x2={cx} y2={cy}
                    stroke={stemGradient(d.venue)}
                    strokeWidth={1}
                    strokeOpacity={isLocked ? 1 : 0.5}
                    pointerEvents="none"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                  {/* Dot — uniform r=5, scales to r=7 on hover */}
                  <circle
                    cx={cx} cy={cy}
                    r={isLocked ? 7 : 5}
                    fill={color}
                    fillOpacity={isLocked ? 1 : 0.85}
                    stroke={isLoss ? chartTheme.colors.loss : 'none'}
                    strokeWidth={isLoss ? 1.5 : 0}
                    pointerEvents="none"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                </g>
              );
            })}

            {/* Horizontal crosshair — from dot to Y-axis */}
            {lockedId && lockedPoint && (
              <line
                x1={0} y1={lockedPoint.y}
                x2={lockedPoint.x} y2={lockedPoint.y}
                stroke="#888888"
                strokeWidth={1}
                strokeOpacity={0.4}
                strokeDasharray="3 4"
                pointerEvents="none"
              />
            )}

            {/* Hover tooltip */}
            {lockedId && lockedPoint && lockedDatum && (
              <foreignObject
                x={0} y={0} width={innerWidth} height={innerHeight}
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${lockedPoint.x}px`,
                    top: `${Math.max(0, lockedPoint.y - 96)}px`,
                    transform: `translateX(${lockedPoint.x > innerWidth - 140 ? '-100%' : lockedPoint.x < 140 ? '0%' : '-50%'})`,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.8)',
                    whiteSpace: 'nowrap',
                    background: 'var(--gs-dark-3, #1C1C1C)',
                    padding: '6px 10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontVariantNumeric: 'tabular-nums',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 11, color: 'white', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lockedDatum.name}
                  </span>
                  <span style={{ color: venueColor(lockedDatum.venue), fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {venueLabel(lockedDatum.venue)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {formatGun(lockedDatum.costGun)} GUN
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {lockedDatum.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    ${lockedDatum.currentValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {lockedDatum.pnlPct !== null && (
                    <span style={{
                      color: lockedDatum.pnlPct >= 0 ? chartTheme.colors.profit : chartTheme.colors.loss,
                      fontWeight: 600,
                    }}>
                      {lockedDatum.pnlPct >= 0 ? '+' : ''}{lockedDatum.pnlPct.toFixed(1)}% P&amp;L
                    </span>
                  )}
                </div>
              </foreignObject>
            )}
          </g>

          {/* Fixed axes — rendered outside clipPath so they never get clipped */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            numTicks={Math.min(rangeDays < 3 ? 3 : 5, Math.floor(innerWidth / 80))}
            tickFormat={(v) => {
              const d = v as Date;
              if (rangeDays < 3) {
                // Always include date context even for same-day acquisitions
                return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
              }
              if (rangeDays < 60) {
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }
              return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            }}
            stroke={chartTheme.colors.axis}
            tickStroke={chartTheme.colors.axis}
            tickLabelProps={{
              fill: chartTheme.colors.axisLabel,
              fontSize: 10,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
          />

          {/* Cost axis labels (Y-axis) */}
          {(() => {
            const labelX = margin.left >= 40 ? -8 : 30;
            return (
              <>
                <text
                  x={labelX} y={-22}
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
                    x={labelX}
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
              </>
            );
          })()}
        </Group>
      </svg>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  AcquisitionTimeline — outer component                             */
/* ------------------------------------------------------------------ */

export default function AcquisitionTimeline({ nfts, gunPrice, embedded, zoomRef, onZoomChange }: AcquisitionTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  const chartMargin = embedded ? MARGIN_EMBEDDED : MARGIN;

  const timelineData = useMemo<TimelineDatum[]>(() => {
    return nfts
      .filter(nft => nft.purchasePriceGun != null && nft.purchasePriceGun > 0 && nft.purchaseDate)
      .map(nft => {
        const costGun = nft.purchasePriceGun!;
        const exitGun = nft.marketExitGun;
        const usdVal = exitGun != null && gunPrice ? exitGun * gunPrice : (costGun * (gunPrice ?? 0));
        const pnlPct = exitGun != null && costGun > 0
          ? ((exitGun - costGun) / costGun) * 100
          : null;
        return {
          id: nft.tokenId,
          name: nft.name,
          date: new Date(nft.purchaseDate!),
          costGun,
          venue: nft.acquisitionVenue ?? 'unknown',
          quantity: nft.quantity ?? 1,
          quality: nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '',
          currentValueUsd: usdVal,
          pnlPct,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [nfts, gunPrice]);

  const venueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of timelineData) {
      const key = venueLabel(d.venue);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [timelineData]);

  const hasData = timelineData.length >= 2;
  const chartHeight = embedded ? CHART_HEIGHT_EMBEDDED : CHART_HEIGHT;

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

  // Shift+wheel zoom (native listener for preventDefault)
  useShiftWheelZoom(svgContainerRef, zoomObjRef, { left: chartMargin.left, top: chartMargin.top });

  // Expose imperative handle for parent's zoom preset buttons
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
      {hasData ? (
        <ParentSize debounceTime={100}>
          {({ width: rawWidth }: { width: number }) => {
            const w = Math.floor(rawWidth);
            if (w <= 0) return null;

            const iW = w - chartMargin.left - chartMargin.right;
            const iH = chartHeight - chartMargin.top - chartMargin.bottom;
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
                    <TimelineChartZoomed
                      data={timelineData}
                      width={w}
                      height={chartHeight}
                      margin={chartMargin}
                      seenIdsRef={seenIdsRef}

                      onZoomChange={onZoomChange}
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
      ) : (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] text-center py-4">
          Need at least 2 NFTs with purchase dates to show timeline
        </p>
      )}

      {/* Legend + locked item data */}
      {hasData && (
        <div className="flex items-center gap-3 mt-2 h-[28px]">
          {venueCounts.map(([venue]) => {
            const originalKey = timelineData.find(d => venueLabel(d.venue) === venue)?.venue ?? 'unknown';
            const color = venueColor(originalKey);
            return (
              <div key={venue} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 4px ${color}40`,
                  }}
                />
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">{venue}</span>
              </div>
            );
          })}

        </div>
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
          Acquisition Timeline
        </p>
        <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
          {timelineData.length} purchases
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {venueCounts.slice(0, 3).map(([venue, count]) => {
            const originalKey = timelineData.find(d => venueLabel(d.venue) === venue)?.venue ?? 'unknown';
            return (
              <span
                key={venue}
                className="font-mono text-micro tabular-nums px-1.5 py-0.5"
                style={{ backgroundColor: `${venueColor(originalKey)}0D`, color: venueColor(originalKey) }}
              >
                {count} {venue}
              </span>
            );
          })}
          <span className="font-mono text-micro text-[var(--gs-gray-3)] ml-1">
            {expanded ? '\u25B4' : '\u25BE'}
          </span>
        </span>
      </button>

      {expanded && chartBody}
    </div>
  );
}
