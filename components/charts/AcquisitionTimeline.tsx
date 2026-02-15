'use client';

import { useState, useMemo, useRef } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleSqrt, scaleTime } from '@visx/scale';
import { AxisBottom } from '@visx/axis';
import { GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { NFT } from '@/lib/types';
import { chartTheme } from './theme';
import { useProximityLock, LockPoint } from './useProximityLock';
import { useGrabScroll } from './useGrabScroll';

interface AcquisitionTimelineProps {
  nfts: NFT[];
  gunPrice?: number;
  /** When true, renders only the chart body (no header, no border, always visible). */
  embedded?: boolean;
  /** Zoom level (1 = 100%, 2 = 200% width). Only used in embedded mode. */
  zoomLevel?: number;
}

interface TimelineDatum {
  id: string;
  name: string;
  date: Date;
  costGun: number;
  venue: string;
  quantity: number;
}

const MARGIN = { top: 28, right: 44, bottom: 32, left: 16 };
const CHART_HEIGHT = 180;

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

function formatGun(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (val >= 100) return val.toFixed(0);
  return val.toFixed(1);
}

function TimelineChart({
  data,
  width,
  height,
  gunPrice,
}: {
  data: TimelineDatum[];
  width: number;
  height: number;
  gunPrice?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const dateExtent = useMemo(() => {
    const dates = data.map(d => d.date.getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    // 15% padding, minimum 10 minutes — zooms into concentrated buying periods
    const pad = Math.max((max - min) * 0.15, 10 * 60 * 1000);
    return [new Date(min - pad), new Date(max + pad)] as [Date, Date];
  }, [data]);

  // Date range in days (for smart axis formatting)
  const rangeDays = useMemo(() => {
    return (dateExtent[1].getTime() - dateExtent[0].getTime()) / (1000 * 60 * 60 * 24);
  }, [dateExtent]);

  const maxCost = useMemo(() => Math.max(...data.map(d => d.costGun), 1), [data]);

  const xScale = useMemo(
    () => scaleTime<number>({ domain: dateExtent, range: [0, innerWidth] }),
    [dateExtent, innerWidth],
  );

  // sqrt scale for cost — compresses big outliers, spreads small values
  const yScale = useMemo(
    () => scaleSqrt<number>({ domain: [0, maxCost * 1.2], range: [innerHeight, 0] }),
    [maxCost, innerHeight],
  );

  // Collect unique venue colors for stem gradients
  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    for (const d of data) colors.add(venueColor(d.venue));
    return Array.from(colors);
  }, [data]);

  // Build lock-on points from data (in group coordinate space)
  const lockPoints: LockPoint[] = useMemo(
    () => data.map(d => ({ id: d.id, x: xScale(d.date), y: yScale(d.costGun) })),
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
            @keyframes timeline-scan-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes timeline-lock-pulse { 0% { r: 0; opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0.5; } }
          `}</style>
          {/* Glow filter */}
          <filter id="timeline-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Stem gradients — one per unique venue color */}
          {uniqueColors.map(color => (
            <linearGradient
              key={color}
              id={`stem-${color.replace(/[^a-zA-Z0-9]/g, '')}`}
              x1="0" y1="1" x2="0" y2="0"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0} />
              <stop offset="100%" stopColor={color} stopOpacity={0.5} />
            </linearGradient>
          ))}
        </defs>

        <Group left={MARGIN.left} top={MARGIN.top}>
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
          {data.map(d => {
            const cx = xScale(d.date);
            const cy = yScale(d.costGun);
            const isLocked = lockedId === d.id;
            const color = venueColor(d.venue);
            const gradientId = `stem-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

            return (
              <g key={d.id}>
                {/* Gradient stem from baseline to dot */}
                <line
                  x1={cx}
                  y1={innerHeight}
                  x2={cx}
                  y2={cy}
                  stroke={`url(#${gradientId})`}
                  strokeWidth={isLocked ? 2 : 1.5}
                  pointerEvents="none"
                  style={{ transition: 'stroke-width 200ms ease' }}
                />
                {/* Outer ambient glow */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLocked ? 12 : 7}
                  fill={color}
                  fillOpacity={isLocked ? 0.15 : 0.06}
                  pointerEvents="none"
                  style={{ transition: 'r 250ms ease, fill-opacity 250ms ease' }}
                />
                {/* Main dot */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isLocked ? 5.5 : 4}
                  fill={color}
                  fillOpacity={isLocked ? 1 : 0.8}
                  stroke={isLocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={isLocked ? 1.5 : 0.5}
                  filter={isLocked ? 'url(#timeline-glow)' : undefined}
                  pointerEvents="none"
                  style={{ transition: 'all 250ms ease' }}
                />
              </g>
            );
          })}

          {/* HUD lock-on overlay — rendered above all dots */}
          {lockedId && lockedPoint && lockedDatum && (() => {
            const color = venueColor(lockedDatum.venue);
            return (
              <g pointerEvents="none">
                {/* Crosshair guide lines — vertical to baseline, horizontal to left edge */}
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
                  r={20}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.3}
                  strokeWidth={1}
                  strokeDasharray="4 6"
                  style={{ transformOrigin: `${lockedPoint.x}px ${lockedPoint.y}px`, animation: 'timeline-scan-spin 4s linear infinite' }}
                />
                {/* Lock ring — solid, pulses on acquire */}
                <circle
                  cx={lockedPoint.x}
                  cy={lockedPoint.y}
                  r={14}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  style={{ animation: 'timeline-lock-pulse 600ms ease-out' }}
                />
              </g>
            );
          })()}

          {/* Time axis — smart formatting based on date range */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            numTicks={Math.min(rangeDays < 3 ? 3 : 5, Math.floor(innerWidth / 80))}
            tickFormat={(v) => {
              const d = v as Date;
              if (rangeDays < 1) {
                return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
              }
              if (rangeDays < 3) {
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

          {/* Cost axis label (right side) */}
          <text
            x={innerWidth + 8}
            y={2}
            fill="rgba(255,255,255,0.3)"
            fontSize={9}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="start"
            letterSpacing="0.12em"
          >
            GUN
          </text>

          {/* Cost scale markers along right edge */}
          {[maxCost * 0.25, maxCost * 0.5, maxCost * 0.75].filter(v => v > 0).map((val, i) => (
            <text
              key={i}
              x={innerWidth + 4}
              y={yScale(val)}
              fill={chartTheme.colors.axisLabel}
              fontSize={10}
              fontFamily={chartTheme.fonts.mono}
              textAnchor="start"
              dominantBaseline="middle"
            >
              {formatGun(val)}
            </text>
          ))}
        </Group>
      </svg>

      {/* Data strip — fixed at top-right of chart, no floating tooltip */}
      {lockedDatum && (() => {
        const color = venueColor(lockedDatum.venue);
        return (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'rgba(10,10,10,0.92)',
              borderLeft: `2px solid ${color}40`,
              borderBottom: `1px solid ${color}20`,
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
            <span style={{ fontWeight: 700, fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lockedDatum.name}
              {lockedDatum.quantity > 1 && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: 10 }}> &times;{lockedDatum.quantity}</span>}
            </span>
            <span style={{ color: 'white', fontWeight: 600 }}>
              {formatGun(lockedDatum.costGun)} GUN
            </span>
            {gunPrice && gunPrice > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                ${(lockedDatum.costGun * gunPrice).toFixed(2)}
              </span>
            )}
            <span
              style={{
                color,
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
                padding: '1px 5px',
                background: `${color}15`,
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
  );
}

export default function AcquisitionTimeline({ nfts, gunPrice, embedded, zoomLevel = 1 }: AcquisitionTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const grabScrollRef = useGrabScroll(zoomLevel > 1);

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
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [nfts]);

  // Venue breakdown
  const venueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of timelineData) {
      const key = venueLabel(d.venue);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [timelineData]);

  const hasData = timelineData.length >= 2;

  const chartHeight = Math.round(CHART_HEIGHT * Math.min(zoomLevel, 1.5));

  // Chart body content (shared between embedded and standalone)
  const chartBody = (
    <div className="px-4 pb-3">
      {hasData ? (
        <div
          ref={grabScrollRef}
          className="overflow-x-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
        >
          <div style={{ width: `${100 * zoomLevel}%`, minWidth: '100%' }}>
            <ParentSize debounceTime={100}>
              {({ width }: { width: number }) =>
                width > 0 ? (
                  <TimelineChart data={timelineData} width={width} height={chartHeight} gunPrice={gunPrice} />
                ) : null
              }
            </ParentSize>
          </div>
        </div>
      ) : (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] text-center py-4">
          Need at least 2 NFTs with purchase dates to show timeline
        </p>
      )}

      {/* Venue legend — pill style */}
      {hasData && venueCounts.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          {venueCounts.map(([venue]) => {
            const originalKey = timelineData.find(d => venueLabel(d.venue) === venue)?.venue ?? 'unknown';
            const color = venueColor(originalKey);
            return (
              <div key={venue} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
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
      {/* Header */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">
          Acquisition Timeline
        </p>
        <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 text-[#FF9F43] border border-[#FF9F43]/30 bg-[#FF9F43]/[0.08]">
          Under Active Dev
        </span>
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

      {/* Chart */}
      {expanded && chartBody}
    </div>
  );
}
