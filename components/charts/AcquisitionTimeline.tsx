'use client';

import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleLog, scaleTime } from '@visx/scale';
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
}

const MARGIN = { top: 14, right: 16, bottom: 32, left: 16 };
/** Embedded mode uses the same dimensions as PnLScatterPlot for seamless crossfade. */
const MARGIN_EMBEDDED = { top: 40, right: 20, bottom: 38, left: 58 };
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
  seenIdsRef, onLockedDatumChange, onZoomChange,
  transformMatrix, isDragging,
  dragStart, dragMove, dragEnd,
}: {
  data: TimelineDatum[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  seenIdsRef: React.RefObject<Set<string>>;
  onLockedDatumChange?: (datum: TimelineDatum | null) => void;
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

  /* --- Stem gradient defs --- */

  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    for (const d of data) colors.add(venueColor(d.venue));
    return Array.from(colors);
  }, [data]);

  const stemGradientDefs = useMemo(
    () =>
      uniqueColors.map(color => (
        <linearGradient
          key={color}
          id={`stem-${color.replace(/[^a-zA-Z0-9]/g, '')}`}
          x1="0" y1="1" x2="0" y2="0"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0} />
          <stop offset="100%" stopColor={color} stopOpacity={0.5} />
        </linearGradient>
      )),
    [uniqueColors],
  );

  /* --- Proximity lock --- */

  const lockPoints: LockPoint[] = useMemo(
    () => data.map(d => ({ id: d.id, x: xScale(d.date), y: yScale(d.costGun) })),
    [data, xScale, yScale],
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
          <style>{HUD_KEYFRAMES}{`
            @keyframes star-appear {
              0%   { opacity: 0; transform: scale(0); }
              65%  { opacity: 1; transform: scale(1.12); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <GlowFilterDef id="timeline-glow" />
          {stemGradientDefs}
          <clipPath id="timeline-data-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <Group left={margin.left} top={margin.top}>
          {/* Clipped data area — grid, baseline, dots, HUD overlay */}
          <g clipPath="url(#timeline-data-clip)">
            {/* Grid */}
            <GridColumns
              scale={xScale}
              height={innerHeight}
              numTicks={Math.min(rangeDays < 3 ? 3 : 5, Math.floor(innerWidth / 80))}
              stroke={chartTheme.colors.gridStrong}
            />

            {/* Baseline */}
            <Line
              from={{ x: 0, y: innerHeight }}
              to={{ x: innerWidth, y: innerHeight }}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />

            {/* Data points */}
            {data.map((d) => {
              const cx = xScale(d.date);
              const cy = yScale(d.costGun);
              const isLocked = lockedId === d.id;
              const color = venueColor(d.venue);
              const gradientId = `stem-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
              const isNew = newIds.has(d.id);
              const staggerDelay = randomDelayMap.get(d.id) ?? 0;

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
                    stroke={`url(#${gradientId})`}
                    strokeWidth={isLocked ? 2 : 1.5}
                    pointerEvents="none"
                    style={{ transition: 'stroke-width 200ms ease' }}
                  />
                  <circle
                    cx={cx} cy={cy}
                    r={isLocked ? 12 : 7}
                    fill={color}
                    fillOpacity={isLocked ? 0.15 : 0.06}
                    pointerEvents="none"
                    style={{ transition: 'r 250ms ease, fill-opacity 250ms ease' }}
                  />
                  <Circle
                    cx={cx} cy={cy}
                    r={isLocked ? 5.5 : 4}
                    fill={color}
                    fillOpacity={isLocked ? 1 : 0.8}
                    stroke={isLocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isLocked ? 1.5 : 0.5}
                    filter={isLocked ? 'url(#timeline-glow)' : undefined}
                    pointerEvents="none"
                    data-dot=""
                    style={{ transition: 'r 250ms ease, fill-opacity 250ms ease, stroke 250ms ease, stroke-width 250ms ease' }}
                  />
                </g>
              );
            })}

            {/* HUD lock-on overlay */}
            {lockedId && lockedPoint && lockedDatum && (
              <HudLockOverlay
                point={lockedPoint}
                color={venueColor(lockedDatum.venue)}
                scanRadius={20}
                lockRadius={14}
                yExtent={innerHeight}
              />
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
  const [lockedDatum, setLockedDatum] = useState<TimelineDatum | null>(null);

  const chartMargin = embedded ? MARGIN_EMBEDDED : MARGIN;

  const timelineData = useMemo<TimelineDatum[]>(() => {
    return nfts
      .filter(nft => nft.purchasePriceGun != null && nft.purchasePriceGun > 0 && nft.purchaseDate)
      .map(nft => ({
        id: nft.tokenId,
        name: nft.name,
        date: new Date(nft.purchaseDate!),
        costGun: nft.purchasePriceGun!,
        venue: nft.acquisitionVenue ?? 'unknown',
        quantity: nft.quantity ?? 1,
        quality: nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '',
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [nfts]);

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
                      onLockedDatumChange={setLockedDatum}
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

          {lockedDatum && (() => {
            const venueCol = venueColor(lockedDatum.venue);
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
                <span style={{ display: 'inline-block', minWidth: 72, color: 'white', fontWeight: 600 }}>
                  {formatGun(lockedDatum.costGun)} GUN
                </span>
                {gunPrice && gunPrice > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                    ${(lockedDatum.costGun * gunPrice).toFixed(2)}
                  </span>
                )}
                <span
                  style={{
                    color: venueCol,
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    padding: '1px 5px',
                    background: `${venueCol}15`,
                  }}
                >
                  {venueLabel(lockedDatum.venue)}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                  {lockedDatum.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                </span>
              </div>
            );
          })()}
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
