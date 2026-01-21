'use client';

import { useMemo } from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  /** Color for positive trend */
  positiveColor?: string;
  /** Color for negative trend */
  negativeColor?: string;
  /** Color for neutral/no data */
  neutralColor?: string;
  /** Show gradient fill under the line */
  showFill?: boolean;
  /** Show dot at current (last) value */
  showCurrentDot?: boolean;
}

export default function Sparkline({
  values,
  width = 120,
  height = 32,
  strokeWidth = 1.5,
  className = '',
  positiveColor = '#beffd2',
  negativeColor = '#ff6b6b',
  neutralColor = '#64ffff',
  showFill = true,
  showCurrentDot = true,
}: SparklineProps) {
  const { path, fillPath, trend, normalizedPoints } = useMemo(() => {
    if (!values || values.length < 2) {
      return { path: '', fillPath: '', trend: 'neutral' as const, normalizedPoints: [] };
    }

    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // Avoid division by zero

    // Normalize points to chart coordinates
    const points = values.map((value, index) => {
      const x = padding + (index / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    // Create SVG path
    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');

    // Create fill path (closed polygon)
    const fillPathData = `${pathData} L ${points[points.length - 1].x.toFixed(2)} ${height - padding} L ${padding} ${height - padding} Z`;

    // Determine trend
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const trendDirection = lastValue > firstValue ? 'positive' : lastValue < firstValue ? 'negative' : 'neutral';

    return {
      path: pathData,
      fillPath: fillPathData,
      trend: trendDirection,
      normalizedPoints: points,
    };
  }, [values, width, height]);

  // Get color based on trend
  const lineColor = trend === 'positive' ? positiveColor : trend === 'negative' ? negativeColor : neutralColor;

  // Empty state
  if (!values || values.length < 2) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <svg width={width} height={height} className="opacity-30">
          <line
            x1={4}
            y1={height / 2}
            x2={width - 4}
            y2={height / 2}
            stroke={neutralColor}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </svg>
      </div>
    );
  }

  const lastPoint = normalizedPoints[normalizedPoints.length - 1];

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {/* Gradient definition for fill */}
      <defs>
        <linearGradient id={`sparkline-gradient-${trend}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      {showFill && (
        <path
          d={fillPath}
          fill={`url(#sparkline-gradient-${trend})`}
        />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Current value dot */}
      {showCurrentDot && lastPoint && (
        <>
          {/* Glow effect */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={4}
            fill={lineColor}
            opacity={0.3}
          />
          {/* Main dot */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={2.5}
            fill={lineColor}
          />
        </>
      )}
    </svg>
  );
}
