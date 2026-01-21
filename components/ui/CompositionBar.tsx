'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

interface CompositionSegment {
  id: string;
  label: string;
  value: number;
  /** Display value (can differ from value for layout purposes) */
  displayValue?: string;
  color: string;
  /** For unpriced segments like NFTs */
  isUnpriced?: boolean;
  /** Additional info for tooltip */
  count?: number;
}

interface CompositionBarProps {
  segments: CompositionSegment[];
  height?: number;
  className?: string;
  /** Minimum segment width in percentage */
  minSegmentPercent?: number;
  /** Show segment labels inline */
  showInlineLabels?: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  segment: CompositionSegment | null;
}

export default function CompositionBar({
  segments,
  height = 8,
  className = '',
  minSegmentPercent = 3,
  showInlineLabels = false,
}: CompositionBarProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    segment: null,
  });
  const barRef = useRef<HTMLDivElement>(null);

  // Calculate total and percentages
  const { total, normalizedSegments } = useMemo(() => {
    // Filter out zero-value segments unless they're unpriced (NFTs)
    const validSegments = segments.filter(s => s.value > 0 || s.isUnpriced);
    const totalValue = validSegments.reduce((sum, s) => sum + (s.isUnpriced ? 0 : s.value), 0);

    if (validSegments.length === 0) {
      return { total: 0, normalizedSegments: [] };
    }

    // Calculate raw percentages
    let normalized = validSegments.map(segment => {
      const rawPercent = segment.isUnpriced
        ? minSegmentPercent // Give unpriced segments minimum width
        : totalValue > 0
          ? (segment.value / totalValue) * 100
          : 0;
      return {
        ...segment,
        percent: rawPercent,
      };
    });

    // Ensure minimum widths and normalize to 100%
    const totalPercent = normalized.reduce((sum, s) => sum + Math.max(s.percent, minSegmentPercent), 0);
    const scale = totalPercent > 0 ? 100 / totalPercent : 1;

    normalized = normalized.map(s => ({
      ...s,
      percent: Math.max(s.percent, minSegmentPercent) * scale,
    }));

    return { total: totalValue, normalizedSegments: normalized };
  }, [segments, minSegmentPercent]);

  const handleMouseEnter = (e: React.MouseEvent, segment: CompositionSegment & { percent: number }) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: -40,
        segment,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (rect && tooltip.visible) {
      setTooltip(prev => ({
        ...prev,
        x: e.clientX - rect.left,
      }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false, segment: null }));
  };

  // Close tooltip on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [tooltip.visible]);

  if (normalizedSegments.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <div
          className="w-full rounded-full bg-white/5 overflow-hidden"
          style={{ height }}
        >
          <div className="h-full w-full bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={barRef}>
      {/* Main bar */}
      <div
        className="w-full rounded-full bg-white/5 overflow-hidden flex"
        style={{ height }}
      >
        {normalizedSegments.map((segment, index) => (
          <div
            key={segment.id}
            className={`
              h-full transition-all duration-300 cursor-pointer
              ${index === 0 ? 'rounded-l-full' : ''}
              ${index === normalizedSegments.length - 1 ? 'rounded-r-full' : ''}
              hover:brightness-125
            `}
            style={{
              width: `${segment.percent}%`,
              backgroundColor: segment.isUnpriced ? 'transparent' : segment.color,
              backgroundImage: segment.isUnpriced
                ? `repeating-linear-gradient(
                    45deg,
                    ${segment.color}20,
                    ${segment.color}20 2px,
                    ${segment.color}40 2px,
                    ${segment.color}40 4px
                  )`
                : undefined,
            }}
            onMouseEnter={(e) => handleMouseEnter(e, segment)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.segment && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-black/95 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: tooltip.segment.color,
                  backgroundImage: tooltip.segment.isUnpriced
                    ? `repeating-linear-gradient(45deg, ${tooltip.segment.color}40, ${tooltip.segment.color}40 1px, ${tooltip.segment.color}80 1px, ${tooltip.segment.color}80 2px)`
                    : undefined,
                }}
              />
              <span className="font-medium text-white">{tooltip.segment.label}</span>
            </div>
            <div className="text-white/60">
              {tooltip.segment.isUnpriced ? (
                <div>
                  <span className="block">
                    {tooltip.segment.count !== undefined ? `${tooltip.segment.count} items` : 'Unpriced'}
                  </span>
                  <span className="block text-[10px] text-white/40 mt-1">
                    NFTs are currently unpriced and excluded from portfolio value.
                  </span>
                </div>
              ) : (
                <span>
                  {tooltip.segment.displayValue || `$${tooltip.segment.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"
            style={{ bottom: -4 }}
          />
        </div>
      )}

      {/* Inline labels (optional) */}
      {showInlineLabels && (
        <div className="flex mt-2 gap-4">
          {normalizedSegments.map(segment => (
            <div key={segment.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: segment.isUnpriced ? 'transparent' : segment.color,
                  backgroundImage: segment.isUnpriced
                    ? `repeating-linear-gradient(45deg, ${segment.color}40, ${segment.color}40 1px, ${segment.color}80 1px, ${segment.color}80 2px)`
                    : undefined,
                  border: segment.isUnpriced ? `1px solid ${segment.color}40` : undefined,
                }}
              />
              <span className="text-[12px] text-white/55">
                {segment.label}
                {segment.isUnpriced && <span className="text-white/30 italic ml-1">(unpriced)</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
