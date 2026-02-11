'use client';

import { useState, useMemo, useCallback, useRef } from 'react';

// Realistic 24-point portfolio value series (simulates ~7 days of hourly snapshots)
const DEMO_VALUES_UP = [
  42.10, 41.80, 42.50, 43.20, 42.90, 43.80, 44.10, 43.60,
  44.50, 45.20, 44.80, 45.60, 46.10, 45.40, 46.80, 47.20,
  46.50, 47.80, 47.10, 48.20, 47.60, 48.50, 47.90, 47.72,
];

const DEMO_VALUES_DOWN = [
  52.30, 51.80, 52.10, 50.90, 51.40, 50.20, 49.80, 50.50,
  49.20, 48.80, 49.50, 48.10, 47.60, 48.30, 47.10, 46.80,
  47.40, 46.20, 46.80, 45.90, 46.40, 45.50, 46.10, 45.72,
];

// NFT-only value series (subset of total portfolio — just the NFT portion)
const DEMO_NFT_UP = [
  38.20, 37.90, 38.60, 39.10, 38.80, 39.50, 39.90, 39.30,
  40.10, 40.60, 40.30, 41.00, 41.40, 40.80, 42.00, 42.30,
  41.70, 42.80, 42.20, 43.10, 42.60, 43.30, 42.80, 47.18,
];

const DEMO_NFT_DOWN = [
  48.10, 47.60, 47.90, 46.80, 47.20, 46.10, 45.70, 46.30,
  45.10, 44.70, 45.30, 44.00, 43.50, 44.10, 43.00, 42.70,
  43.20, 42.10, 42.60, 41.80, 42.20, 41.40, 41.90, 41.50,
];

type Trend = 'up' | 'down';

// ────────────────────────────────────────────────────────────
// Monotone cubic Hermite interpolation (Fritsch-Carlson)
// Same algorithm as visx curveMonotoneX / d3-shape curveMonotoneX
// ────────────────────────────────────────────────────────────
function monotoneCubicPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 2) return '';
  if (n === 2) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;

  const dxs: number[] = [];
  const deltas: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    deltas.push(dx === 0 ? 0 : dy / dx);
  }

  const tangents: number[] = [deltas[0]];
  for (let i = 1; i < n - 1; i++) {
    tangents.push(deltas[i - 1] * deltas[i] <= 0 ? 0 : (deltas[i - 1] + deltas[i]) / 2);
  }
  tangents.push(deltas[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(deltas[i]) < 1e-12) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / deltas[i];
      const b = tangents[i + 1] / deltas[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tangents[i] = t * a * deltas[i];
        tangents[i + 1] = t * b * deltas[i];
      }
    }
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dxs[i] / 3;
    d += ` C ${(points[i].x + seg).toFixed(1)} ${(points[i].y + tangents[i] * seg).toFixed(1)}, ${(points[i + 1].x - seg).toFixed(1)} ${(points[i + 1].y - tangents[i + 1] * seg).toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`;
  }
  return d;
}

