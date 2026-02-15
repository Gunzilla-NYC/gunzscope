'use client';

import { useState, useCallback, useMemo } from 'react';
import { Circle, Line } from '@visx/shape';
import { scaleLinear, scaleTime } from '@visx/scale';
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

const MARGIN = { top: 24, right: 16, bottom: 28, left: 16 };
const CHART_HEIGHT = 160;

const VENUE_COLORS: Record<string, string> = {
  decode: chartTheme.colors.lime,
  mint: chartTheme.colors.lime,
  system_mint: chartTheme.colors.lime,
  opensea: chartTheme.colors.purple,
  in_game_marketplace: '#FF9F43',
  otg_marketplace: '#FF9F43',
  transfer: 'rgba(255,255,255,0.3)',
  unknown: 'rgba(255,255,255,0.2)',
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
    const pad = Math.max((max - min) * 0.05, 12 * 60 * 60 * 1000); // min 12h pad
    return [new Date(min - pad), new Date(max + pad)] as [Date, Date];
  }, [data]);

  const maxCost = useMemo(() => Math.max(...data.map(d => d.costGun), 1), [data]);

  const xScale = useMemo(
    () => scaleTime<number>({ domain: dateExtent, range: [0, innerWidth] }),
    [dateExtent, innerWidth],
  );

  const yScale = useMemo(
    () => scaleLinear<number>({ domain: [0, maxCost * 1.15], range: [innerHeight, 0], nice: true }),
    [maxCost, innerHeight],
  );

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
        <Group left={MARGIN.left} top={MARGIN.top}>
          {/* Grid */}
          <GridColumns
            scale={xScale}
            height={innerHeight}
            numTicks={Math.min(5, Math.floor(innerWidth / 60))}
            stroke={chartTheme.colors.grid}
          />

          {/* Zero cost baseline */}
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

            return (
              <g key={d.id}>
                {/* Vertical stem from baseline */}
                <Line
                  from={{ x: cx, y: innerHeight }}
                  to={{ x: cx, y: cy }}
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={isHovered ? 0.5 : 0.2}
                />
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3.5}
                  fill={color}
                  fillOpacity={isHovered ? 1 : 0.7}
                  stroke={isHovered ? 'white' : 'none'}
                  strokeWidth={isHovered ? 1.5 : 0}
                  style={{ cursor: 'pointer', transition: 'r 150ms, fill-opacity 150ms' }}
                  onMouseEnter={() => handleMouseEnter(d, cx, cy)}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
            );
          })}

          {/* Time axis */}
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            numTicks={Math.min(5, Math.floor(innerWidth / 60))}
            tickFormat={(v) => {
              const d = v as Date;
              const now = new Date();
              const diff = now.getTime() - d.getTime();
              const days = diff / (1000 * 60 * 60 * 24);
              if (days < 1) return `${Math.round(days * 24)}h ago`;
              if (days < 30) return `${Math.round(days)}d ago`;
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
            {tooltipData.quantity > 1 && <span style={{ color: 'rgba(255,255,255,0.4)' }}> &times;{tooltipData.quantity}</span>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span>Cost: <span style={{ color: 'rgba(255,255,255,0.8)' }}>
              {tooltipData.costGun.toFixed(1)} GUN
              {gunPrice && gunPrice > 0 && <span style={{ color: 'rgba(255,255,255,0.4)' }}> (${(tooltipData.costGun * gunPrice).toFixed(2)})</span>}
            </span></span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
            <span style={{ color: venueColor(tooltipData.venue) }}>
              {venueLabel(tooltipData.venue)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>
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
          {venueCounts.slice(0, 2).map(([venue, count]) => (
            <span key={venue} className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
              {count} {venue}
            </span>
          ))}
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

          {/* Venue legend */}
          {hasData && venueCounts.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-2">
              {venueCounts.map(([venue]) => {
                // Find original venue key for color lookup
                const originalKey = timelineData.find(d => venueLabel(d.venue) === venue)?.venue ?? 'unknown';
                return (
                  <div key={venue} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: venueColor(originalKey) }} />
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
