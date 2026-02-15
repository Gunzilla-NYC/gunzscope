'use client';

import { useState, useCallback, useMemo } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleSqrt, scaleTime } from '@visx/scale';
import { AxisBottom } from '@visx/axis';
import { GridColumns } from '@visx/grid';
import { Group } from '@visx/group';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { NFT } from '@/lib/types';
import { chartTheme } from './theme';

interface AcquisitionTimelineProps {
  nfts: NFT[];
  gunPrice?: number;
}

interface TimelineDatum {
  id: string;
  name: string;
  date: Date;
  costGun: number;
  venue: string;
  quantity: number;
}

const MARGIN = { top: 28, right: 16, bottom: 32, left: 16 };
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
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } =
    useTooltip<TimelineDatum>();

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const dateExtent = useMemo(() => {
    const dates = data.map(d => d.date.getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const pad = Math.max((max - min) * 0.08, 12 * 60 * 60 * 1000);
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

  const handleMouseEnter = useCallback(
    (d: TimelineDatum, cx: number, cy: number) => {
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
              <stop offset="100%" stopColor={color} stopOpacity={0.35} />
            </linearGradient>
          ))}
        </defs>

        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Grid */}
          <GridColumns
            scale={xScale}
            height={innerHeight}
            numTicks={Math.min(rangeDays < 3 ? 3 : 5, Math.floor(innerWidth / 80))}
            stroke={chartTheme.colors.grid}
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
            const isHovered = hoveredId === d.id;
            const color = venueColor(d.venue);
            const gradientId = `stem-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

            return (
              <g key={d.id} style={{ cursor: 'pointer' }}>
                {/* Gradient stem from baseline to dot */}
                <line
                  x1={cx}
                  y1={innerHeight}
                  x2={cx}
                  y2={cy}
                  stroke={`url(#${gradientId})`}
                  strokeWidth={isHovered ? 2 : 1.5}
                  style={{ transition: 'stroke-width 200ms ease' }}
                />
                {/* Outer glow ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 10 : 6}
                  fill={color}
                  fillOpacity={isHovered ? 0.12 : 0.04}
                  style={{ transition: 'r 200ms ease, fill-opacity 200ms ease' }}
                />
                {/* Main dot */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : 4}
                  fill={color}
                  fillOpacity={isHovered ? 1 : 0.75}
                  stroke={isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth={isHovered ? 1.5 : 0.5}
                  filter={isHovered ? 'url(#timeline-glow)' : undefined}
                  style={{ transition: 'all 200ms ease' }}
                  onMouseEnter={() => handleMouseEnter(d, cx, cy)}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
            );
          })}

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
              fill: chartTheme.colors.text,
              fontSize: 9,
              fontFamily: chartTheme.fonts.mono,
              textAnchor: 'middle' as const,
            }}
          />

          {/* Cost axis label (right side, rotated) */}
          <text
            x={innerWidth + 8}
            y={2}
            fill="rgba(255,255,255,0.18)"
            fontSize={8}
            fontFamily={chartTheme.fonts.mono}
            textAnchor="start"
            letterSpacing="0.1em"
          >
            GUN
          </text>

          {/* Cost scale markers along right edge */}
          {[maxCost * 0.25, maxCost * 0.5, maxCost * 0.75].filter(v => v > 0).map((val, i) => (
            <text
              key={i}
              x={innerWidth + 4}
              y={yScale(val)}
              fill="rgba(255,255,255,0.15)"
              fontSize={8}
              fontFamily={chartTheme.fonts.mono}
              textAnchor="start"
              dominantBaseline="middle"
            >
              {formatGun(val)}
            </text>
          ))}
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            background: 'rgba(14,14,14,0.96)',
            border: `1px solid ${venueColor(tooltipData.venue)}25`,
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
            {tooltipData.quantity > 1 && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}> &times;{tooltipData.quantity}</span>}
          </div>
          <div style={{ marginTop: 4, display: 'flex', gap: 16 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cost <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {formatGun(tooltipData.costGun)} GUN
              </span>
            </span>
            {gunPrice && gunPrice > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                ${(tooltipData.costGun * gunPrice).toFixed(2)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
            <span
              style={{
                color: venueColor(tooltipData.venue),
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '1px 5px',
                background: `${venueColor(tooltipData.venue)}10`,
              }}
            >
              {venueLabel(tooltipData.venue)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>
              {tooltipData.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default function AcquisitionTimeline({ nfts, gunPrice }: AcquisitionTimelineProps) {
  const [expanded, setExpanded] = useState(false);

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
      {expanded && (
        <div className="px-2 pb-3">
          {hasData ? (
            <ParentSize debounceTime={100}>
              {({ width }: { width: number }) =>
                width > 0 ? (
                  <TimelineChart data={timelineData} width={width} height={CHART_HEIGHT} gunPrice={gunPrice} />
                ) : null
              }
            </ParentSize>
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
      )}
    </div>
  );
}