// ────────────────────────────────────────────────────────────
// Shared: compute smooth SVG path from values
// ────────────────────────────────────────────────────────────
function useSparklinePath(values: number[], width: number, height: number, padding = 0) {
  return useMemo(() => {
    if (values.length < 2) return { path: '', fillPath: '', points: [] as { x: number; y: number }[] };

    const chartW = width - padding * 2;
    const chartH = height - padding * 2;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((v, i) => ({
      x: padding + (i / (values.length - 1)) * chartW,
      y: padding + chartH - ((v - min) / range) * chartH,
    }));

    const path = monotoneCubicPath(points);
    const fillPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${padding} ${height} Z`;

    return { path, fillPath, points };
  }, [values, width, height, padding]);
}

// ────────────────────────────────────────────────────────────
// Shared: hover tooltip logic
// ────────────────────────────────────────────────────────────
function useHoverInteraction(values: number[], points: { x: number; y: number }[], containerWidth: number) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement | HTMLDivElement>) => {
      if (points.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      const idx = Math.round(pct * (values.length - 1));
      setHoverIndex(Math.max(0, Math.min(values.length - 1, idx)));
    },
    [values.length, points.length],
  );

  const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

  return { hoverIndex, handleMouseMove, handleMouseLeave };
}

// ────────────────────────────────────────────────────────────
// Shared metric row (24h / 7d change labels)
// ────────────────────────────────────────────────────────────
function MetricRow({ trend }: { trend: Trend }) {
  const isUp = trend === 'up';
  return (
    <div className="flex items-center gap-3 mt-1">
      <span className="font-mono text-[13px]">
        <span className="text-[var(--gs-gray-3)] mr-1">24h</span>
        <span className={isUp ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}>
          {isUp ? '+$0.62' : '-$0.38'}
        </span>
        <span className={`text-data ml-0.5 ${isUp ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
          ({isUp ? '+1.3%' : '-0.8%'})
        </span>
      </span>
      <span className="font-mono text-[13px]">
        <span className="text-[var(--gs-gray-3)] mr-1">7d</span>
        <span className={isUp ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}>
          {isUp ? '+$5.62' : '-$6.58'}
        </span>
        <span className={`text-data ml-0.5 ${isUp ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
          ({isUp ? '+13.3%' : '-12.6%'})
        </span>
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Shared: bottom metrics bar
// ────────────────────────────────────────────────────────────
function BottomMetrics({ showNftOverlay, onToggleNftOverlay }: { showNftOverlay?: boolean; onToggleNftOverlay?: () => void }) {
  return (
    <div className="grid grid-cols-4 border-t border-white/[0.06]">
      {[
        { label: 'GUN Holdings', value: '19', color: 'text-[var(--gs-lime)]' },
        { label: 'GUN Value', value: '$0.54', color: 'text-[var(--gs-white)]' },
        { label: 'NFT Value', value: '$47.18', color: 'text-[var(--gs-purple)]', toggle: true },
        { label: 'Profit / Loss', value: '\u2014', color: 'text-[var(--gs-gray-3)]' },
      ].map((m, i) => (
        <div
          key={m.label}
          className={`p-4 ${i > 0 ? 'border-l border-white/[0.06]' : ''} ${m.toggle ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${m.toggle && showNftOverlay ? 'bg-[var(--gs-purple)]/[0.06]' : ''}`}
          onClick={m.toggle ? onToggleNftOverlay : undefined}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">{m.label}</p>
            {m.toggle && (
              <div className={`size-1.5 rounded-full transition-colors ${showNftOverlay ? 'bg-[var(--gs-purple)]' : 'bg-[var(--gs-gray-3)]/40'}`} />
            )}
          </div>
          <p className={`font-display text-lg font-semibold tabular-nums ${m.color}`}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VARIANT A: Ambient Backdrop
// ════════════════════════════════════════════════════════════
function AmbientBackdrop({ trend }: { trend: Trend }) {
  const values = trend === 'up' ? DEMO_VALUES_UP : DEMO_VALUES_DOWN;
  const nftValues = trend === 'up' ? DEMO_NFT_UP : DEMO_NFT_DOWN;
  const currentValue = values[values.length - 1];
  const W = 800;
  const H = 120;
  const [showNftOverlay, setShowNftOverlay] = useState(false);

  // Both sparklines share the same min/max scale so they overlap correctly
  const allValues = showNftOverlay ? [...values, ...nftValues] : values;
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);

  // Total portfolio sparkline (smooth curves)
  const { path, fillPath, points } = useMemo(() => {
    if (values.length < 2) return { path: '', fillPath: '', points: [] as { x: number; y: number }[] };
    const range = globalMax - globalMin || 1;
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: H - ((v - globalMin) / range) * H,
    }));
    const p = monotoneCubicPath(pts);
    const fp = `${p} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L 0 ${H} Z`;
    return { path: p, fillPath: fp, points: pts };
  }, [values, globalMin, globalMax]);

  // NFT-only sparkline (smooth curves)
  const nft = useMemo(() => {
    if (!showNftOverlay || nftValues.length < 2) return { path: '', fillPath: '', points: [] as { x: number; y: number }[] };
    const range = globalMax - globalMin || 1;
    const pts = nftValues.map((v, i) => ({
      x: (i / (nftValues.length - 1)) * W,
      y: H - ((v - globalMin) / range) * H,
    }));
    const p = monotoneCubicPath(pts);
    const fp = `${p} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L 0 ${H} Z`;
    return { path: p, fillPath: fp, points: pts };
  }, [nftValues, showNftOverlay, globalMin, globalMax]);

  const color = trend === 'up' ? 'var(--gs-lime)' : 'var(--gs-loss)';
  const nftColor = 'var(--gs-purple)';
  const gradId = `ambient-fill-${trend}`;
  const nftGradId = `ambient-nft-fill-${trend}`;
  const { hoverIndex, handleMouseMove, handleMouseLeave } = useHoverInteraction(values, points, W);

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverValue = hoverIndex !== null ? values[hoverIndex] : null;
  const hoverNftPoint = hoverIndex !== null && showNftOverlay && nft.points[hoverIndex] ? nft.points[hoverIndex] : null;
  const hoverNftValue = hoverIndex !== null && showNftOverlay ? nftValues[hoverIndex] : null;

  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner">
      <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent" />

      {/* Top block — relative container for the backdrop */}
      <div className="relative overflow-hidden" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        {/* SVG backdrop — fills the entire block, positioned behind content */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.12" />
              <stop offset="70%" stopColor={color} stopOpacity="0.03" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {showNftOverlay && (
              <linearGradient id={nftGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={nftColor} stopOpacity="0.10" />
                <stop offset="70%" stopColor={nftColor} stopOpacity="0.02" />
                <stop offset="100%" stopColor={nftColor} stopOpacity="0" />
              </linearGradient>
            )}
          </defs>

          {/* Total portfolio line */}
          <path d={fillPath} fill={`url(#${gradId})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round" />

          {/* NFT overlay line */}
          {showNftOverlay && (
            <>
              <path d={nft.fillPath} fill={`url(#${nftGradId})`} />
              <path d={nft.path} fill="none" stroke={nftColor} strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Hover: dots on both lines */}
          {hoverPoint && (
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3" fill="white" opacity="0.7" />
          )}
          {hoverNftPoint && (
            <circle cx={hoverNftPoint.x} cy={hoverNftPoint.y} r="2.5" fill="var(--gs-purple)" opacity="0.8" />
          )}
        </svg>

        {/* Hover: price + date following cursor */}
        {hoverPoint && hoverValue !== null && hoverIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none flex flex-col items-center"
            style={{
              left: `${(hoverPoint.x / W) * 100}%`,
              bottom: '6px',
              transform: 'translateX(-50%)',
            }}
          >
            <span className="font-mono text-micro tabular-nums text-[var(--gs-gray-4)]">
              ${hoverValue.toFixed(2)}
            </span>
            {showNftOverlay && hoverNftValue !== null && (
              <span className="font-mono text-micro tabular-nums text-[var(--gs-purple)]">
                ${hoverNftValue.toFixed(2)}
              </span>
            )}
            <span className="font-mono text-micro tabular-nums text-[var(--gs-gray-2)]">
              {(() => {
                const daysAgo = Math.round((1 - hoverIndex / (values.length - 1)) * 7);
                return daysAgo === 0 ? 'Now' : `${daysAgo}d ago`;
              })()}
            </span>
          </div>
        )}

        {/* Content sits on top */}
        <div className="relative z-10 p-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                  Total Portfolio Value
                </p>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 rounded-full bg-[var(--gs-profit)]" />
                  ))}
                </span>
              </div>
              <p className="font-display text-4xl font-bold text-[var(--gs-white)]">
                ${currentValue.toFixed(2)}
              </p>
              <MetricRow trend={trend} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-micro tracking-wider uppercase text-[var(--gs-gray-3)]">Insanity Mode</span>
              <div className="relative w-7 h-3.5 rounded-full bg-white/[0.08] border border-white/[0.12]">
                <div className="absolute top-[2px] left-[2px] size-2 rounded-full bg-[var(--gs-gray-3)]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomMetrics showNftOverlay={showNftOverlay} onToggleNftOverlay={() => setShowNftOverlay(prev => !prev)} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VARIANT B: Co-Equal Element
// ════════════════════════════════════════════════════════════
function CoEqual({ trend }: { trend: Trend }) {
  const values = trend === 'up' ? DEMO_VALUES_UP : DEMO_VALUES_DOWN;
  const currentValue = values[values.length - 1];
  const W = 320;
  const H = 88;
  const { path, fillPath, points } = useSparklinePath(values, W, H, 6);
  const color = trend === 'up' ? 'var(--gs-lime)' : 'var(--gs-loss)';
  const { hoverIndex, handleMouseMove, handleMouseLeave } = useHoverInteraction(values, points, W);
  const gradId = `coequal-fill-${trend}`;

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverValue = hoverIndex !== null ? values[hoverIndex] : null;

  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner">
      <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent" />

      <div className="p-6 pb-4">
        <div className="flex justify-between items-start gap-6">
          {/* Left: Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                Total Portfolio Value
              </p>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 rounded-full bg-[var(--gs-profit)]" />
                ))}
              </span>
            </div>
            <p className="font-display text-4xl font-bold text-[var(--gs-white)]">
              ${currentValue.toFixed(2)}
            </p>
            <MetricRow trend={trend} />
          </div>

          {/* Right: Chart */}
          <div className="shrink-0 relative">
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              className="cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={fillPath} fill={`url(#${gradId})`} />
              <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Current value dot */}
              {points.length > 0 && (
                <>
                  <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} opacity="0.3" />
                  <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
                </>
              )}

              {/* Hover crosshair + dot */}
              {hoverPoint && (
                <>
                  <line x1={hoverPoint.x} y1="0" x2={hoverPoint.x} y2={H} stroke="white" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 2" />
                  <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3" fill="white" opacity="0.9" />
                </>
              )}
            </svg>

            {/* Hover tooltip */}
            {hoverPoint && hoverValue !== null && (
              <div
                className="absolute -top-8 pointer-events-none"
                style={{ left: `${(hoverPoint.x / W) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <span className="font-mono text-caption tabular-nums text-[var(--gs-white)] bg-[var(--gs-dark-1)] border border-white/[0.1] px-1.5 py-0.5">
                  ${hoverValue.toFixed(2)}
                </span>
              </div>
            )}

            {/* Time labels */}
            <div className="flex justify-between mt-1 px-1.5">
              <span className="font-mono text-micro text-[var(--gs-gray-2)]">7d ago</span>
              <span className="font-mono text-micro text-[var(--gs-gray-2)]">Now</span>
            </div>
          </div>
        </div>
      </div>

      <BottomMetrics />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VARIANT C: Hero Chart
// ════════════════════════════════════════════════════════════
function HeroChart({ trend }: { trend: Trend }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const values = trend === 'up' ? DEMO_VALUES_UP : DEMO_VALUES_DOWN;
  const currentValue = values[values.length - 1];
  const W = 800;
  const H = 160;
  const PADDING_TOP = 48;
  const PADDING_BOTTOM = 24;

  const { path, fillPath, points } = useMemo(() => {
    if (values.length < 2) return { path: '', fillPath: '', points: [] as { x: number; y: number }[] };

    const chartH = H - PADDING_TOP - PADDING_BOTTOM;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: PADDING_TOP + chartH - ((v - min) / range) * chartH,
    }));

    const p = monotoneCubicPath(pts);
    const fp = `${p} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L 0 ${H} Z`;

    return { path: p, fillPath: fp, points: pts };
  }, [values]);

  const color = trend === 'up' ? 'var(--gs-lime)' : 'var(--gs-loss)';
  const { hoverIndex, handleMouseMove, handleMouseLeave } = useHoverInteraction(values, points, W);
  const gradId = `hero-fill-${trend}`;

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverValue = hoverIndex !== null ? values[hoverIndex] : null;

  // Y-axis price labels
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const midVal = (minVal + maxVal) / 2;

  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner">
      <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent" />

      {/* Hero chart zone — full width, interactive */}
      <div className="relative" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <svg
          ref={svgRef}
          className="w-full cursor-crosshair"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ height: '160px' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="60%" stopColor={color} stopOpacity="0.06" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={pct}
              x1="0"
              y1={PADDING_TOP + (H - PADDING_TOP - PADDING_BOTTOM) * pct}
              x2={W}
              y2={PADDING_TOP + (H - PADDING_TOP - PADDING_BOTTOM) * pct}
              stroke="white"
              strokeOpacity="0.04"
              strokeWidth="1"
            />
          ))}

          <path d={fillPath} fill={`url(#${gradId})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Current value dot with glow */}
          {points.length > 0 && (
            <>
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="6" fill={color} opacity="0.2" />
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
            </>
          )}

          {/* Hover crosshair */}
          {hoverPoint && (
            <>
              <line x1={hoverPoint.x} y1={PADDING_TOP} x2={hoverPoint.x} y2={H - PADDING_BOTTOM} stroke="white" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="3 3" />
              <line x1="0" y1={hoverPoint.y} x2={W} y2={hoverPoint.y} stroke="white" strokeWidth="0.5" strokeOpacity="0.15" strokeDasharray="3 3" />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r="4" fill="white" opacity="0.9" />
            </>
          )}
        </svg>

        {/* Overlay: Value badge (top-left) */}
        <div className="absolute top-4 left-5 z-10">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
              Total Portfolio Value
            </p>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 rounded-full bg-[var(--gs-profit)]" />
              ))}
            </span>
          </div>
          <p className="font-display text-3xl font-bold text-[var(--gs-white)]">
            ${currentValue.toFixed(2)}
          </p>
        </div>

        {/* Overlay: 24h/7d changes (top-right) */}
        <div className="absolute top-4 right-5 z-10 text-right">
          <MetricRow trend={trend} />
          <div className="flex items-center gap-2 mt-2 justify-end">
            <span className="font-mono text-micro tracking-wider uppercase text-[var(--gs-gray-3)]">Insanity Mode</span>
            <div className="relative w-7 h-3.5 rounded-full bg-white/[0.08] border border-white/[0.12]">
              <div className="absolute top-[2px] left-[2px] size-2 rounded-full bg-[var(--gs-gray-3)]" />
            </div>
          </div>
        </div>

        {/* Hover value tooltip */}
        {hoverPoint && hoverValue !== null && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: `${(hoverPoint.x / W) * 100}%`,
              top: `${(hoverPoint.y / H) * 100}%`,
              transform: 'translate(-50%, -140%)',
            }}
          >
            <span className="font-mono text-xs tabular-nums text-[var(--gs-white)] bg-[var(--gs-dark-1)]/90 border border-white/[0.12] px-2 py-1 backdrop-blur-sm">
              ${hoverValue.toFixed(2)}
            </span>
          </div>
        )}

        {/* Y-axis labels */}
        <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between pointer-events-none" style={{ paddingTop: `${(PADDING_TOP / H) * 100}%`, paddingBottom: `${(PADDING_BOTTOM / H) * 100}%` }}>
          <span className="font-mono text-micro tabular-nums text-[var(--gs-gray-2)]">${maxVal.toFixed(0)}</span>
          <span className="font-mono text-micro tabular-nums text-[var(--gs-gray-2)]">${midVal.toFixed(0)}</span>
          <span className="font-mono text-micro tabular-nums text-[var(--gs-gray-2)]">${minVal.toFixed(0)}</span>
        </div>

        {/* Time labels at bottom */}
        <div className="absolute bottom-1 left-5 right-5 flex justify-between pointer-events-none">
          <span className="font-mono text-micro text-[var(--gs-gray-2)]">7d ago</span>
          <span className="font-mono text-micro text-[var(--gs-gray-2)]">5d</span>
          <span className="font-mono text-micro text-[var(--gs-gray-2)]">3d</span>
          <span className="font-mono text-micro text-[var(--gs-gray-2)]">1d</span>
          <span className="font-mono text-micro text-[var(--gs-gray-2)]">Now</span>
        </div>
      </div>

      <BottomMetrics />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Export: All three concepts in a section
// ════════════════════════════════════════════════════════════
export default function SparklineConcepts() {
  const [trend, setTrend] = useState<Trend>('up');

  return (
    <div className="space-y-12">
      {/* Trend toggle */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">Demo trend:</span>
        <div role="radiogroup" aria-label="Trend direction" className="flex border border-white/[0.06] w-fit clip-corner-sm">
          <button
            role="radio"
            aria-checked={trend === 'up'}
            onClick={() => setTrend('up')}
            className={`px-4 py-1.5 font-mono text-caption uppercase tracking-widest transition-colors border-r border-white/[0.06] ${
              trend === 'up' ? 'bg-[var(--gs-profit)]/10 text-[var(--gs-profit)]' : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
            }`}
          >
            Uptrend
          </button>
          <button
            role="radio"
            aria-checked={trend === 'down'}
            onClick={() => setTrend('down')}
            className={`px-4 py-1.5 font-mono text-caption uppercase tracking-widest transition-colors ${
              trend === 'down' ? 'bg-[var(--gs-loss)]/10 text-[var(--gs-loss)]' : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
            }`}
          >
            Downtrend
          </button>
        </div>
      </div>

      {/* Variant A: Ambient Backdrop */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display font-bold text-sm uppercase tracking-wider text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 px-2 py-0.5">A</span>
          <h3 className="font-display font-bold text-xl uppercase tracking-wide">Ambient Backdrop</h3>
        </div>
        <p className="font-body text-sm text-[var(--gs-gray-4)] mb-4 max-w-2xl">
          The chart fills the entire header as a subtle watermark. The dollar value stays hero. The line adds atmosphere without competing for attention.
        </p>
        <AmbientBackdrop trend={trend} />
      </div>

      {/* Variant B: Co-Equal Element */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display font-bold text-sm uppercase tracking-wider text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 px-2 py-0.5">B</span>
          <h3 className="font-display font-bold text-xl uppercase tracking-wide">Co&#8209;Equal Element</h3>
        </div>
        <p className="font-body text-sm text-[var(--gs-gray-4)] mb-4 max-w-2xl">
          The sparkline shares visual weight with the dollar value. Left column = what it&apos;s worth. Right column = where it&apos;s been. Hover the chart for point values.
        </p>
        <CoEqual trend={trend} />
      </div>

      {/* Variant C: Hero Chart */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display font-bold text-sm uppercase tracking-wider text-[var(--gs-white)] border border-white/30 px-2 py-0.5">C</span>
          <h3 className="font-display font-bold text-xl uppercase tracking-wide">Hero Chart</h3>
        </div>
        <p className="font-body text-sm text-[var(--gs-gray-4)] mb-4 max-w-2xl">
          The chart IS the main visual. Full-width, full-height with grid lines and axis labels. The dollar value becomes an overlay badge. Hover for crosshair + value tooltip.
        </p>
        <HeroChart trend={trend} />
      </div>
    </div>
  );
}
