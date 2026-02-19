'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { AreaClosed, LinePath, Line } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { GridRows } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { chartTheme } from './theme';

interface BackdropChartProps {
  values: number[];
  overlayValues?: number[];
  showOverlay?: boolean;
  costBasisValues?: number[];
  spanDays: number;
  height?: number;
  onHoverValue?: (value: number | null, index: number | null) => void;
}

interface ChartDatum {
  index: number;
  value: number;
}

const MARGIN = { top: 16, right: 44, bottom: 16, left: 0 };

function Chart({
  values,
  overlayValues,
  showOverlay = false,
  costBasisValues,
  spanDays,
  width,
  height,
}: BackdropChartProps & { width: number; height: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<SVGSVGElement>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const data: ChartDatum[] = useMemo(
    () => values.map((value, index) => ({ index, value })),
    [values],
  );

  const overlayData: ChartDatum[] = useMemo(
    () => (overlayValues ?? []).map((value, index) => ({ index, value })),
    [overlayValues],
  );

  const hasCostBasis = costBasisValues != null && costBasisValues.length >= 2;
  const costBasisData: ChartDatum[] = useMemo(
    () => (costBasisValues ?? []).map((value, index) => ({ index, value })),
    [costBasisValues],
  );

  // Shared scale across main + overlay + cost basis
  const allValues = useMemo(() => {
    const combined = [...values];
    if (showOverlay && overlayValues && overlayValues.length >= 2) {
      combined.push(...overlayValues);
    }
    if (hasCostBasis && costBasisValues) {
      combined.push(...costBasisValues);
    }
    return combined;
  }, [values, overlayValues, showOverlay, hasCostBasis, costBasisValues]);

  const yMin = useMemo(() => Math.min(...(allValues.length > 0 ? allValues : [0])), [allValues]);
  const yMax = useMemo(() => Math.max(...(allValues.length > 0 ? allValues : [1])), [allValues]);

  // Add 5% padding to y range for visual breathing room
  const yPad = (yMax - yMin) * 0.05 || 1;

  const xScale = useMemo(
    () => scaleLinear<number>({
      domain: [0, values.length - 1],
      range: [MARGIN.left, MARGIN.left + innerWidth],
    }),
    [values.length, innerWidth],
  );

  const yScale = useMemo(
    () => scaleLinear<number>({
      domain: [yMin - yPad, yMax + yPad],
      range: [MARGIN.top + innerHeight, MARGIN.top],
      nice: true,
    }),
    [yMin, yMax, yPad, innerHeight],
  );

  // Trend color
  const trend = values.length >= 2 && values[values.length - 1] >= values[0] ? 'up' : 'down';
  const mainColor = trend === 'up' ? chartTheme.colors.lime : chartTheme.colors.loss;

  // Accessors
  const getX = (d: ChartDatum) => xScale(d.index);
  const getY = (d: ChartDatum) => yScale(d.value);

  // Hover handling
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (values.length < 2) return;
      const svg = containerRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x - MARGIN.left) / innerWidth;
      const idx = Math.round(pct * (values.length - 1));
      setHoverIndex(Math.max(0, Math.min(values.length - 1, idx)));
    },
    [values.length, innerWidth],
  );

  const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

  // Hover point coordinates
  const hoverX = hoverIndex !== null ? xScale(hoverIndex) : null;
  const hoverY = hoverIndex !== null ? yScale(values[hoverIndex]) : null;
  const hoverValue = hoverIndex !== null ? values[hoverIndex] : null;
  const hoverOverlayY = hoverIndex !== null && showOverlay && overlayValues && overlayValues[hoverIndex] != null
    ? yScale(overlayValues[hoverIndex]) : null;
  const hoverOverlayValue = hoverIndex !== null && showOverlay && overlayValues
    ? overlayValues[hoverIndex] ?? null : null;
  const hoverCostBasisY = hoverIndex !== null && hasCostBasis && costBasisValues && costBasisValues[hoverIndex] != null
    ? yScale(costBasisValues[hoverIndex]) : null;
  const hoverCostBasisValue = hoverIndex !== null && hasCostBasis && costBasisValues
    ? costBasisValues[hoverIndex] ?? null : null;

  // Time labels along bottom — always includes "Now" at right edge
  const timeLabels = useMemo(() => {
    if (spanDays <= 0 || values.length < 2) return [];
    const labels: { x: number; text: string }[] = [];
    const labelCount = Math.min(5, Math.max(2, Math.floor(innerWidth / 80)));
    const totalHours = spanDays * 24;
    const seen = new Set<string>();
    for (let i = 0; i < labelCount; i++) {
      const pct = i / (labelCount - 1);
      const x = MARGIN.left + pct * innerWidth;
      const hoursAgo = (1 - pct) * totalHours;
      let text: string;
      if (hoursAgo < 0.5) text = 'Now';
      else if (hoursAgo < 24) text = `${Math.round(hoursAgo)}h`;
      else if (hoursAgo < 24 * 30) text = `${Math.round(hoursAgo / 24)}d`;
      else text = `${Math.round(hoursAgo / (24 * 30))}mo`;
      if (seen.has(text)) continue;
      seen.add(text);
      labels.push({ x, text });
    }
    // Ensure "Now" is always present at the right edge
    if (!seen.has('Now')) {
      labels.push({ x: MARGIN.left + innerWidth, text: 'Now' });
    }
    return labels;
  }, [spanDays, values.length, innerWidth]);

  // Y-axis labels (right-aligned, faint)
  const yLabels = useMemo(() => {
    const ticks = yScale.ticks(3);
    return ticks.map(tick => ({
      y: yScale(tick),
      text: `$${tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick.toFixed(0)}`,
    }));
  }, [yScale]);

  if (values.length < 2 || width <= 0 || height <= 0) return null;

  return (
    <svg
      ref={containerRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <LinearGradient
          id="backdrop-area-gradient"
          from={mainColor}
          to={mainColor}
          fromOpacity={0.2}
          toOpacity={0}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        />
        {showOverlay && overlayData.length >= 2 && (
          <LinearGradient
            id="backdrop-overlay-gradient"
            from={chartTheme.colors.lime}
            to={chartTheme.colors.lime}
            fromOpacity={0.06}
            toOpacity={0}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          />
        )}
      </defs>

      {/* Grid rows */}
      <GridRows
        scale={yScale}
        width={innerWidth}
        left={MARGIN.left}
        numTicks={3}
        stroke={chartTheme.colors.grid}
        strokeWidth={1}
      />

      {/* Main area fill */}
      <AreaClosed<ChartDatum>
        data={data}
        x={getX}
        y={getY}
        yScale={yScale}
        curve={curveMonotoneX}
        fill="url(#backdrop-area-gradient)"
      />

      {/* Main line */}
      <LinePath<ChartDatum>
        data={data}
        x={getX}
        y={getY}
        curve={curveMonotoneX}
        stroke={mainColor}
        strokeWidth={1.5}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />

      {/* Current value endpoint dot (glowing) */}
      {data.length > 0 && (
        <>
          <circle
            cx={getX(data[data.length - 1])}
            cy={getY(data[data.length - 1])}
            r={6}
            fill={mainColor}
            fillOpacity={0.15}
          />
          <circle
            cx={getX(data[data.length - 1])}
            cy={getY(data[data.length - 1])}
            r={2.5}
            fill={mainColor}
            fillOpacity={0.8}
          />
        </>
      )}

      {/* GUN overlay */}
      {showOverlay && overlayData.length >= 2 && (
        <>
          <AreaClosed<ChartDatum>
            data={overlayData}
            x={getX}
            y={getY}
            yScale={yScale}
            curve={curveMonotoneX}
            fill="url(#backdrop-overlay-gradient)"
          />
          <LinePath<ChartDatum>
            data={overlayData}
            x={getX}
            y={getY}
            curve={curveMonotoneX}
            stroke={chartTheme.colors.lime}
            strokeWidth={1.5}
            strokeOpacity={0.2}
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
        </>
      )}

      {/* Cost basis line */}
      {hasCostBasis && (
        <LinePath<ChartDatum>
          data={costBasisData}
          x={getX}
          y={getY}
          curve={curveMonotoneX}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray="4 3"
        />
      )}

      {/* Y-axis labels (right-aligned) */}
      {yLabels.map((label, i) => (
        <text
          key={i}
          x={width - 4}
          y={label.y}
          textAnchor="end"
          dominantBaseline="middle"
          fill={chartTheme.colors.text}
          fontSize={9}
          fontFamily={chartTheme.fonts.mono}
        >
          {label.text}
        </text>
      ))}

      {/* Time labels along bottom */}
      {timeLabels.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={height - 2}
          textAnchor="middle"
          fill={chartTheme.colors.text}
          fontSize={9}
          fontFamily={chartTheme.fonts.mono}
        >
          {label.text}
        </text>
      ))}

      {/* Hover crosshair */}
      {hoverX !== null && hoverIndex !== null && (
        <>
          <Line
            from={{ x: hoverX, y: MARGIN.top }}
            to={{ x: hoverX, y: MARGIN.top + innerHeight }}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          {/* Main dot */}
          {hoverY !== null && (
            <circle
              cx={hoverX}
              cy={hoverY}
              r={3.5}
              fill="white"
              fillOpacity={0.8}
              stroke={mainColor}
              strokeWidth={1.5}
              strokeOpacity={0.5}
            />
          )}
          {/* Overlay dot */}
          {hoverOverlayY !== null && (
            <circle
              cx={hoverX}
              cy={hoverOverlayY}
              r={2.5}
              fill={chartTheme.colors.lime}
              fillOpacity={0.8}
            />
          )}
          {/* Cost basis dot */}
          {hoverCostBasisY !== null && (
            <circle
              cx={hoverX}
              cy={hoverCostBasisY}
              r={2.5}
              fill="rgba(255,255,255,0.5)"
              fillOpacity={0.8}
            />
          )}
        </>
      )}

      {/* Hover tooltip (rendered as foreignObject for HTML styling) */}
      {hoverIndex !== null && hoverValue !== null && hoverX !== null && hoverY !== null && (
        <foreignObject
          x={0}
          y={0}
          width={width}
          height={height}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${(hoverX / width) * 100}%`,
              // Place tooltip above the point when point is in lower half, below when in upper half
              ...(hoverY > MARGIN.top + innerHeight / 2
                ? { bottom: `${height - hoverY + 10}px` }
                : { top: `${hoverY + 10}px` }),
              transform: `translateX(${-(hoverX / width) * 100}%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontFamily: chartTheme.fonts.mono,
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              ${hoverValue.toFixed(2)}
            </span>
            {hoverCostBasisValue !== null && (
              <span
                style={{
                  fontFamily: chartTheme.fonts.mono,
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.35)',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                Cost ${hoverCostBasisValue.toFixed(2)}
              </span>
            )}
            {showOverlay && hoverOverlayValue !== null && (
              <span
                style={{
                  fontFamily: chartTheme.fonts.mono,
                  fontSize: '10px',
                  color: chartTheme.colors.lime,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                ${hoverOverlayValue.toFixed(2)}
              </span>
            )}
            <span
              style={{
                fontFamily: chartTheme.fonts.mono,
                fontSize: '9px',
                color: 'rgba(255,255,255,0.35)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {(() => {
                const span = spanDays || 7;
                const hoursAgo = (1 - hoverIndex / (values.length - 1)) * span * 24;
                if (hoursAgo < 0.5) return 'Now';
                if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
                if (hoursAgo < 24 * 30) return `${Math.round(hoursAgo / 24)}d ago`;
                return `${Math.round(hoursAgo / (24 * 30))}mo ago`;
              })()}
            </span>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

export default function BackdropChart(props: BackdropChartProps) {
  const h = props.height ?? 120;
  return (
    <ParentSize debounceTime={100}>
      {({ width }: { width: number }) =>
        width > 0 ? <Chart {...props} width={width} height={h} /> : null
      }
    </ParentSize>
  );
}
