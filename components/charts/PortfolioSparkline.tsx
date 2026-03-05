'use client';

import { useMemo, useId, useState, useCallback, useRef } from 'react';
import { LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { area as d3Area } from 'd3-shape';

// ── Types ──────────────────────────────────────────────────────────────

export interface SparklineDataPoint {
  timestamp: number; // unix ms
  marketValue: number; // in USD
  costBasis: number; // in USD, can be flat/constant or time-varying
}

export interface PortfolioSparklineProps {
  data: SparklineDataPoint[];
  width?: number;
  height?: number;
  showTooltip?: boolean;
}

// ── Inner chart (receives concrete width) ──────────────────────────────

const PAD_TOP = 20;
const PAD_BOTTOM = 8;

interface PctPoint {
  timestamp: number;
  pctValue: number;   // ((marketValue - costBasis) / costBasis) * 100
  marketValue: number; // raw USD for tooltip display
}

function Sparkline({
  data,
  width,
  height,
  showTooltip = false,
}: Required<Pick<PortfolioSparklineProps, 'height'>> & { data: SparklineDataPoint[]; width: number; showTooltip: boolean }) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // ── Transform to % change from cost basis ──────────────────────

  const pctData = useMemo<PctPoint[]>(
    () => data.map(d => ({
      timestamp: d.timestamp,
      pctValue: d.costBasis !== 0 ? ((d.marketValue - d.costBasis) / d.costBasis) * 100 : 0,
      marketValue: d.marketValue,
    })),
    [data],
  );

  // ── Scales ───────────────────────────────────────────────────────

  const [yDomainMin, yDomainMax] = useMemo(() => {
    if (pctData.length === 0) return [-10, 10];
    const pctValues = pctData.map(d => d.pctValue);
    const min = Math.min(...pctValues);
    const max = Math.max(...pctValues);
    // Symmetric breathing room — always include 0
    return [Math.min(min * 1.08, -1), Math.max(max * 1.08, 1)];
  }, [pctData]);

  const xScale = useMemo(() => {
    if (pctData.length < 2) return scaleLinear<number>({ domain: [0, 1], range: [0, width] });
    return scaleLinear<number>({
      domain: [pctData[0].timestamp, pctData[pctData.length - 1].timestamp],
      range: [0, width],
    });
  }, [pctData, width]);

  const yScale = useMemo(
    () => scaleLinear<number>({
      domain: [yDomainMin, yDomainMax],
      range: [height - PAD_BOTTOM, PAD_TOP],
    }),
    [yDomainMin, yDomainMax, height],
  );

  // ── Zero baseline Y position ───────────────────────────────────
  const zeroY = yScale(0);

  // ── Clip paths (split at zero line) ────────────────────────────

  // Region above zero → clips profit fill
  const clipAbovePath = useMemo(() => {
    if (pctData.length < 2) return '';
    return `M0,0 L${width},0 L${width},${zeroY} L0,${zeroY} Z`;
  }, [pctData.length, width, zeroY]);

  // Region below zero → clips loss fill
  const clipBelowPath = useMemo(() => {
    if (pctData.length < 2) return '';
    return `M0,${zeroY} L${width},${zeroY} L${width},${height + PAD_BOTTOM} L0,${height + PAD_BOTTOM} Z`;
  }, [pctData.length, width, zeroY, height]);

  // Area between the pct line and the zero baseline
  const betweenPath = useMemo(() => {
    if (pctData.length < 2) return '';
    const gen = d3Area<PctPoint>()
      .x(d => xScale(d.timestamp))
      .y0(zeroY)
      .y1(d => yScale(d.pctValue))
      .curve(curveMonotoneX);
    return gen(pctData) || '';
  }, [pctData, xScale, yScale, zeroY]);

  // ── Endpoint ─────────────────────────────────────────────────────

  const lastPct = pctData[pctData.length - 1];
  const isProfit = lastPct.pctValue >= 0;
  const dotColor = isProfit ? '#A6F700' : '#B44AFF';
  const endX = xScale(lastPct.timestamp);
  const endY = yScale(lastPct.pctValue);

  // ── Hover ────────────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!showTooltip || pctData.length < 2) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / width;
    const idx = Math.round(pct * (pctData.length - 1));
    setHoverIndex(Math.max(0, Math.min(pctData.length - 1, idx)));
  }, [pctData.length, width, showTooltip]);

  const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

  if (pctData.length < 2 || width <= 0 || height <= 0) return null;

  // ── Tooltip positioning (edge-aware) ───────────────────────────

  const hoverPoint = hoverIndex !== null ? pctData[hoverIndex] : null;
  const hoverX = hoverPoint ? xScale(hoverPoint.timestamp) : 0;
  const hoverY = hoverPoint ? yScale(hoverPoint.pctValue) : 0;

  // Estimated tooltip dimensions
  const tooltipW = 130;
  const tooltipH = 22;

  // Horizontal: flip to left if overflowing right edge
  const tooltipLeft = hoverX + tooltipW + 12 > width
    ? hoverX - tooltipW - 12
    : hoverX + 12;

  // Vertical: pin to chart bounds
  let tooltipTop = hoverY - tooltipH / 2;
  if (tooltipTop + tooltipH > height - 8) tooltipTop = height - tooltipH - 8;
  if (tooltipTop < 0) tooltipTop = 0;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Pulse animation for endpoint dot */}
          <style>{`
            @keyframes sparkline-pulse-${uid} {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
            .sp-${uid} { animation: sparkline-pulse-${uid} 2s ease-in-out infinite; }
          `}</style>

          {/* Vertical gradients — profit/loss fade to transparent at bottom */}
          <LinearGradient
            id={`${uid}-profit`}
            from="#A6F700" to="#A6F700"
            fromOpacity={0.25} toOpacity={0}
            x1="0%" y1="0%" x2="0%" y2="100%"
          />
          <LinearGradient
            id={`${uid}-loss`}
            from="#B44AFF" to="#B44AFF"
            fromOpacity={0.25} toOpacity={0}
            x1="0%" y1="0%" x2="0%" y2="100%"
          />

          {/* Clip regions split at zero baseline */}
          <clipPath id={`${uid}-above`}>
            <path d={clipAbovePath} />
          </clipPath>
          <clipPath id={`${uid}-below`}>
            <path d={clipBelowPath} />
          </clipPath>
        </defs>

        {/* ── Split gradient fill ─────────────────────────────────── */}

        {/* Green fill — visible only where pctValue >= 0 (profit) */}
        <path
          d={betweenPath}
          fill={`url(#${uid}-profit)`}
          clipPath={`url(#${uid}-above)`}
        />

        {/* Red fill — visible only where pctValue < 0 (loss) */}
        <path
          d={betweenPath}
          fill={`url(#${uid}-loss)`}
          clipPath={`url(#${uid}-below)`}
        />

        {/* ── Zero baseline (cost basis reference) ──────────────── */}

        <line
          x1={0} y1={zeroY} x2={width} y2={zeroY}
          stroke="#888888"
          strokeWidth={1}
          strokeOpacity={0.4}
          strokeDasharray="3 4"
        />

        {/* ── Pct change line ───────────────────────────────────── */}

        <LinePath
          data={pctData}
          x={d => xScale(d.timestamp)}
          y={d => yScale(d.pctValue)}
          curve={curveMonotoneX}
          stroke="#F0F0F0"
          strokeWidth={1.5}
          strokeOpacity={0.9}
          strokeLinecap="round"
        />

        {/* ── Glowing endpoint dot ────────────────────────────────── */}

        {/* Pulsing halo */}
        <circle
          cx={endX}
          cy={endY}
          r={5}
          fill={dotColor}
          fillOpacity={0.3}
          className={`sp-${uid}`}
        />
        {/* Solid core with drop-shadow glow */}
        <circle
          cx={endX}
          cy={endY}
          r={3}
          fill={dotColor}
          style={{ filter: `drop-shadow(0 0 4px ${dotColor})` }}
        />

        {/* ── Hover crosshair + dot (stays in SVG) ─────────────── */}

        {showTooltip && hoverIndex !== null && hoverPoint && (
          <>
            <line
              x1={hoverX} y1={0} x2={hoverX} y2={height}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <circle cx={hoverX} cy={hoverY} r={3} fill="white" fillOpacity={0.9} />
          </>
        )}

      </svg>

      {/* ── Tooltip — sibling of SVG to escape SVG bounds ──────── */}

      {showTooltip && hoverIndex !== null && hoverPoint && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipLeft}px`,
            top: `${tooltipTop}px`,
            pointerEvents: 'none',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.8)',
            whiteSpace: 'nowrap',
            background: 'rgba(22,22,22,0.9)',
            padding: '2px 6px',
            borderRadius: '3px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontVariantNumeric: 'tabular-nums',
            zIndex: 10,
          }}
        >
          ${hoverPoint.marketValue.toFixed(2)}
          {' '}&middot;{' '}
          <span style={{ color: hoverPoint.pctValue >= 0 ? '#A6F700' : '#B44AFF', fontSize: '9px' }}>
            {hoverPoint.pctValue >= 0 ? '+' : ''}{hoverPoint.pctValue.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ── Default export — responsive width via ParentSize ─────────────────

export default function PortfolioSparkline(props: PortfolioSparklineProps) {
  const h = props.height ?? 80;
  return (
    <ParentSize debounceTime={100}>
      {({ width }: { width: number }) =>
        width > 0 ? (
          <Sparkline
            data={props.data}
            width={width}
            height={h}
            showTooltip={props.showTooltip ?? false}
          />
        ) : null
      }
    </ParentSize>
  );
}
