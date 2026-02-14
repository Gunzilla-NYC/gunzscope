'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { AreaClosed, LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';

interface MiniSparklineProps {
  values: number[];
  width: number;
  height: number;
  color: string;
  gradientOpacity?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
  onHoverIndex?: (index: number | null) => void;
}

interface Datum {
  index: number;
  value: number;
}

/**
 * Compact visx sparkline for inline use in metric cards.
 * Replaces hand-rolled SVG with proper visx primitives (AreaClosed + LinePath).
 */
export function MiniSparkline({
  values,
  width,
  height,
  color,
  gradientOpacity = 0.25,
  strokeOpacity = 0.7,
  strokeWidth = 1.5,
  onHoverIndex,
}: MiniSparklineProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data: Datum[] = useMemo(
    () => values.map((value, index) => ({ index, value })),
    [values],
  );

  const yMin = useMemo(() => Math.min(...values), [values]);
  const yMax = useMemo(() => Math.max(...values), [values]);
  const yPad = (yMax - yMin) * 0.05 || 1;

  const xScale = useMemo(
    () => scaleLinear<number>({ domain: [0, values.length - 1], range: [0, width] }),
    [values.length, width],
  );

  const yScale = useMemo(
    () => scaleLinear<number>({ domain: [yMin - yPad, yMax + yPad], range: [height, 0] }),
    [yMin, yMax, yPad, height],
  );

  const getX = (d: Datum) => xScale(d.index);
  const getY = (d: Datum) => yScale(d.value);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || values.length < 2) return;
      const rect = svg.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const idx = Math.round(pct * (values.length - 1));
      setHoverIdx(idx);
      onHoverIndex?.(idx);
    },
    [values.length, onHoverIndex],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null);
    onHoverIndex?.(null);
  }, [onHoverIndex]);

  if (values.length < 2 || width <= 0 || height <= 0) return null;

  const gradientId = `mini-sparkline-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'block' }}
    >
      <defs>
        <LinearGradient
          id={gradientId}
          from={color}
          to={color}
          fromOpacity={gradientOpacity}
          toOpacity={0}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        />
      </defs>

      <AreaClosed<Datum>
        data={data}
        x={getX}
        y={getY}
        yScale={yScale}
        curve={curveMonotoneX}
        fill={`url(#${gradientId})`}
      />

      <LinePath<Datum>
        data={data}
        x={getX}
        y={getY}
        curve={curveMonotoneX}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeLinecap="round"
      />

      {hoverIdx !== null && (
        <circle
          cx={xScale(hoverIdx)}
          cy={yScale(values[hoverIdx])}
          r={3}
          fill={color}
          opacity={0.9}
        />
      )}
    </svg>
  );
}
